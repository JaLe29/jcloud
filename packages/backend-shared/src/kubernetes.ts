import { AppsV1Api, CoreV1Api, KubeConfig, NetworkingV1Api, type V1Pod } from '@kubernetes/client-node';
import type { PrismaClient } from '@prisma/client';
import { decrypt } from './encryption';
import { toK8sName } from './k8s';

export interface KubernetesApiClients {
	coreApi: CoreV1Api;
	appsApi: AppsV1Api;
	networkingApi: NetworkingV1Api;
}

export interface PodInfo {
	name: string;
	namespace: string;
	status: string;
	phase: string;
	ready: boolean;
	restarts: number;
	age: string;
	nodeName?: string;
	image?: string;
	createdAt?: Date;
}

export interface ServiceStatus {
	serviceName: string;
	namespace: string;
	deploymentName: string;
	desiredReplicas: number;
	readyReplicas: number;
	availableReplicas: number;
	pods: PodInfo[];
}

export class KubernetesService {
	constructor(private readonly prisma: PrismaClient) {}

	/**
	 * Load Kubernetes configuration from database and create API clients
	 */
	async loadKubeConfig(clusterId: string): Promise<KubernetesApiClients> {
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

	/**
	 * Get service status including pods information
	 */
	async getServiceStatus(serviceId: string): Promise<ServiceStatus | null> {
		// Get service with application and cluster
		const service = await this.prisma.service.findUnique({
			where: { id: serviceId },
			include: {
				application: {
					include: {
						cluster: true,
					},
				},
			},
		});

		if (!service || !service.application.cluster) {
			return null;
		}

		const { coreApi, appsApi } = await this.loadKubeConfig(service.application.cluster.id);
		const namespace = toK8sName(service.application.namespace, 63);
		const deploymentName = toK8sName(service.name);

		try {
			// Get deployment status
			const deploymentResponse = await appsApi.readNamespacedDeployment({
				name: deploymentName,
				namespace,
			});

			// Kubernetes client returns response directly (V1Deployment)
			const deployment = deploymentResponse as unknown as {
				spec?: { replicas?: number };
				status?: { readyReplicas?: number; availableReplicas?: number };
			};
			const desiredReplicas = deployment.spec?.replicas ?? 0;
			const readyReplicas = deployment.status?.readyReplicas ?? 0;
			const availableReplicas = deployment.status?.availableReplicas ?? 0;

			// Get pods for this deployment - listNamespacedPod takes an object with namespace
			const podsResponse = await coreApi.listNamespacedPod({ namespace });
			// Filter pods by label selector manually if needed
			const allPods = (podsResponse as unknown as { items?: V1Pod[] }).items || [];
			const filteredPods = allPods.filter(pod => {
				const labels = pod.metadata?.labels || {};
				return labels.app === deploymentName;
			});
			const pods: PodInfo[] = filteredPods.map((pod: V1Pod) => {
				const podStatus = pod.status;
				const containerStatuses = podStatus?.containerStatuses || [];
				const ready = containerStatuses.every(cs => cs.ready === true) && containerStatuses.length > 0;
				const restarts = containerStatuses.reduce((sum, cs) => sum + (cs.restartCount || 0), 0);

				// Calculate age
				const createdAt = pod.metadata?.creationTimestamp;
				const age = createdAt ? this.calculateAge(new Date(createdAt)) : 'Unknown';

				return {
					name: pod.metadata?.name || 'Unknown',
					namespace: pod.metadata?.namespace || namespace,
					status: this.getPodStatus(pod),
					phase: podStatus?.phase || 'Unknown',
					ready,
					restarts,
					age,
					nodeName: pod.spec?.nodeName,
					image: pod.spec?.containers?.[0]?.image,
					createdAt: createdAt ? new Date(createdAt) : undefined,
				};
			});

			return {
				serviceName: service.name,
				namespace,
				deploymentName,
				desiredReplicas,
				readyReplicas,
				availableReplicas,
				pods,
			};
		} catch (error) {
			// Deployment or pods might not exist yet
			const errorMessage = error instanceof Error ? error.message : String(error);
			if (errorMessage.includes('404') || errorMessage.includes('not found')) {
				return {
					serviceName: service.name,
					namespace,
					deploymentName,
					desiredReplicas: service.replicas,
					readyReplicas: 0,
					availableReplicas: 0,
					pods: [],
				};
			}
			throw error;
		}
	}

	/**
	 * Get pod status string based on pod conditions
	 */
	private getPodStatus(pod: V1Pod): string {
		const status = pod.status;
		if (!status) {
			return 'Unknown';
		}

		const phase = status.phase;
		const conditions = status.conditions || [];

		// Check for specific conditions
		const readyCondition = conditions.find(c => c.type === 'Ready');
		if (readyCondition?.status === 'True') {
			return 'Running';
		}

		if (phase === 'Pending') {
			return 'Pending';
		}

		if (phase === 'Failed') {
			return 'Failed';
		}

		if (phase === 'Succeeded') {
			return 'Succeeded';
		}

		// Check container statuses
		const containerStatuses = status.containerStatuses || [];
		const waitingContainer = containerStatuses.find(cs => cs.state?.waiting);
		if (waitingContainer) {
			return waitingContainer.state?.waiting?.reason || 'Waiting';
		}

		const terminatedContainer = containerStatuses.find(cs => cs.state?.terminated);
		if (terminatedContainer) {
			return terminatedContainer.state?.terminated?.reason || 'Terminated';
		}

		return phase || 'Unknown';
	}

	/**
	 * Calculate age string from date
	 */
	private calculateAge(date: Date): string {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffSecs = Math.floor(diffMs / 1000);
		const diffMins = Math.floor(diffSecs / 60);
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffDays > 0) {
			return `${diffDays}d`;
		}
		if (diffHours > 0) {
			return `${diffHours}h`;
		}
		if (diffMins > 0) {
			return `${diffMins}m`;
		}
		return `${diffSecs}s`;
	}

	/**
	 * Get logs from a pod
	 */
	async getPodLogs(
		serviceId: string,
		podName: string,
		options?: { container?: string; tailLines?: number; previous?: boolean },
	): Promise<string> {
		// Validate podName first
		if (!podName || typeof podName !== 'string' || podName.trim() === '') {
			throw new Error('Pod name is required and must be a non-empty string');
		}

		// Get service with application and cluster
		const service = await this.prisma.service.findUnique({
			where: { id: serviceId },
			include: {
				application: {
					include: {
						cluster: true,
					},
				},
			},
		});

		if (!service || !service.application.cluster) {
			throw new Error(`Service ${serviceId} not found or cluster not configured`);
		}

		const { coreApi } = await this.loadKubeConfig(service.application.cluster.id);
		const namespace = toK8sName(service.application.namespace, 63);

		try {
			// readNamespacedPodLog - API signature for @kubernetes/client-node 1.4.0
			// Signature: (name, namespace, pretty?, sinceSeconds?, sinceTime?, timestamps?, tailLines?, limitBytes?, insecureSkipTLSVerifyBackend?, follow?, container?)
			// Note: container is the last parameter, follow is before it
			const trimmedPodName = podName.trim();
			
			const logs = await (coreApi as any).readNamespacedPodLog(
				trimmedPodName,
				namespace,
				undefined, // pretty
				undefined, // sinceSeconds
				undefined, // sinceTime
				undefined, // timestamps
				options?.tailLines ?? undefined,
				undefined, // limitBytes
				undefined, // insecureSkipTLSVerifyBackend
				false, // follow
				options?.container ?? undefined,
			);

			// Handle different return types based on API version
			if (typeof logs === 'string') {
				return logs;
			}
			if (logs && typeof logs === 'object' && 'body' in logs) {
				return logs.body || '';
			}
			return '';
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			if (errorMessage.includes('404') || errorMessage.includes('not found')) {
				throw new Error(`Pod ${podName} not found in namespace ${namespace}`);
			}
			throw new Error(`Failed to get pod logs: ${errorMessage}`);
		}
	}
}
