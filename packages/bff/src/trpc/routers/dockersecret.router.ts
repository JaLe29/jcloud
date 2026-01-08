import { decrypt, encrypt } from '@jcloud/backend-shared';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { Procedure, Router } from '../router';

const createDockerSecretSchema = z.object({
	name: z.string().min(1).max(100),
	server: z.string().min(1).max(255),
	username: z.string().min(1).max(255),
	password: z.string().min(1),
});

const updateDockerSecretSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1).max(100).optional(),
	server: z.string().min(1).max(255).optional(),
	username: z.string().min(1).max(255).optional(),
	password: z.string().min(1).optional(),
});

const assignToServicesSchema = z.object({
	dockerSecretId: z.string().uuid(),
	serviceIds: z.array(z.string().uuid()),
});

export const dockerSecretRouter = (router: Router, procedure: Procedure) => {
	return router({
		list: procedure.query(async ({ ctx }) => {
			const secrets = await ctx.prisma.dockerSecret.findMany({
				orderBy: { name: 'asc' },
				include: {
					_count: {
						select: {
							services: true,
						},
					},
				},
			});

			// Don't return passwords in list view
			return secrets.map(secret => ({
				...secret,
				password: '••••••••',
			}));
		}),

		getById: procedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
			const secret = await ctx.prisma.dockerSecret.findUnique({
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

			if (!secret) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Docker secret not found',
				});
			}

			try {
				return {
					...secret,
					password: decrypt(secret.password),
					services: secret.services.map(s => s.service),
				};
			} catch (error) {
				throw new TRPCError({
					code: 'INTERNAL_SERVER_ERROR',
					message: error instanceof Error ? error.message : 'Failed to decrypt docker secret password',
					cause: error,
				});
			}
		}),

		getByServiceId: procedure.input(z.object({ serviceId: z.string().uuid() })).query(async ({ ctx, input }) => {
			const serviceSecrets = await ctx.prisma.serviceDockerSecret.findMany({
				where: { serviceId: input.serviceId },
				include: {
					dockerSecret: true,
				},
			});

			return serviceSecrets.map(ss => ({
				...ss.dockerSecret,
				password: '••••••••', // Masked
			}));
		}),

		create: procedure.input(createDockerSecretSchema).mutation(async ({ ctx, input }) => {
			const existing = await ctx.prisma.dockerSecret.findUnique({
				where: { name: input.name },
			});

			if (existing) {
				throw new TRPCError({
					code: 'CONFLICT',
					message: 'Docker secret with this name already exists',
				});
			}

			const encryptedPassword = encrypt(input.password);

			const secret = await ctx.prisma.dockerSecret.create({
				data: {
					name: input.name,
					server: input.server,
					username: input.username,
					password: encryptedPassword,
				},
			});

			return secret;
		}),

		update: procedure.input(updateDockerSecretSchema).mutation(async ({ ctx, input }) => {
			const { id, ...data } = input;

			const existing = await ctx.prisma.dockerSecret.findUnique({
				where: { id },
			});

			if (!existing) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Docker secret not found',
				});
			}

			if (data.name && data.name !== existing.name) {
				const nameExists = await ctx.prisma.dockerSecret.findUnique({
					where: { name: data.name },
				});

				if (nameExists) {
					throw new TRPCError({
						code: 'CONFLICT',
						message: 'Docker secret with this name already exists',
					});
				}
			}

			const updateData: any = {
				...(data.name && { name: data.name }),
				...(data.server && { server: data.server }),
				...(data.username && { username: data.username }),
				...(data.password && { password: encrypt(data.password) }),
			};

			const secret = await ctx.prisma.dockerSecret.update({
				where: { id },
				data: updateData,
			});

			return secret;
		}),

		assignToServices: procedure.input(assignToServicesSchema).mutation(async ({ ctx, input }) => {
			const { dockerSecretId, serviceIds } = input;

			// Check if secret exists
			const secret = await ctx.prisma.dockerSecret.findUnique({
				where: { id: dockerSecretId },
			});

			if (!secret) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Docker secret not found',
				});
			}

			// Delete existing assignments
			await ctx.prisma.serviceDockerSecret.deleteMany({
				where: { dockerSecretId },
			});

			// Create new assignments
			if (serviceIds.length > 0) {
				await ctx.prisma.serviceDockerSecret.createMany({
					data: serviceIds.map(serviceId => ({
						dockerSecretId,
						serviceId,
					})),
				});
			}

			return { success: true };
		}),

		delete: procedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
			const existing = await ctx.prisma.dockerSecret.findUnique({
				where: { id: input.id },
			});

			if (!existing) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Docker secret not found',
				});
			}

			await ctx.prisma.dockerSecret.delete({
				where: { id: input.id },
			});

			return { success: true };
		}),
	});
};
