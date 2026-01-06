// Task meta types
export const TASK_TYPE = {
	DEPLOY_CREATED: 'deploy-created',
} as const;

export type TaskType = (typeof TASK_TYPE)[keyof typeof TASK_TYPE];

// Deploy task meta
export interface DeployTaskMeta {
	type: typeof TASK_TYPE.DEPLOY_CREATED;
	image: string;
	deployId: string;
}

// Union of all task meta types
export type TaskMeta = DeployTaskMeta;

// Helper to create deploy task meta
export function createDeployTaskMeta(image: string, deployId: string): DeployTaskMeta {
	return {
		type: TASK_TYPE.DEPLOY_CREATED,
		image,
		deployId,
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

// Helper to get task type label for UI
export function getTaskTypeLabel(type: string): string {
	switch (type) {
		case TASK_TYPE.DEPLOY_CREATED:
			return 'Deployment';
		default:
			return type;
	}
}

