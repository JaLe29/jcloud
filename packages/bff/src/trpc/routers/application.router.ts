import type { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createPaginationInputSchema, getPaginationMeta, getPaginationParams } from '../../utils/pagination';
import type { Procedure, Router } from '../router';

const applicationFilterSchema = z
	.object({
		name: z.string().optional(),
		namespace: z.string().optional(),
		clusterId: z.string().uuid().optional(),
	})
	.optional();

const applicationPaginationSchema = createPaginationInputSchema(
	['createdAt', 'updatedAt', 'name', 'namespace', 'servicesCount'] as const,
	applicationFilterSchema,
);

const createApplicationSchema = z.object({
	name: z.string().min(1).max(100),
	namespace: z.string().min(1).max(100),
	clusterId: z.string().uuid(),
});

const updateApplicationSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1).max(100).optional(),
});

export const applicationRouter = (router: Router, procedure: Procedure) => {
	return router({
		list: procedure.input(applicationPaginationSchema).query(async ({ ctx, input }) => {
			const { page, limit, skip, take } = getPaginationParams(input);

			const sortBy = input?.sortBy || 'createdAt';
			const sortOrder = input?.sortOrder || 'desc';

			const where: Prisma.ApplicationWhereInput = {};

			if (input?.filter?.name) {
				where.name = {
					contains: input.filter.name,
					mode: 'insensitive',
				};
			}

			if (input?.filter?.namespace) {
				where.namespace = {
					contains: input.filter.namespace,
					mode: 'insensitive',
				};
			}

			if (input?.filter?.clusterId) {
				where.clusterId = input.filter.clusterId;
			}

			const total = await ctx.prisma.application.count({ where });

			let orderBy: Prisma.ApplicationOrderByWithRelationInput = {};
			if (sortBy === 'servicesCount') {
				orderBy = {
					services: {
						_count: sortOrder,
					},
				};
			} else {
				orderBy = {
					[sortBy]: sortOrder,
				};
			}

			const applications = await ctx.prisma.application.findMany({
				where,
				skip,
				take,
				orderBy,
				include: {
					cluster: {
						select: {
							id: true,
							name: true,
						},
					},
					services: {
						select: {
							id: true,
							name: true,
						},
						orderBy: { name: 'asc' },
					},
					_count: {
						select: {
							services: true,
						},
					},
				},
			});

			return {
				applications,
				pagination: getPaginationMeta(page, limit, total),
			};
		}),

		getById: procedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
			const application = await ctx.prisma.application.findUnique({
				where: { id: input.id },
				include: {
					cluster: {
						select: {
							id: true,
							name: true,
						},
					},
					services: {
						orderBy: { createdAt: 'desc' },
						include: {
							envs: {
								select: { id: true },
							},
							apiKey: {
								include: {
									deploys: {
										orderBy: { createdAt: 'desc' },
										take: 1,
									},
								},
							},
						},
					},
					_count: {
						select: {
							services: true,
						},
					},
				},
			});

			if (!application) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Application not found',
				});
			}

			return application;
		}),

		create: procedure.input(createApplicationSchema).mutation(async ({ ctx, input }) => {
			const existing = await ctx.prisma.application.findUnique({
				where: { name: input.name },
			});

			if (existing) {
				throw new TRPCError({
					code: 'CONFLICT',
					message: 'Application with this name already exists',
				});
			}

			// Verify cluster exists
			const cluster = await ctx.prisma.cluster.findUnique({
				where: { id: input.clusterId },
			});

			if (!cluster) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Cluster not found',
				});
			}

			const application = await ctx.prisma.application.create({
				data: {
					name: input.name,
					namespace: input.namespace,
					clusterId: input.clusterId,
				},
			});

			return application;
		}),

		update: procedure.input(updateApplicationSchema).mutation(async ({ ctx, input }) => {
			const { id, ...data } = input;

			const existing = await ctx.prisma.application.findUnique({
				where: { id },
			});

			if (!existing) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Application not found',
				});
			}

			if (data.name && data.name !== existing.name) {
				const nameExists = await ctx.prisma.application.findUnique({
					where: { name: data.name },
				});

				if (nameExists) {
					throw new TRPCError({
						code: 'CONFLICT',
						message: 'Application with this name already exists',
					});
				}
			}

			const application = await ctx.prisma.application.update({
				where: { id },
				data,
			});

			return application;
		}),

		delete: procedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
			const existing = await ctx.prisma.application.findUnique({
				where: { id: input.id },
			});

			if (!existing) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Application not found',
				});
			}

			await ctx.prisma.application.delete({
				where: { id: input.id },
			});

			return { success: true };
		}),
	});
};
