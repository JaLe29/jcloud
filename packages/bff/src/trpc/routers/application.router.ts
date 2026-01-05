import { TRPCError } from '@trpc/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { Procedure, Router } from '../router';
import { getPaginationMeta, getPaginationParams, createPaginationInputSchema } from '../../utils/pagination';

const applicationFilterSchema = z
	.object({
		name: z.string().optional(),
		namespace: z.string().optional(),
	})
	.optional();

const applicationPaginationSchema = createPaginationInputSchema(
	['createdAt', 'updatedAt', 'name', 'namespace', 'servicesCount'] as const,
	applicationFilterSchema,
);

const createApplicationSchema = z.object({
	name: z.string().min(1).max(100),
	namespace: z.string().min(1).max(100),
});

const updateApplicationSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1).max(100).optional(),
});

export const applicationRouter = (router: Router, procedure: Procedure) => {
	return router({
		list: procedure
			.input(applicationPaginationSchema)
			.query(async ({ ctx, input }) => {
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

		getById: procedure
			.input(z.object({ id: z.string().uuid() }))
			.query(async ({ ctx, input }) => {
				const application = await ctx.prisma.application.findUnique({
					where: { id: input.id },
					include: {
						services: {
							orderBy: { createdAt: 'desc' },
							include: {
								envs: {
									select: { id: true },
								},
								apiKey: {
									include: {
										usages: {
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

		create: procedure
			.input(createApplicationSchema)
			.mutation(async ({ ctx, input }) => {
				const existing = await ctx.prisma.application.findUnique({
					where: { name: input.name },
				});

				if (existing) {
					throw new TRPCError({
						code: 'CONFLICT',
						message: 'Application with this name already exists',
					});
				}

				const application = await ctx.prisma.application.create({
					data: {
						name: input.name,
						namespace: input.namespace,
					},
				});

				return application;
			}),

		update: procedure
			.input(updateApplicationSchema)
			.mutation(async ({ ctx, input }) => {
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

		delete: procedure
			.input(z.object({ id: z.string().uuid() }))
			.mutation(async ({ ctx, input }) => {
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
