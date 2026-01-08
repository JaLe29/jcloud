import type { PrismaClient } from '@prisma/client';
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';

export const createContext = ({ req, res }: CreateFastifyContextOptions, options: { prisma: PrismaClient }) => {
	return {
		req,
		res,
		...options,
	};
};

export type Context = Awaited<ReturnType<typeof createContext>>;
