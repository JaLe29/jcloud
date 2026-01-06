import { TRPCError } from '@trpc/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { Procedure, Router } from '../router';
import { getPaginationMeta, getPaginationParams, createPaginationInputSchema } from '../../utils/pagination';

const taskFilterSchema = z
	.object({
		serviceId: z.string().uuid().optional(),
		status: z.enum(['WAITING', 'EXECUTING', 'FAILED', 'DONE']).optional(),
	})
	.optional();

const taskPaginationSchema = createPaginationInputSchema(
	['createdAt', 'updatedAt', 'status'] as const,
	taskFilterSchema,
);

export const taskRouter = (router: Router, procedure: Procedure) => {
	return router({
		list: procedure
			.input(taskPaginationSchema)
			.query(async ({ ctx, input }) => {
				const { page, limit, skip, take } = getPaginationParams(input);

				const sortBy = input?.sortBy || 'createdAt';
				const sortOrder = input?.sortOrder || 'desc';

				const where: Prisma.TaskWhereInput = {};

				if (input?.filter?.serviceId) {
					where.serviceId = input.filter.serviceId;
				}

				if (input?.filter?.status) {
					where.status = input.filter.status;
				}

				const total = await ctx.prisma.task.count({ where });

				const orderBy: Prisma.TaskOrderByWithRelationInput = {
					[sortBy]: sortOrder,
				};

				const tasks = await ctx.prisma.task.findMany({
					where,
					skip,
					take,
					orderBy,
					include: {
						service: {
							select: {
								id: true,
								name: true,
								application: {
									select: {
										id: true,
										name: true,
									},
								},
							},
						},
					},
				});

				return {
					tasks,
					pagination: getPaginationMeta(page, limit, total),
				};
			}),

		getById: procedure
			.input(z.object({ id: z.string().uuid() }))
			.query(async ({ ctx, input }) => {
				const task = await ctx.prisma.task.findUnique({
					where: { id: input.id },
					include: {
						service: {
							select: {
								id: true,
								name: true,
								application: {
									select: {
										id: true,
										name: true,
									},
								},
							},
						},
					},
				});

				if (!task) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'Task not found',
					});
				}

				return task;
			}),
	});
};



