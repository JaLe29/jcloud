import { z } from 'zod';

export const PAGINATION_DEFAULTS = {
	page: 1,
	limit: 10,
	maxLimit: 100,
} as const;

/**
 * Base pagination schema without sorting
 */
export const basePaginationInputSchema = z
	.object({
		page: z.number().int().min(1).default(PAGINATION_DEFAULTS.page).optional(),
		limit: z.number().int().min(1).max(PAGINATION_DEFAULTS.maxLimit).default(PAGINATION_DEFAULTS.limit).optional(),
	})
	.optional();

/**
 * Factory function to create pagination schema with type-safe sorting and filtering
 *
 * @example
 * ```ts
 * const userPaginationSchema = createPaginationInputSchema(
 *   ['createdAt', 'eventsCount', 'userPublicId'],
 *   z.object({ userPublicId: z.string().optional() })
 * );
 * ```
 */
export const createPaginationInputSchema = <
	T extends readonly [string, ...string[]],
	F extends z.ZodTypeAny = z.ZodUndefined,
>(
	sortableFields: T,
	filterSchema?: F,
) => {
	return z
		.object({
			page: z.number().int().min(1).default(PAGINATION_DEFAULTS.page).optional(),
			limit: z
				.number()
				.int()
				.min(1)
				.max(PAGINATION_DEFAULTS.maxLimit)
				.default(PAGINATION_DEFAULTS.limit)
				.optional(),
			sortBy: z.enum(sortableFields).optional(),
			sortOrder: z.enum(['asc', 'desc']).optional(),
			filter: (filterSchema ?? z.undefined()).optional(),
		})
		.optional();
};

/**
 * Generic pagination schema with string sortBy (use createPaginationInputSchema for type-safety)
 * @deprecated Use createPaginationInputSchema instead for type-safe sorting
 */
export const paginationInputSchema = z
	.object({
		page: z.number().int().min(1).default(PAGINATION_DEFAULTS.page).optional(),
		limit: z.number().int().min(1).max(PAGINATION_DEFAULTS.maxLimit).default(PAGINATION_DEFAULTS.limit).optional(),
		sortBy: z.string().optional(),
		sortOrder: z.enum(['asc', 'desc']).optional(),
	})
	.optional();

export type PaginationInput = z.infer<typeof paginationInputSchema>;

export interface PaginationMeta {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
}

export const getPaginationParams = (input?: PaginationInput) => {
	const page = input?.page ?? PAGINATION_DEFAULTS.page;
	const limit = input?.limit ?? PAGINATION_DEFAULTS.limit;
	const skip = (page - 1) * limit;

	return {
		page,
		limit,
		skip,
		take: limit,
	};
};

export const getPaginationMeta = (page: number, limit: number, total: number): PaginationMeta => {
	const totalPages = Math.ceil(total / limit);

	return {
		page,
		limit,
		total,
		totalPages,
		hasNextPage: page < totalPages,
		hasPreviousPage: page > 1,
	};
};
