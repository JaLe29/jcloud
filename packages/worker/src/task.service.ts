import {
	type DeployTaskMeta,
	decrypt,
	isDeployTaskMeta,
	isServiceUpdateTaskMeta,
	KubernetesService,
	type ServiceUpdateTaskMeta,
	toK8sName,
} from '@jcloud/backend-shared';
import type {
	AppsV1Api,
	CoreV1Api,
	NetworkingV1Api,
	V1Deployment,
	V1Ingress,
	V1Namespace,
	V1Secret,
	V1Service,
} from '@kubernetes/client-node';
import type { PrismaClient, Task } from '@prisma/client';

interface DockerSecretData {
	name: string;
	server: string;
	username: string;
	password: string;
}

interface DeploymentConfig {
	name: string;
	namespace: string;
	image: string;
	replicas: number;
	containerPort: number;
	imagePullSecrets: string[];
	env: Array<{ name: string; value: string }>;
	resources: {
		cpuRequest?: number | null;
		cpuLimit?: number | null;
		memoryRequest?: number | null;
		memoryLimit?: number | null;
	};
	livenessProbe?: {
		path: string;
		initialDelaySeconds?: number | null;
		periodSeconds?: number | null;
		timeoutSeconds?: number | null;
		successThreshold?: number | null;
		failureThreshold?: number | null;
	} | null;
	readinessProbe?: {
		path: string;
		initialDelaySeconds?: number | null;
		periodSeconds?: number | null;
		timeoutSeconds?: number | null;
		successThreshold?: number | null;
		failureThreshold?: number | null;
	} | null;
	maxSurge?: string | null;
	maxUnavailable?: string | null;
}

interface ServiceConfig {
	name: string;
	namespace: string;
	containerPort: number;
}

interface IngressConfig {
	name: string;
	namespace: string;
	host: string;
	serviceName: string;
	servicePort: number;
}

export class TaskService {
	private readonly k8sService: KubernetesService;

	constructor(private readonly prisma: PrismaClient) {
		this.k8sService = new KubernetesService(prisma);
	}

	async listNamespaces(coreApi: CoreV1Api): Promise<string[]> {
		const response = await coreApi.listNamespace();
		return response.items.map((ns: { metadata?: { name?: string } }) => ns.metadata?.name ?? '');
	}

	async createNamespace(coreApi: CoreV1Api, name: string, taskId: string): Promise<V1Namespace> {
		const k8sName = toK8sName(name, 63);

		// Check if namespace already exists
		const existingNamespaces = await this.listNamespaces(coreApi);
		if (existingNamespaces.includes(k8sName)) {
			await this.appendLog(taskId, `Namespace ${k8sName} already exists, skipping creation`);
			return await coreApi.readNamespace({ name: k8sName });
		}

		// Create namespace
		await this.appendLog(taskId, `Creating namespace ${k8sName}...`);
		const response = await coreApi.createNamespace({
			body: {
				metadata: { name: k8sName },
			},
		});
		await this.appendLog(taskId, `✓ Namespace ${k8sName} created successfully`);
		return response;
	}

	async appendLog(taskId: string, message: string): Promise<void> {
		await this.prisma.task.update({
			where: { id: taskId },
			data: {
				log: { push: message },
			},
		});
	}

	async failTask(taskId: string, message: string): Promise<void> {
		await this.prisma.task.update({
			where: { id: taskId },
			data: {
				status: 'FAILED',
				log: { push: message },
				finishedAt: new Date(),
			},
		});
	}

	async createDockerSecret(
		coreApi: CoreV1Api,
		namespace: string,
		secret: DockerSecretData,
		taskId: string,
	): Promise<V1Secret> {
		const secretName = toK8sName(secret.name);
		const k8sNamespace = toK8sName(namespace, 63);

		// Check if secret already exists
		try {
			const existing = await coreApi.readNamespacedSecret({ name: secretName, namespace: k8sNamespace });
			await this.appendLog(
				taskId,
				`Docker secret ${secretName} already exists in ${k8sNamespace}, skipping creation`,
			);
			return existing;
		} catch (err: unknown) {
			// Secret doesn't exist, continue to create it
			const e = err as { code?: number; response?: { statusCode?: number } };
			const statusCode = e.code ?? e.response?.statusCode;
			if (statusCode !== 404) {
				throw err;
			}
		}

		// Create .dockerconfigjson format
		await this.appendLog(taskId, `Creating Docker secret ${secretName} for registry ${secret.server}...`);
		const dockerConfigJson = {
			auths: {
				[secret.server]: {
					username: secret.username,
					password: secret.password,
					auth: Buffer.from(`${secret.username}:${secret.password}`).toString('base64'),
				},
			},
		};

		const response = await coreApi.createNamespacedSecret({
			namespace: k8sNamespace,
			body: {
				metadata: {
					name: secretName,
				},
				type: 'kubernetes.io/dockerconfigjson',
				data: {
					'.dockerconfigjson': Buffer.from(JSON.stringify(dockerConfigJson)).toString('base64'),
				},
			},
		});

		await this.appendLog(taskId, `✓ Docker secret ${secretName} created successfully in ${k8sNamespace}`);
		return response;
	}

	async createDeployment(appsApi: AppsV1Api, config: DeploymentConfig, taskId: string): Promise<V1Deployment> {
		const deploymentName = toK8sName(config.name);
		const k8sNamespace = toK8sName(config.namespace, 63);

		// Build resources
		const resources: { requests?: Record<string, string>; limits?: Record<string, string> } = {};

		if (config.resources.cpuRequest || config.resources.memoryRequest) {
			resources.requests = {};
			if (config.resources.cpuRequest) {
				resources.requests.cpu = `${config.resources.cpuRequest}m`;
			}
			if (config.resources.memoryRequest) {
				resources.requests.memory = `${config.resources.memoryRequest}Mi`;
			}
		}

		if (config.resources.cpuLimit || config.resources.memoryLimit) {
			resources.limits = {};
			if (config.resources.cpuLimit) {
				resources.limits.cpu = `${config.resources.cpuLimit}m`;
			}
			if (config.resources.memoryLimit) {
				resources.limits.memory = `${config.resources.memoryLimit}Mi`;
			}
		}

		// Build liveness probe
		const livenessProbe = config.livenessProbe?.path
			? {
					httpGet: {
						path: config.livenessProbe.path,
						port: config.containerPort,
					},
					initialDelaySeconds: config.livenessProbe.initialDelaySeconds ?? 30,
					periodSeconds: config.livenessProbe.periodSeconds ?? 10,
					timeoutSeconds: config.livenessProbe.timeoutSeconds ?? 5,
					successThreshold: config.livenessProbe.successThreshold ?? 1,
					failureThreshold: config.livenessProbe.failureThreshold ?? 3,
				}
			: undefined;

		// Build readiness probe
		const readinessProbe = config.readinessProbe?.path
			? {
					httpGet: {
						path: config.readinessProbe.path,
						port: config.containerPort,
					},
					initialDelaySeconds: config.readinessProbe.initialDelaySeconds ?? 5,
					periodSeconds: config.readinessProbe.periodSeconds ?? 10,
					timeoutSeconds: config.readinessProbe.timeoutSeconds ?? 5,
					successThreshold: config.readinessProbe.successThreshold ?? 1,
					failureThreshold: config.readinessProbe.failureThreshold ?? 3,
				}
			: undefined;

		// Build rolling update strategy
		const rollingUpdate: { maxSurge?: string; maxUnavailable?: string } = {};
		if (config.maxSurge) {
			rollingUpdate.maxSurge = config.maxSurge;
		}
		if (config.maxUnavailable) {
			rollingUpdate.maxUnavailable = config.maxUnavailable;
		}

		const strategy =
			Object.keys(rollingUpdate).length > 0
				? {
						type: 'RollingUpdate',
						rollingUpdate,
					}
				: undefined;

		const deployment: V1Deployment = {
			metadata: {
				name: deploymentName,
				namespace: k8sNamespace,
			},
			spec: {
				replicas: config.replicas,
				strategy,
				selector: {
					matchLabels: {
						app: deploymentName,
					},
				},
				template: {
					metadata: {
						labels: {
							app: deploymentName,
						},
					},
					spec: {
						containers: [
							{
								name: deploymentName,
								image: config.image,
								ports: [
									{
										containerPort: config.containerPort,
										protocol: 'TCP',
									},
								],
								env: config.env.length > 0 ? config.env : undefined,
								resources: Object.keys(resources).length > 0 ? resources : undefined,
								livenessProbe,
								readinessProbe,
							},
						],
						imagePullSecrets:
							config.imagePullSecrets.length > 0
								? config.imagePullSecrets.map(name => ({ name: toK8sName(name) }))
								: undefined,
					},
				},
			},
		};

		// Check if deployment already exists
		try {
			await appsApi.readNamespacedDeployment({ name: deploymentName, namespace: k8sNamespace });
			// Deployment exists, update it
			await this.appendLog(taskId, `Deployment ${deploymentName} already exists, updating...`);
			await this.appendLog(taskId, `  Image: ${config.image}`);
			await this.appendLog(taskId, `  Replicas: ${config.replicas}`);
			await this.appendLog(taskId, `  Container Port: ${config.containerPort}`);
			if (config.livenessProbe) {
				await this.appendLog(taskId, `  Liveness Probe: ${config.livenessProbe.path}`);
			}
			if (config.readinessProbe) {
				await this.appendLog(taskId, `  Readiness Probe: ${config.readinessProbe.path}`);
			}
			if (config.maxSurge || config.maxUnavailable) {
				await this.appendLog(
					taskId,
					`  Rolling Update: maxSurge=${config.maxSurge || 'default'}, maxUnavailable=${config.maxUnavailable || 'default'}`,
				);
			}
			const response = await appsApi.replaceNamespacedDeployment({
				name: deploymentName,
				namespace: k8sNamespace,
				body: deployment,
			});
			await this.appendLog(taskId, `✓ Deployment ${deploymentName} updated successfully in ${k8sNamespace}`);
			return response;
		} catch (err: unknown) {
			const e = err as { code?: number; response?: { statusCode?: number } };
			const statusCode = e.code ?? e.response?.statusCode;
			if (statusCode !== 404) {
				throw err;
			}
		}

		// Create new deployment
		await this.appendLog(taskId, `Creating deployment ${deploymentName}...`);
		await this.appendLog(taskId, `  Image: ${config.image}`);
		await this.appendLog(taskId, `  Replicas: ${config.replicas}`);
		await this.appendLog(taskId, `  Container Port: ${config.containerPort}`);
		if (config.livenessProbe) {
			await this.appendLog(taskId, `  Liveness Probe: ${config.livenessProbe.path}`);
		}
		if (config.readinessProbe) {
			await this.appendLog(taskId, `  Readiness Probe: ${config.readinessProbe.path}`);
		}
		if (config.maxSurge || config.maxUnavailable) {
			await this.appendLog(
				taskId,
				`  Rolling Update: maxSurge=${config.maxSurge || 'default'}, maxUnavailable=${config.maxUnavailable || 'default'}`,
			);
		}
		if (config.env.length > 0) {
			await this.appendLog(taskId, `  Environment Variables: ${config.env.length}`);
		}
		if (config.imagePullSecrets.length > 0) {
			await this.appendLog(taskId, `  Image Pull Secrets: ${config.imagePullSecrets.length}`);
		}
		const response = await appsApi.createNamespacedDeployment({
			namespace: k8sNamespace,
			body: deployment,
		});
		await this.appendLog(taskId, `✓ Deployment ${deploymentName} created successfully in ${k8sNamespace}`);
		return response;
	}

	async createK8sService(
		coreApi: CoreV1Api,
		config: ServiceConfig,
		deploymentName: string,
		taskId: string,
	): Promise<V1Service> {
		const serviceName = toK8sName(config.name);
		const k8sNamespace = toK8sName(config.namespace, 63);

		const service: V1Service = {
			metadata: {
				name: serviceName,
				namespace: k8sNamespace,
			},
			spec: {
				selector: {
					app: deploymentName, // Use the same label as deployment
				},
				ports: [
					{
						port: config.containerPort,
						targetPort: config.containerPort,
						protocol: 'TCP',
					},
				],
				type: 'ClusterIP',
			},
		};

		// Check if service already exists
		try {
			await coreApi.readNamespacedService({ name: serviceName, namespace: k8sNamespace });
			// Service exists, update it
			await this.appendLog(taskId, `Service ${serviceName} already exists, updating...`);
			const response = await coreApi.replaceNamespacedService({
				name: serviceName,
				namespace: k8sNamespace,
				body: service,
			});
			await this.appendLog(taskId, `✓ Service ${serviceName} updated successfully in ${k8sNamespace}`);
			return response;
		} catch (err: unknown) {
			const e = err as { code?: number; response?: { statusCode?: number } };
			const statusCode = e.code ?? e.response?.statusCode;
			if (statusCode !== 404) {
				throw err;
			}
		}

		// Create new service
		await this.appendLog(taskId, `Creating Kubernetes service ${serviceName} on port ${config.containerPort}...`);
		const response = await coreApi.createNamespacedService({
			namespace: k8sNamespace,
			body: service,
		});
		await this.appendLog(taskId, `✓ Service ${serviceName} created successfully in ${k8sNamespace}`);
		return response;
	}

	async createIngress(networkingApi: NetworkingV1Api, config: IngressConfig, taskId: string): Promise<V1Ingress> {
		const ingressName = toK8sName(config.name);
		const k8sNamespace = toK8sName(config.namespace, 63);
		const serviceName = toK8sName(config.serviceName);

		const ingress: V1Ingress = {
			metadata: {
				name: ingressName,
				namespace: k8sNamespace,
			},
			spec: {
				rules: [
					{
						host: config.host,
						http: {
							paths: [
								{
									path: '/',
									pathType: 'Prefix',
									backend: {
										service: {
											name: serviceName,
											port: {
												number: config.servicePort,
											},
										},
									},
								},
							],
						},
					},
				],
			},
		};

		// Check if ingress already exists
		try {
			await networkingApi.readNamespacedIngress({ name: ingressName, namespace: k8sNamespace });
			// Ingress exists, update it
			await this.appendLog(taskId, `Ingress ${ingressName} already exists, updating...`);
			await this.appendLog(taskId, `  Host: ${config.host}`);
			const response = await networkingApi.replaceNamespacedIngress({
				name: ingressName,
				namespace: k8sNamespace,
				body: ingress,
			});
			await this.appendLog(taskId, `✓ Ingress ${ingressName} updated successfully in ${k8sNamespace}`);
			return response;
		} catch (err: unknown) {
			const e = err as { code?: number; response?: { statusCode?: number } };
			const statusCode = e.code ?? e.response?.statusCode;
			if (statusCode !== 404) {
				throw err;
			}
		}

		// Create new ingress
		await this.appendLog(taskId, `Creating ingress ${ingressName} for host ${config.host}...`);
		const response = await networkingApi.createNamespacedIngress({
			namespace: k8sNamespace,
			body: ingress,
		});
		await this.appendLog(taskId, `✓ Ingress ${ingressName} created successfully in ${k8sNamespace}`);
		return response;
	}

	async deleteIngress(
		networkingApi: NetworkingV1Api,
		name: string,
		namespace: string,
		taskId: string,
	): Promise<void> {
		const ingressName = toK8sName(name);
		const k8sNamespace = toK8sName(namespace, 63);

		try {
			await this.appendLog(taskId, `Deleting ingress ${ingressName} from ${k8sNamespace}...`);
			await networkingApi.deleteNamespacedIngress({
				name: ingressName,
				namespace: k8sNamespace,
			});
			await this.appendLog(taskId, `✓ Ingress ${ingressName} deleted successfully from ${k8sNamespace}`);
		} catch (err: unknown) {
			const e = err as { code?: number; response?: { statusCode?: number } };
			const statusCode = e.code ?? e.response?.statusCode;
			if (statusCode === 404) {
				await this.appendLog(
					taskId,
					`Ingress ${ingressName} does not exist in ${k8sNamespace}, skipping deletion`,
				);
			} else {
				throw err;
			}
		}
	}

	async run(task: Task): Promise<void> {
		// Mark task as executing
		await this.prisma.task.update({
			where: { id: task.id },
			data: {
				status: 'EXECUTING',
				startedAt: new Date(),
			},
		});

		try {
			await this.appendLog(task.id, `Starting deployment task ${task.id}`);

			let image: string;

			if (isDeployTaskMeta(task.meta)) {
				const deployMeta: DeployTaskMeta = task.meta;
				image = deployMeta.image;
				await this.appendLog(task.id, 'Task type: Deploy');
				await this.appendLog(task.id, `Image: ${image}`);
			} else if (isServiceUpdateTaskMeta(task.meta)) {
				const updateMeta: ServiceUpdateTaskMeta = task.meta;
				image = updateMeta.image;
				await this.appendLog(task.id, 'Task type: Service Update');
				await this.appendLog(task.id, `Image: ${image}`);
			} else {
				await this.failTask(task.id, `Unknown task meta type for task ${task.id}`);
				return;
			}

			// Get service with application (including cluster), docker secrets, and env variables
			await this.appendLog(task.id, 'Loading service configuration...');
			const service = await this.prisma.service.findUnique({
				where: { id: task.serviceId },
				include: {
					application: {
						include: {
							cluster: true,
						},
					},
					dockerSecrets: {
						include: {
							dockerSecret: true,
						},
					},
					envs: {
						include: {
							env: true,
						},
					},
				},
			});

			if (!service) {
				await this.failTask(task.id, `Service not found for task ${task.id}`);
				return;
			}

			await this.appendLog(task.id, `Service: ${service.name}`);
			await this.appendLog(task.id, `Application: ${service.application.name}`);
			await this.appendLog(task.id, `Namespace: ${service.application.namespace}`);

			if (!service.application.cluster) {
				await this.failTask(task.id, `Cluster not found for application ${service.application.id}`);
				return;
			}

			await this.appendLog(task.id, `Cluster: ${service.application.cluster.name}`);

			// Load kubeconfig from database for the cluster
			await this.appendLog(task.id, 'Loading Kubernetes configuration...');
			const { coreApi, appsApi, networkingApi } = await this.k8sService.loadKubeConfig(
				service.application.cluster.id,
			);
			await this.appendLog(task.id, '✓ Kubernetes configuration loaded');

			const namespace = service.application.namespace;

			// Create namespace for the task's application
			await this.createNamespace(coreApi, namespace, task.id);

			// Create docker secrets
			const imagePullSecrets: string[] = [];
			if (service.dockerSecrets.length > 0) {
				await this.appendLog(task.id, `Processing ${service.dockerSecrets.length} Docker secret(s)...`);
				for (const { dockerSecret } of service.dockerSecrets) {
					await this.createDockerSecret(
						coreApi,
						namespace,
						{
							name: dockerSecret.name,
							server: dockerSecret.server,
							username: dockerSecret.username,
							password: decrypt(dockerSecret.password),
						},
						task.id,
					);
					imagePullSecrets.push(dockerSecret.name);
				}
			} else {
				await this.appendLog(task.id, 'No Docker secrets configured');
			}

			// Load and decrypt environment variables
			await this.appendLog(task.id, `Processing ${service.envs.length} environment variable(s)...`);
			const envVars: Array<{ name: string; value: string }> = [];
			for (const { env } of service.envs) {
				try {
					const decryptedValue = decrypt(env.value);
					envVars.push({
						name: env.key,
						value: decryptedValue,
					});
					await this.appendLog(task.id, `  ✓ ${env.key}`);
				} catch (error) {
					await this.appendLog(
						task.id,
						`  ✗ Warning: Failed to decrypt env variable ${env.key}: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			}

			// Create or update deployment
			await this.appendLog(task.id, 'Creating/updating deployment...');
			const deploymentName = toK8sName(service.name);
			await this.createDeployment(
				appsApi,
				{
					name: service.name,
					namespace,
					image,
					replicas: service.replicas,
					containerPort: service.containerPort,
					imagePullSecrets,
					env: envVars,
					resources: {
						cpuRequest: service.cpuRequest,
						cpuLimit: service.cpuLimit,
						memoryRequest: service.memoryRequest,
						memoryLimit: service.memoryLimit,
					},
					livenessProbe: service.livenessProbePath
						? {
								path: service.livenessProbePath,
								initialDelaySeconds: service.livenessProbeInitialDelaySeconds,
								periodSeconds: service.livenessProbePeriodSeconds,
								timeoutSeconds: service.livenessProbeTimeoutSeconds,
								successThreshold: service.livenessProbeSuccessThreshold,
								failureThreshold: service.livenessProbeFailureThreshold,
							}
						: null,
					readinessProbe: service.readinessProbePath
						? {
								path: service.readinessProbePath,
								initialDelaySeconds: service.readinessProbeInitialDelaySeconds,
								periodSeconds: service.readinessProbePeriodSeconds,
								timeoutSeconds: service.readinessProbeTimeoutSeconds,
								successThreshold: service.readinessProbeSuccessThreshold,
								failureThreshold: service.readinessProbeFailureThreshold,
							}
						: null,
					maxSurge: service.maxSurge,
					maxUnavailable: service.maxUnavailable,
				},
				task.id,
			);

			// Create Kubernetes Service (using the same deployment name for selector)
			await this.appendLog(task.id, 'Creating Kubernetes service...');
			await this.createK8sService(
				coreApi,
				{
					name: service.name,
					namespace,
					containerPort: service.containerPort,
				},
				deploymentName,
				task.id,
			);

			// Create or delete Ingress based on ingressUrl
			if (service.ingressUrl) {
				try {
					await this.appendLog(task.id, 'Creating/updating ingress...');
					const url = new URL(service.ingressUrl);
					const k8sServiceName = toK8sName(service.name);
					await this.createIngress(
						networkingApi,
						{
							name: service.name,
							namespace,
							host: url.hostname,
							serviceName: k8sServiceName,
							servicePort: service.containerPort,
						},
						task.id,
					);
				} catch (_err) {
					await this.appendLog(
						task.id,
						`✗ Warning: Failed to create ingress - invalid URL: ${service.ingressUrl}`,
					);
				}
			} else {
				// Delete ingress if it exists (ingressUrl was removed)
				await this.appendLog(task.id, 'No ingress URL configured, checking for existing ingress to delete...');
				try {
					await this.deleteIngress(networkingApi, service.name, namespace, task.id);
				} catch (err) {
					// Log warning but don't fail the task if ingress deletion fails
					const errorMessage = err instanceof Error ? err.message : String(err);
					await this.appendLog(
						task.id,
						`✗ Warning: Failed to delete ingress: ${errorMessage}`,
					);
				}
			}

			// Mark task as done
			await this.appendLog(task.id, '✓ Deployment completed successfully');
			await this.prisma.task.update({
				where: { id: task.id },
				data: {
					status: 'DONE',
					finishedAt: new Date(),
				},
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			const errorStack = error instanceof Error ? error.stack : undefined;
			await this.appendLog(task.id, `✗ Deployment failed: ${errorMessage}`);
			if (errorStack) {
				await this.appendLog(task.id, `Stack trace: ${errorStack}`);
			}
			await this.failTask(task.id, `Deployment failed: ${errorMessage}`);
			throw error;
		}
	}
}
