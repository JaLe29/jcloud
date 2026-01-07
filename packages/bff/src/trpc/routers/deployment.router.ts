import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { Procedure, Router } from '../router';
import { getPaginationMeta, getPaginationParams, createPaginationInputSchema } from '../../utils/pagination';

const deploymentFilterSchema = z
	.object({
		serviceId: z.string().uuid().optional(),
		applicationId: z.string().uuid().optional(),
	})
	.optional();

const deploymentPaginationSchema = createPaginationInputSchema(
	['createdAt'] as const,
	deploymentFilterSchema,
);

export const deploymentRouter = (router: Router, procedure: Procedure) => {
	return router({
		list: procedure
			.input(deploymentPaginationSchema)
			.query(async ({ ctx, input }) => {
				const { page, limit, skip, take } = getPaginationParams(input);

				const sortBy = input?.sortBy || 'createdAt';
				const sortOrder = input?.sortOrder || 'desc';

				const where: Prisma.ApiDeployWhereInput = {};

				if (input?.filter?.serviceId) {
					const apiKey = await ctx.prisma.apiKey.findUnique({
						where: { serviceId: input.filter.serviceId },
						select: { id: true },
					});

					if (apiKey) {
						where.apiKeyId = apiKey.id;
					} else {
						// If no API key exists for this service, return empty result
						return {
							deployments: [],
							pagination: getPaginationMeta(page, limit, 0),
						};
					}
				}

				if (input?.filter?.applicationId) {
					// Filter by application - get all services in this application
					const services = await ctx.prisma.service.findMany({
						where: { applicationId: input.filter.applicationId },
						select: { id: true },
					});

					const serviceIds = services.map(s => s.id);
					const apiKeys = await ctx.prisma.apiKey.findMany({
						where: { serviceId: { in: serviceIds } },
						select: { id: true },
					});

					if (apiKeys.length === 0) {
						return {
							deployments: [],
							pagination: getPaginationMeta(page, limit, 0),
						};
					}

					where.apiKeyId = { in: apiKeys.map(k => k.id) };
				}

				const total = await ctx.prisma.apiDeploy.count({ where });

				const orderBy: Prisma.ApiDeployOrderByWithRelationInput = {
					[sortBy]: sortOrder,
				};

				const deployments = await ctx.prisma.apiDeploy.findMany({
					where,
					skip,
					take,
					orderBy,
					include: {
						apiKey: {
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

				return {
					deployments: deployments.map((deploy) => ({
						id: deploy.id,
						image: deploy.image,
						createdAt: deploy.createdAt,
						service: deploy.apiKey.service,
					})),
					pagination: getPaginationMeta(page, limit, total),
				};
			}),

		getById: procedure
			.input(z.object({ id: z.string().uuid() }))
			.query(async ({ ctx, input }) => {
				const deployment = await ctx.prisma.apiDeploy.findUnique({
					where: { id: input.id },
					include: {
						apiKey: {
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

				if (!deployment) {
					throw new Error('Deployment not found');
				}

				return {
					id: deployment.id,
					image: deployment.image,
					createdAt: deployment.createdAt,
					service: deployment.apiKey.service,
				};
			}),
	});
};

