import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { Procedure, Router } from '../router';
import { encrypt, decrypt } from '../../utils/encryption';

const createClusterSchema = z.object({
	name: z.string().min(1).max(100),
	kubeconfig: z.string().min(1),
});

const updateClusterSchema = z.object({
	id: z.string().uuid(),
	name: z.string().min(1).max(100).optional(),
	kubeconfig: z.string().min(1).optional(),
});

export const clusterRouter = (router: Router, procedure: Procedure) => {
	return router({
		list: procedure.query(async ({ ctx }) => {
			const clusters = await ctx.prisma.cluster.findMany({
				orderBy: { name: 'asc' },
				include: {
					_count: {
						select: {
							applications: true,
						},
					},
				},
			});

			// Don't return kubeconfig in list view
			return clusters.map(cluster => ({
				...cluster,
				kubeconfig: '••••••••',
			}));
		}),

		getById: procedure
			.input(z.object({ id: z.string().uuid() }))
			.query(async ({ ctx, input }) => {
				const cluster = await ctx.prisma.cluster.findUnique({
					where: { id: input.id },
					include: {
						_count: {
							select: {
								applications: true,
							},
						},
					},
				});

				if (!cluster) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'Cluster not found',
					});
				}

				try {
					return {
						...cluster,
						kubeconfig: decrypt(cluster.kubeconfig),
					};
				} catch (error) {
					throw new TRPCError({
						code: 'INTERNAL_SERVER_ERROR',
						message: error instanceof Error ? error.message : 'Failed to decrypt cluster kubeconfig',
						cause: error,
					});
				}
			}),

		create: procedure
			.input(createClusterSchema)
			.mutation(async ({ ctx, input }) => {
				const existing = await ctx.prisma.cluster.findUnique({
					where: { name: input.name },
				});

				if (existing) {
					throw new TRPCError({
						code: 'CONFLICT',
						message: 'Cluster with this name already exists',
					});
				}

				const encryptedKubeconfig = encrypt(input.kubeconfig);

				const cluster = await ctx.prisma.cluster.create({
					data: {
						name: input.name,
						kubeconfig: encryptedKubeconfig,
					},
				});

				return cluster;
			}),

		update: procedure
			.input(updateClusterSchema)
			.mutation(async ({ ctx, input }) => {
				const { id, ...data } = input;

				const existing = await ctx.prisma.cluster.findUnique({
					where: { id },
				});

				if (!existing) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'Cluster not found',
					});
				}

				if (data.name && data.name !== existing.name) {
					const nameExists = await ctx.prisma.cluster.findUnique({
						where: { name: data.name },
					});

					if (nameExists) {
						throw new TRPCError({
							code: 'CONFLICT',
							message: 'Cluster with this name already exists',
						});
					}
				}

				const updateData: {
					name?: string;
					kubeconfig?: string;
				} = {
					...(data.name && { name: data.name }),
					...(data.kubeconfig && { kubeconfig: encrypt(data.kubeconfig) }),
				};

				const cluster = await ctx.prisma.cluster.update({
					where: { id },
					data: updateData,
				});

				return cluster;
			}),

		delete: procedure
			.input(z.object({ id: z.string().uuid() }))
			.mutation(async ({ ctx, input }) => {
				const existing = await ctx.prisma.cluster.findUnique({
					where: { id: input.id },
					include: {
						_count: {
							select: {
								applications: true,
							},
						},
					},
				});

				if (!existing) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'Cluster not found',
					});
				}

				if (existing._count.applications > 0) {
					throw new TRPCError({
						code: 'CONFLICT',
						message: 'Cannot delete cluster with existing applications',
					});
				}

				await ctx.prisma.cluster.delete({
					where: { id: input.id },
				});

				return { success: true };
			}),
	});
};

