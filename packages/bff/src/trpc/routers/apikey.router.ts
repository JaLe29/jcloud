import { TRPCError } from '@trpc/server';
import type { Prisma } from '@prisma/client';
import crypto from 'node:crypto';
import { z } from 'zod';
import type { Procedure, Router } from '../router';
import { getPaginationMeta, getPaginationParams, createPaginationInputSchema } from '../../utils/pagination';

function generateApiKey(): string {
	// Generate a secure random API key (32 bytes = 64 hex characters)
	return crypto.randomBytes(32).toString('hex');
}

const usagePaginationSchema = createPaginationInputSchema(
	['createdAt'] as const,
	z.object({ serviceId: z.string().uuid() }).optional(),
);

export const apikeyRouter = (router: Router, procedure: Procedure) => {
	return router({
		getByServiceId: procedure
			.input(z.object({ serviceId: z.string().uuid() }))
			.query(async ({ ctx, input }) => {
				const apiKey = await ctx.prisma.apiKey.findUnique({
					where: { serviceId: input.serviceId },
				});

				return apiKey;
			}),

		generate: procedure
			.input(z.object({ serviceId: z.string().uuid() }))
			.mutation(async ({ ctx, input }) => {
				// Check if service exists
				const service = await ctx.prisma.service.findUnique({
					where: { id: input.serviceId },
				});

				if (!service) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'Service not found',
					});
				}

				// Check if API key already exists
				const existing = await ctx.prisma.apiKey.findUnique({
					where: { serviceId: input.serviceId },
				});

				if (existing) {
					throw new TRPCError({
						code: 'CONFLICT',
						message: 'API key already exists for this service. Use regenerate to create a new one.',
					});
				}

				// Generate new API key
				const key = generateApiKey();

				const apiKey = await ctx.prisma.apiKey.create({
					data: {
						serviceId: input.serviceId,
						key,
					},
				});

				return apiKey;
			}),

		regenerate: procedure
			.input(z.object({ serviceId: z.string().uuid() }))
			.mutation(async ({ ctx, input }) => {
				// Check if API key exists
				const existing = await ctx.prisma.apiKey.findUnique({
					where: { serviceId: input.serviceId },
				});

				if (!existing) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'API key not found for this service',
					});
				}

				// Generate new API key
				const key = generateApiKey();

				const apiKey = await ctx.prisma.apiKey.update({
					where: { serviceId: input.serviceId },
					data: { key },
				});

				return apiKey;
			}),

		delete: procedure
			.input(z.object({ serviceId: z.string().uuid() }))
			.mutation(async ({ ctx, input }) => {
				const existing = await ctx.prisma.apiKey.findUnique({
					where: { serviceId: input.serviceId },
				});

				if (!existing) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'API key not found',
					});
				}

				await ctx.prisma.apiKey.delete({
					where: { serviceId: input.serviceId },
				});

				return { success: true };
			}),

		recordUsage: procedure
			.input(
				z.object({
					key: z.string(),
					ipAddress: z.string().optional(),
					userAgent: z.string().optional(),
					endpoint: z.string().optional(),
				}),
			)
			.mutation(async ({ ctx, input }) => {
				// Find API key
				const apiKey = await ctx.prisma.apiKey.findUnique({
					where: { key: input.key },
				});

				if (!apiKey) {
					throw new TRPCError({
						code: 'UNAUTHORIZED',
						message: 'Invalid API key',
					});
				}

				// Record usage
				const usage = await ctx.prisma.apiKeyUsage.create({
					data: {
						apiKeyId: apiKey.id,
						ipAddress: input.ipAddress,
						userAgent: input.userAgent,
						endpoint: input.endpoint,
					},
				});

				return usage;
			}),

		getUsageHistory: procedure
			.input(usagePaginationSchema)
			.query(async ({ ctx, input }) => {
				const { page, limit, skip, take } = getPaginationParams(input);

				if (!input?.filter?.serviceId) {
					throw new TRPCError({
						code: 'BAD_REQUEST',
						message: 'serviceId is required',
					});
				}

				// Get API key for this service
				const apiKey = await ctx.prisma.apiKey.findUnique({
					where: { serviceId: input.filter.serviceId },
				});

				if (!apiKey) {
					return {
						usages: [],
						pagination: getPaginationMeta(page, limit, 0),
					};
				}

				const where: Prisma.ApiKeyUsageWhereInput = {
					apiKeyId: apiKey.id,
				};

				const total = await ctx.prisma.apiKeyUsage.count({ where });

				const usages = await ctx.prisma.apiKeyUsage.findMany({
					where,
					skip,
					take,
					orderBy: { createdAt: 'desc' },
				});

				return {
					usages,
					pagination: getPaginationMeta(page, limit, total),
				};
			}),
	});
};

