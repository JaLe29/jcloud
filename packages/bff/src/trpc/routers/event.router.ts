import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import type { Procedure, Router } from '../router';
import { getPaginationMeta, getPaginationParams, createPaginationInputSchema } from '../../utils/pagination';

const eventFilterSchema = z
	.object({
		userId: z.string(),
		eventType: z.string().optional(),
	})
	.optional();

const eventPaginationSchema = createPaginationInputSchema(
	['createdAt', 'event'] as const,
	eventFilterSchema,
);

export const eventRouter = (router: Router, procedure: Procedure) => {
	return router({
		getEventTypes: procedure.query(async ({ ctx }) => {
			const events = await ctx.prisma.event.findMany({
				select: {
					event: true,
				},
				distinct: ['event'],
				orderBy: {
					event: 'asc',
				},
			});

			return events.map((e) => e.event);
		}),
		getTimeSeries: procedure
			.input(
				z.object({
					userId: z.string(),
					eventType: z.string().optional(),
					startDate: z.date().optional(),
					endDate: z.date().optional(),
				}),
			)
			.query(async ({ ctx, input }) => {
				const now = new Date();
				const startDate = input.startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
				const endDate = input.endDate || now;

				const where: Prisma.EventWhereInput = {
					userId: input.userId,
					createdAt: {
						gte: startDate,
						lte: endDate,
					},
				};

				if (input.eventType) {
					where.event = input.eventType;
				}

				const events = await ctx.prisma.event.findMany({
					where,
					select: {
						createdAt: true,
					},
					orderBy: {
						createdAt: 'asc',
					},
				});

				// Determine granularity based on date range
				const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
				const useHourly = daysDiff <= 2;

				if (useHourly) {
					// Group by hour
					const groupedByHour = new Map<string, number>();

					for (const event of events) {
						const date = new Date(event.createdAt);
						const dateKey = `${date.toISOString().split('T')[0]!}T${String(date.getHours()).padStart(2, '0')}:00`;
						groupedByHour.set(dateKey, (groupedByHour.get(dateKey) || 0) + 1);
					}

					// Fill gaps for hours
					const result: Array<{ date: string; count: number }> = [];
					const currentDate = new Date(startDate);
					currentDate.setMinutes(0, 0, 0);

					while (currentDate <= endDate) {
						const dateKey = `${currentDate.toISOString().split('T')[0]!}T${String(currentDate.getHours()).padStart(2, '0')}:00`;
						result.push({
							date: dateKey,
							count: groupedByHour.get(dateKey) || 0,
						});
						currentDate.setHours(currentDate.getHours() + 1);
					}

					return result;
				} else {
					// Group by day
					const groupedByDay = new Map<string, number>();

					for (const event of events) {
						const dateKey = event.createdAt.toISOString().split('T')[0]!;
						groupedByDay.set(dateKey, (groupedByDay.get(dateKey) || 0) + 1);
					}

					// Fill gaps for days
					const result: Array<{ date: string; count: number }> = [];
					const currentDate = new Date(startDate);
					currentDate.setHours(0, 0, 0, 0);

					while (currentDate <= endDate) {
						const dateKey = currentDate.toISOString().split('T')[0]!;
						result.push({
							date: dateKey,
							count: groupedByDay.get(dateKey) || 0,
						});
						currentDate.setDate(currentDate.getDate() + 1);
					}

					return result;
				}
			}),
		list: procedure
			.input(eventPaginationSchema)
			.query(async ({ ctx, input }) => {
				const { page, limit, skip, take } = getPaginationParams(input);

				// Determine sort order
				const sortBy = input?.sortBy || 'createdAt';
				const sortOrder = input?.sortOrder || 'desc';

				// Build orderBy object
				const orderBy: Prisma.EventOrderByWithRelationInput = {
					[sortBy]: sortOrder,
				};

				// Build where clause for filters
				const where: Prisma.EventWhereInput = {};

				if (input?.filter?.userId) {
					where.userId = input.filter.userId;
				}

				if (input?.filter?.eventType) {
					where.event = input.filter.eventType;
				}

				const [events, total] = await Promise.all([
					ctx.prisma.event.findMany({
						where,
						skip,
						take,
						orderBy,
					}),
					ctx.prisma.event.count({ where }),
				]);

				return {
					events,
					pagination: getPaginationMeta(page, limit, total),
				};
			}),
	});
};

