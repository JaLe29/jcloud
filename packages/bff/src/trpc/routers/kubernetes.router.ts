import { KubernetesService } from '@jcloud/backend-shared';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { Procedure, Router } from '../router';

export const kubernetesRouter = (router: Router, procedure: Procedure) => {
	return router({
		getServiceStatus: procedure.input(z.object({ serviceId: z.string().uuid() })).query(async ({ ctx, input }) => {
			const k8sService = new KubernetesService(ctx.prisma);

			try {
				const status = await k8sService.getServiceStatus(input.serviceId);

				if (!status) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'Service not found or cluster not configured',
					});
				}

				return status;
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: `Failed to get service status: ${errorMessage}`,
				});
			}
		}),
	});
};
