// Task meta types
export const TASK_TYPE = {
	DEPLOY_CREATED: 'deploy-created',
	SERVICE_UPDATED: 'service-updated',
} as const;

export type TaskType = (typeof TASK_TYPE)[keyof typeof TASK_TYPE];

// Deploy task meta
export interface DeployTaskMeta {
	type: typeof TASK_TYPE.DEPLOY_CREATED;
	image: string;
	deployId: string;
}

// Service update task meta
export interface ServiceUpdateTaskMeta {
	type: typeof TASK_TYPE.SERVICE_UPDATED;
	image: string;
}

// Union of all task meta types
export type TaskMeta = DeployTaskMeta | ServiceUpdateTaskMeta;

// Helper to create deploy task meta
export function createDeployTaskMeta(image: string, deployId: string): DeployTaskMeta {
	return {
		type: TASK_TYPE.DEPLOY_CREATED,
		image,
		deployId,
	};
}

// Helper to create service update task meta
export function createServiceUpdateTaskMeta(image: string): ServiceUpdateTaskMeta {
	return {
		type: TASK_TYPE.SERVICE_UPDATED,
		image,
	};
}

// Type guard to check if meta is deploy task
export function isDeployTaskMeta(meta: unknown): meta is DeployTaskMeta {
	return (
		typeof meta === 'object' &&
		meta !== null &&
		'type' in meta &&
		(meta as DeployTaskMeta).type === TASK_TYPE.DEPLOY_CREATED
	);
}

// Type guard to check if meta is service update task
export function isServiceUpdateTaskMeta(meta: unknown): meta is ServiceUpdateTaskMeta {
	return (
		typeof meta === 'object' &&
		meta !== null &&
		'type' in meta &&
		(meta as ServiceUpdateTaskMeta).type === TASK_TYPE.SERVICE_UPDATED
	);
}

// Helper to get task type label for UI
export function getTaskTypeLabel(type: string): string {
	switch (type) {
		case TASK_TYPE.DEPLOY_CREATED:
			return 'Deployment';
		case TASK_TYPE.SERVICE_UPDATED:
			return 'Service Update';
		default:
			return type;
	}
}
