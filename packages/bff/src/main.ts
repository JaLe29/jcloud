import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import type { CreateFastifyContextOptions, FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import { Server } from './Server';
import { createContext } from './trpc/context';

import { type AppRouter, appRouter } from './trpc/router';

const start = async (): Promise<void> => {
	const server = new Server({
		cors: true,
		appName: 'bff',
		port: 3334,
		serveStatic: true,
		staticPath: process.env.NODE_ENV === 'production' ? './packages/client/dist' : '../client/dist',
	});

	const connectionString = `${process.env.DATABASE_URL}`;
	const adapter = new PrismaPg({ connectionString });
	const prisma = new PrismaClient({ adapter });
	await prisma?.$connect();

	await server.register(fastifyTRPCPlugin, {
		prefix: '/trpc',
		trpcOptions: {
			router: appRouter,
			createContext: ({ req, res }: CreateFastifyContextOptions) =>
				createContext({ req, res }, { prisma: prisma! }),
			onError({ path, error }) {
				// biome-ignore lint/suspicious/noConsole: no reason to change this
				console.error(`Error in tRPC handler on path '${path}':`, error);
			},
		} satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions'],
	});
	await server.listen();
};

start().catch(e => {
	// biome-ignore lint/suspicious/noConsole: no reason to change this
	console.error(e);
});
