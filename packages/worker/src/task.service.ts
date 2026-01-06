import { type DeployTaskMeta, decrypt, isDeployTaskMeta } from '@jcloud/backend-shared';
import {
	AppsV1Api,
	CoreV1Api,
	KubeConfig,
	NetworkingV1Api,
	type V1Deployment,
	type V1Ingress,
	type V1Namespace,
	type V1Secret,
	type V1Service,
} from '@kubernetes/client-node';
import type { PrismaClient, Task } from '@prisma/client';
import { toK8sName } from './utils/k8s';

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
	resources: {
		cpuRequest?: number | null;
		cpuLimit?: number | null;
		memoryRequest?: number | null;
		memoryLimit?: number | null;
	};
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
	constructor(private readonly prisma: PrismaClient) {}

	private async loadKubeConfig(
		clusterId: string,
	): Promise<{ coreApi: CoreV1Api; appsApi: AppsV1Api; networkingApi: NetworkingV1Api }> {
		// Load cluster from database
		const cluster = await this.prisma.cluster.findUnique({
			where: { id: clusterId },
		});

		if (!cluster) {
			throw new Error(`Cluster ${clusterId} not found`);
		}

		// Decrypt kubeconfig
		const kubeconfig = decrypt(cluster.kubeconfig);

		// Load kubeconfig
		const kc = new KubeConfig();
		kc.loadFromString(kubeconfig);

		// Create API clients
		const coreApi = kc.makeApiClient(CoreV1Api);
		const appsApi = kc.makeApiClient(AppsV1Api);
		const networkingApi = kc.makeApiClient(NetworkingV1Api);

		return { coreApi, appsApi, networkingApi };
	}

	async listNamespaces(coreApi: CoreV1Api): Promise<string[]> {
		const response = await coreApi.listNamespace();
		return response.items.map((ns: { metadata?: { name?: string } }) => ns.metadata?.name ?? '');
	}

	async createNamespace(coreApi: CoreV1Api, name: string): Promise<V1Namespace> {
		const k8sName = toK8sName(name, 63);

		// Check if namespace already exists
		const existingNamespaces = await this.listNamespaces(coreApi);
		if (existingNamespaces.includes(k8sName)) {
			console.log(`Namespace ${k8sName} already exists`);
			return await coreApi.readNamespace({ name: k8sName });
		}

		// Create namespace
		const response = await coreApi.createNamespace({
			body: {
				metadata: { name: k8sName },
			},
		});
		console.log(`Namespace ${k8sName} created`);
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

	async createDockerSecret(coreApi: CoreV1Api, namespace: string, secret: DockerSecretData): Promise<V1Secret> {
		const secretName = toK8sName(secret.name);
		const k8sNamespace = toK8sName(namespace, 63);

		// Check if secret already exists
		try {
			const existing = await coreApi.readNamespacedSecret({ name: secretName, namespace: k8sNamespace });
			console.log(`Docker secret ${secretName} already exists in ${k8sNamespace}`);
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

		console.log(`Docker secret ${secretName} created in ${k8sNamespace}`);
		return response;
	}

	async createDeployment(appsApi: AppsV1Api, config: DeploymentConfig): Promise<V1Deployment> {
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

		const deployment: V1Deployment = {
			metadata: {
				name: deploymentName,
				namespace: k8sNamespace,
			},
			spec: {
				replicas: config.replicas,
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
								resources: Object.keys(resources).length > 0 ? resources : undefined,
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
			const response = await appsApi.replaceNamespacedDeployment({
				name: deploymentName,
				namespace: k8sNamespace,
				body: deployment,
			});
			console.log(`Deployment ${deploymentName} updated in ${k8sNamespace}`);
			return response;
		} catch (err: unknown) {
			const e = err as { code?: number; response?: { statusCode?: number } };
			const statusCode = e.code ?? e.response?.statusCode;
			if (statusCode !== 404) {
				throw err;
			}
		}

		// Create new deployment
		const response = await appsApi.createNamespacedDeployment({
			namespace: k8sNamespace,
			body: deployment,
		});
		console.log(`Deployment ${deploymentName} created in ${k8sNamespace}`);
		return response;
	}

	async createK8sService(coreApi: CoreV1Api, config: ServiceConfig): Promise<V1Service> {
		const serviceName = toK8sName(config.name);
		const k8sNamespace = toK8sName(config.namespace, 63);

		const service: V1Service = {
			metadata: {
				name: serviceName,
				namespace: k8sNamespace,
			},
			spec: {
				selector: {
					app: serviceName,
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
			const response = await coreApi.replaceNamespacedService({
				name: serviceName,
				namespace: k8sNamespace,
				body: service,
			});
			console.log(`Service ${serviceName} updated in ${k8sNamespace}`);
			return response;
		} catch (err: unknown) {
			const e = err as { code?: number; response?: { statusCode?: number } };
			const statusCode = e.code ?? e.response?.statusCode;
			if (statusCode !== 404) {
				throw err;
			}
		}

		// Create new service
		const response = await coreApi.createNamespacedService({
			namespace: k8sNamespace,
			body: service,
		});
		console.log(`Service ${serviceName} created in ${k8sNamespace}`);
		return response;
	}

	async createIngress(networkingApi: NetworkingV1Api, config: IngressConfig): Promise<V1Ingress> {
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
			const response = await networkingApi.replaceNamespacedIngress({
				name: ingressName,
				namespace: k8sNamespace,
				body: ingress,
			});
			console.log(`Ingress ${ingressName} updated in ${k8sNamespace}`);
			return response;
		} catch (err: unknown) {
			const e = err as { code?: number; response?: { statusCode?: number } };
			const statusCode = e.code ?? e.response?.statusCode;
			if (statusCode !== 404) {
				throw err;
			}
		}

		// Create new ingress
		const response = await networkingApi.createNamespacedIngress({
			namespace: k8sNamespace,
			body: ingress,
		});
		console.log(`Ingress ${ingressName} created in ${k8sNamespace}`);
		return response;
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
			if (!isDeployTaskMeta(task.meta)) {
				await this.failTask(task.id, `Unknown task meta type for task ${task.id}`);
				return;
			}
			const meta: DeployTaskMeta = task.meta;
			console.log(meta);

			// Get service with application (including cluster) and docker secrets
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
				},
			});

			if (!service) {
				await this.failTask(task.id, `Service not found for task ${task.id}`);
				return;
			}

			if (!service.application.cluster) {
				await this.failTask(task.id, `Cluster not found for application ${service.application.id}`);
				return;
			}

			// Load kubeconfig from database for the cluster
			const { coreApi, appsApi, networkingApi } = await this.loadKubeConfig(service.application.cluster.id);

			const namespace = service.application.namespace;

			// Create namespace for the task's application
			await this.createNamespace(coreApi, namespace);

			// Create docker secrets
			const imagePullSecrets: string[] = [];
			for (const { dockerSecret } of service.dockerSecrets) {
				await this.createDockerSecret(coreApi, namespace, {
					name: dockerSecret.name,
					server: dockerSecret.server,
					username: dockerSecret.username,
					password: decrypt(dockerSecret.password),
				});
				imagePullSecrets.push(dockerSecret.name);
			}

			// Create or update deployment
			await this.createDeployment(appsApi, {
				name: service.name,
				namespace,
				image: meta.image,
				replicas: service.replicas,
				containerPort: service.containerPort,
				imagePullSecrets,
				resources: {
					cpuRequest: service.cpuRequest,
					cpuLimit: service.cpuLimit,
					memoryRequest: service.memoryRequest,
					memoryLimit: service.memoryLimit,
				},
			});

			// Create Kubernetes Service
			await this.createK8sService(coreApi, {
				name: service.name,
				namespace,
				containerPort: service.containerPort,
			});

			// Create Ingress if ingressUrl is defined
			if (service.ingressUrl) {
				try {
					const url = new URL(service.ingressUrl);
					await this.createIngress(networkingApi, {
						name: service.name,
						namespace,
						host: url.hostname,
						serviceName: service.name,
						servicePort: service.containerPort,
					});
				} catch (err) {
					await this.appendLog(
						task.id,
						`Warning: Failed to create ingress - invalid URL: ${service.ingressUrl}`,
					);
					console.error(`Failed to create ingress for service ${service.name}:`, err);
				}
			}

			// Mark task as done
			await this.prisma.task.update({
				where: { id: task.id },
				data: {
					status: 'DONE',
					finishedAt: new Date(),
				},
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			await this.failTask(task.id, `Deployment failed: ${errorMessage}`);
			throw error;
		}
	}
}
