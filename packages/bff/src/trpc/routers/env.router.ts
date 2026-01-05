import { TRPCError } from '@trpc/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { Procedure, Router } from '../router';
import { getPaginationMeta, getPaginationParams, createPaginationInputSchema } from '../../utils/pagination';
import { encrypt, decrypt } from '../../utils/encryption';

const envFilterSchema = z
	.object({
		key: z.string().optional(),
		serviceId: z.string().uuid().optional(),
		applicationId: z.string().uuid().optional(),
	})
	.optional();

const envPaginationSchema = createPaginationInputSchema(
	['createdAt', 'updatedAt', 'key'] as const,
	envFilterSchema,
);

const createEnvSchema = z.object({
	key: z.string().min(1).max(100),
	value: z.string().min(1),
	serviceIds: z.array(z.string().uuid()).optional(),
});

const updateEnvSchema = z.object({
	id: z.string().uuid(),
	key: z.string().min(1).max(100).optional(),
	value: z.string().min(1).optional(),
	serviceIds: z.array(z.string().uuid()).optional(),
});

export const envRouter = (router: Router, procedure: Procedure) => {
	return router({
		list: procedure
			.input(envPaginationSchema)
			.query(async ({ ctx, input }) => {
				const { page, limit, skip, take } = getPaginationParams(input);

				const sortBy = input?.sortBy || 'key';
				const sortOrder = input?.sortOrder || 'asc';

				const where: Prisma.EnvWhereInput = {};

				if (input?.filter?.key) {
					where.key = {
						contains: input.filter.key,
						mode: 'insensitive',
					};
				}

				// Filter by serviceId - envs that are assigned to this service
				if (input?.filter?.serviceId) {
					where.services = {
						some: {
							serviceId: input.filter.serviceId,
						},
					};
				}

				// Filter by applicationId - envs that are assigned to any service of this application
				if (input?.filter?.applicationId) {
					where.services = {
						some: {
							service: {
								applicationId: input.filter.applicationId,
							},
						},
					};
				}

				const total = await ctx.prisma.env.count({ where });

				const orderBy: Prisma.EnvOrderByWithRelationInput = {
					[sortBy]: sortOrder,
				};

				const envs = await ctx.prisma.env.findMany({
					where,
					skip,
					take,
					orderBy,
					include: {
						services: {
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
						},
					},
				});

				// Don't decrypt values in list view, just mask them
				const envsWithMaskedValues = envs.map((env) => ({
					...env,
					value: '••••••••',
					services: env.services.map((s) => s.service),
				}));

				return {
					envs: envsWithMaskedValues,
					pagination: getPaginationMeta(page, limit, total),
				};
			}),

		getById: procedure
			.input(z.object({ id: z.string().uuid() }))
			.query(async ({ ctx, input }) => {
				const env = await ctx.prisma.env.findUnique({
					where: { id: input.id },
					include: {
						services: {
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
						},
					},
				});

				if (!env) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'Environment variable not found',
					});
				}

				try {
					return {
						...env,
						value: decrypt(env.value),
						services: env.services.map((s) => s.service),
					};
				} catch (error) {
					throw new TRPCError({
						code: 'INTERNAL_SERVER_ERROR',
						message: error instanceof Error ? error.message : 'Failed to decrypt environment variable value',
						cause: error,
					});
				}
			}),

		getByServiceId: procedure
			.input(z.object({ serviceId: z.string().uuid() }))
			.query(async ({ ctx, input }) => {
				const serviceEnvs = await ctx.prisma.serviceEnv.findMany({
					where: { serviceId: input.serviceId },
					include: {
						env: true,
					},
				});

				return serviceEnvs.map((se) => ({
					...se.env,
					value: '••••••••', // Masked
				}));
			}),

		create: procedure
			.input(createEnvSchema)
			.mutation(async ({ ctx, input }) => {
				const encryptedValue = encrypt(input.value);

				const env = await ctx.prisma.env.create({
					data: {
						key: input.key,
						value: encryptedValue,
						services: input.serviceIds?.length
							? {
									create: input.serviceIds.map((serviceId) => ({
										serviceId,
									})),
								}
							: undefined,
					},
				});

				return env;
			}),

		update: procedure
			.input(updateEnvSchema)
			.mutation(async ({ ctx, input }) => {
				const { id, serviceIds, ...data } = input;

				const existing = await ctx.prisma.env.findUnique({
					where: { id },
				});

				if (!existing) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'Environment variable not found',
					});
				}

				// Encrypt value if provided
				const updateData: Prisma.EnvUpdateInput = {
					...(data.key && { key: data.key }),
					...(data.value && { value: encrypt(data.value) }),
				};

				// Update service assignments if provided
				if (serviceIds !== undefined) {
					// Delete existing assignments
					await ctx.prisma.serviceEnv.deleteMany({
						where: { envId: id },
					});

					// Create new assignments
					if (serviceIds.length > 0) {
						await ctx.prisma.serviceEnv.createMany({
							data: serviceIds.map((serviceId) => ({
								envId: id,
								serviceId,
							})),
						});
					}
				}

				const env = await ctx.prisma.env.update({
					where: { id },
					data: updateData,
				});

				return env;
			}),

		delete: procedure
			.input(z.object({ id: z.string().uuid() }))
			.mutation(async ({ ctx, input }) => {
				const existing = await ctx.prisma.env.findUnique({
					where: { id: input.id },
				});

				if (!existing) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'Environment variable not found',
					});
				}

				await ctx.prisma.env.delete({
					where: { id: input.id },
				});

				return { success: true };
			}),
	});
};
