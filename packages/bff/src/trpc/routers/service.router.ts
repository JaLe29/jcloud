import { TRPCError } from '@trpc/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { Procedure, Router } from '../router';
import { getPaginationMeta, getPaginationParams, createPaginationInputSchema } from '../../utils/pagination';

const serviceFilterSchema = z
	.object({
		applicationId: z.string().uuid().optional(),
		name: z.string().optional(),
	})
	.optional();

const servicePaginationSchema = createPaginationInputSchema(
	['createdAt', 'updatedAt', 'name', 'replicas'] as const,
	serviceFilterSchema,
);

const createServiceSchema = z.object({
	applicationId: z.string().uuid(),
	name: z.string().min(1).max(100),
	replicas: z.number().int().min(0).max(100).default(1),
	ingressUrl: z.string().url().optional().nullable(),
	cpuRequest: z.number().int().min(0).optional().nullable(),
	cpuLimit: z.number().int().min(0).optional().nullable(),
	memoryRequest: z.number().int().min(0).optional().nullable(),
	memoryLimit: z.number().int().min(0).optional().nullable(),
});

const updateServiceSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1).max(100).optional(),
	replicas: z.number().int().min(0).max(100).optional(),
	ingressUrl: z.string().url().optional().nullable(),
	cpuRequest: z.number().int().min(0).optional().nullable(),
	cpuLimit: z.number().int().min(0).optional().nullable(),
	memoryRequest: z.number().int().min(0).optional().nullable(),
	memoryLimit: z.number().int().min(0).optional().nullable(),
});

export const serviceRouter = (router: Router, procedure: Procedure) => {
	return router({
		list: procedure
			.input(servicePaginationSchema)
			.query(async ({ ctx, input }) => {
				const { page, limit, skip, take } = getPaginationParams(input);

				const sortBy = input?.sortBy || 'createdAt';
				const sortOrder = input?.sortOrder || 'desc';

				const where: Prisma.ServiceWhereInput = {};

				if (input?.filter?.applicationId) {
					where.applicationId = input.filter.applicationId;
				}

				if (input?.filter?.name) {
					where.name = {
						contains: input.filter.name,
						mode: 'insensitive',
					};
				}

				const total = await ctx.prisma.service.count({ where });

				const orderBy: Prisma.ServiceOrderByWithRelationInput = {
					[sortBy]: sortOrder,
				};

				const services = await ctx.prisma.service.findMany({
					where,
					skip,
					take,
					orderBy,
					include: {
						application: {
							select: {
								id: true,
								name: true,
								namespace: true,
							},
						},
					},
				});

				return {
					services,
					pagination: getPaginationMeta(page, limit, total),
				};
			}),

		getById: procedure
			.input(z.object({ id: z.string().uuid() }))
			.query(async ({ ctx, input }) => {
				const service = await ctx.prisma.service.findUnique({
					where: { id: input.id },
					include: {
						application: {
							select: {
								id: true,
								name: true,
								namespace: true,
							},
						},
					},
				});

				if (!service) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'Service not found',
					});
				}

				return service;
			}),

		create: procedure
			.input(createServiceSchema)
			.mutation(async ({ ctx, input }) => {
				const application = await ctx.prisma.application.findUnique({
					where: { id: input.applicationId },
				});

				if (!application) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'Application not found',
					});
				}

				const existing = await ctx.prisma.service.findFirst({
					where: {
						applicationId: input.applicationId,
						name: input.name,
					},
				});

				if (existing) {
					throw new TRPCError({
						code: 'CONFLICT',
						message: 'Service with this name already exists in this application',
					});
				}

				const service = await ctx.prisma.service.create({
					data: {
						name: input.name,
						applicationId: input.applicationId,
						replicas: input.replicas,
						ingressUrl: input.ingressUrl,
						cpuRequest: input.cpuRequest,
						cpuLimit: input.cpuLimit,
						memoryRequest: input.memoryRequest,
						memoryLimit: input.memoryLimit,
					},
				});

				return service;
			}),

		update: procedure
			.input(updateServiceSchema)
			.mutation(async ({ ctx, input }) => {
				const { id, ...data } = input;

				const existing = await ctx.prisma.service.findUnique({
					where: { id },
				});

				if (!existing) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'Service not found',
					});
				}

				if (data.name && data.name !== existing.name) {
					const nameExists = await ctx.prisma.service.findFirst({
						where: {
							applicationId: existing.applicationId,
							name: data.name,
						},
					});

					if (nameExists) {
						throw new TRPCError({
							code: 'CONFLICT',
							message: 'Service with this name already exists in this application',
						});
					}
				}

				const service = await ctx.prisma.service.update({
					where: { id },
					data,
				});

				return service;
			}),

		delete: procedure
			.input(z.object({ id: z.string().uuid() }))
			.mutation(async ({ ctx, input }) => {
				const existing = await ctx.prisma.service.findUnique({
					where: { id: input.id },
				});

				if (!existing) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'Service not found',
					});
				}

				await ctx.prisma.service.delete({
					where: { id: input.id },
				});

				return { success: true };
			}),
	});
};
