import { AppsV1Api, CoreV1Api, KubeConfig, V1Deployment, V1Namespace, V1Secret } from "@kubernetes/client-node";
import { PrismaClient, Task } from "@prisma/client";
import { KUBECONFIG } from "./const";
import { decrypt } from "./utils/encryption";
import { toK8sName } from "./utils/k8s";

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
    imagePullSecrets: string[];
    resources: {
        cpuRequest?: number | null;
        cpuLimit?: number | null;
        memoryRequest?: number | null;
        memoryLimit?: number | null;
    };
}

export class TaskService {
    private readonly kc = new KubeConfig();
    private readonly coreApi: CoreV1Api;
    private readonly appsApi: AppsV1Api;

    constructor(private readonly prisma: PrismaClient) {
        this.kc.loadFromString(KUBECONFIG);
        this.coreApi = this.kc.makeApiClient(CoreV1Api);
        this.appsApi = this.kc.makeApiClient(AppsV1Api);
    }

    async listNamespaces(): Promise<string[]> {
        const response = await this.coreApi.listNamespace();
        return response.items.map(ns => ns.metadata?.name ?? '');
    }

    async createNamespace(name: string): Promise<V1Namespace> {
        const k8sName = toK8sName(name, 63);

        // Check if namespace already exists
        const existingNamespaces = await this.listNamespaces();
        if (existingNamespaces.includes(k8sName)) {
            console.log(`Namespace ${k8sName} already exists`);
            return await this.coreApi.readNamespace({ name: k8sName });
        }

        // Create namespace
        const response = await this.coreApi.createNamespace({
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

    async createDockerSecret(namespace: string, secret: DockerSecretData): Promise<V1Secret> {
        const secretName = toK8sName(secret.name);
        const k8sNamespace = toK8sName(namespace, 63);

        // Check if secret already exists
        try {
            const existing = await this.coreApi.readNamespacedSecret({ name: secretName, namespace: k8sNamespace });
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

        const response = await this.coreApi.createNamespacedSecret({
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

    async createDeployment(config: DeploymentConfig): Promise<V1Deployment> {
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
                                resources: Object.keys(resources).length > 0 ? resources : undefined,
                            },
                        ],
                        imagePullSecrets: config.imagePullSecrets.length > 0
                            ? config.imagePullSecrets.map(name => ({ name: toK8sName(name) }))
                            : undefined,
                    },
                },
            },
        };

        // Check if deployment already exists
        try {
            await this.appsApi.readNamespacedDeployment({ name: deploymentName, namespace: k8sNamespace });
            // Deployment exists, update it
            const response = await this.appsApi.replaceNamespacedDeployment({
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
        const response = await this.appsApi.createNamespacedDeployment({
            namespace: k8sNamespace,
            body: deployment,
        });
        console.log(`Deployment ${deploymentName} created in ${k8sNamespace}`);
        return response;
    }

    async run(task: Task): Promise<void> {
        const meta = task.meta as { type: string; image: string; deployId: string };
        console.log(meta);

        // Get service with application and docker secrets
        const service = await this.prisma.service.findUnique({
            where: { id: task.serviceId },
            include: {
                application: true,
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

        const namespace = service.application.namespace;

        // Create namespace for the task's application
        await this.createNamespace(namespace);

        // Create docker secrets
        const imagePullSecrets: string[] = [];
        for (const { dockerSecret } of service.dockerSecrets) {
            await this.createDockerSecret(namespace, {
                name: dockerSecret.name,
                server: dockerSecret.server,
                username: dockerSecret.username,
                password: decrypt(dockerSecret.password),
            });
            imagePullSecrets.push(dockerSecret.name);
        }

        // Create or update deployment
        await this.createDeployment({
            name: service.name,
            namespace,
            image: meta.image,
            replicas: service.replicas,
            imagePullSecrets,
            resources: {
                cpuRequest: service.cpuRequest,
                cpuLimit: service.cpuLimit,
                memoryRequest: service.memoryRequest,
                memoryLimit: service.memoryLimit,
            },
        });
    }
}