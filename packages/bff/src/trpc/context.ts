import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import type { PrismaClient } from '@prisma/client';

export const createContext = (
	{ req, res }: CreateFastifyContextOptions,
	options: { prisma: PrismaClient },
) => {
	return {
		req,
		res,
		...options,
	};
};

export type Context = Awaited<ReturnType<typeof createContext>>;

