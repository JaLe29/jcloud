import { TRPCError } from '@trpc/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { Procedure, Router } from '../router';
import { getPaginationMeta, getPaginationParams, createPaginationInputSchema } from '../../utils/pagination';

const userFilterSchema = z
	.object({
		userPublicId: z.string().optional(),
	})
	.optional();

const userPaginationSchema = createPaginationInputSchema(
	['createdAt', 'updatedAt', 'userPublicId', 'eventsCount', 'lastEventTime'] as const,
	userFilterSchema,
);

export const userRouter = (router: Router, procedure: Procedure) => {
	return router({
		list: procedure
			.input(userPaginationSchema)
			.query(async ({ ctx, input }) => {
				const { page, limit, skip, take } = getPaginationParams(input);

				// Determine sort order
				const sortBy = input?.sortBy || 'createdAt';
				const sortOrder = input?.sortOrder || 'desc';

				// Build where clause for filters
				const where: Prisma.UserWhereInput = {};

				if (input?.filter?.userPublicId) {
					where.userPublicId = {
						contains: input.filter.userPublicId,
						mode: 'insensitive',
					};
				}

				const total = await ctx.prisma.user.count({ where });

				// Special handling for lastEventTime sorting (in-memory)
				const isLastEventTimeSort = sortBy === 'lastEventTime';

				let users: any[];

				if (isLastEventTimeSort) {
					// Fetch all users for in-memory sorting
					const allUsers = await ctx.prisma.user.findMany({
						where,
						include: {
							_count: {
								select: {
									events: true,
								},
							},
							events: {
								take: 1,
								orderBy: {
									createdAt: 'desc',
								},
								select: {
									createdAt: true,
								},
							},
						},
					});

					// Sort in memory by lastEventTime
					const sorted = allUsers.sort((a, b) => {
						const aTime = a.events[0]?.createdAt?.getTime() ?? 0;
						const bTime = b.events[0]?.createdAt?.getTime() ?? 0;
						return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
					});

					// Apply pagination
					users = sorted.slice(skip, skip + take);
				} else {
					// Build orderBy object for Prisma-supported fields
					let orderBy: Prisma.UserOrderByWithRelationInput = {};
					if (sortBy === 'eventsCount') {
						orderBy = {
							events: {
								_count: sortOrder,
							},
						};
					} else {
						orderBy = {
							[sortBy]: sortOrder,
						};
					}

					users = await ctx.prisma.user.findMany({
						where,
						skip,
						take,
						orderBy,
						include: {
							_count: {
								select: {
									events: true,
								},
							},
							events: {
								take: 1,
								orderBy: {
									createdAt: 'desc',
								},
								select: {
									createdAt: true,
								},
							},
						},
					});
				}

				// Transform data to include lastEventTime
				const usersWithLastEvent = users.map((user) => ({
					...user,
					lastEventTime: user.events[0]?.createdAt ?? null,
					events: undefined, // Remove events array from response
				}));

				return {
					users: usersWithLastEvent,
					pagination: getPaginationMeta(page, limit, total),
				};
			}),
		getById: procedure
			.input(z.object({ id: z.string() }))
			.query(async ({ ctx, input }) => {
				const user = await ctx.prisma.user.findUnique({
					where: { id: input.id },
					include: {
						_count: {
							select: {
								events: true,
							},
						},
					},
				});

				if (!user) {
					throw new TRPCError({
						code: 'NOT_FOUND',
						message: 'User not found',
					});
				}

				// Get first and last event times
				const [firstEvent, lastEvent] = await Promise.all([
					ctx.prisma.event.findFirst({
						where: { userId: input.id },
						orderBy: { createdAt: 'asc' },
						select: { createdAt: true },
					}),
					ctx.prisma.event.findFirst({
						where: { userId: input.id },
						orderBy: { createdAt: 'desc' },
						select: { createdAt: true },
					}),
				]);

				return {
					...user,
					firstEventTime: firstEvent?.createdAt ?? null,
					lastEventTime: lastEvent?.createdAt ?? null,
				};
			}),
		delete: procedure
			.input(z.object({ id: z.string() }))
			.mutation(async ({ ctx, input }) => {
				await ctx.prisma.user.delete({
					where: { id: input.id },
				});

				return { success: true };
			}),
	});
};

