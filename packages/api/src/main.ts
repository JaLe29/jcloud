import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { registerEventRoutes } from './routes/event.routes';
import { registerUserRoutes } from './routes/user.routes';
import { Server } from './Server';

const start = async (): Promise<void> => {
	const server = new Server({
		cors: true,
		appName: 'server',
		port: 3333,
		serveStatic: true,
		// staticPath: process.env.NODE_ENV === 'production' ? './packages/client/dist' : '../client/dist',
	});

	const connectionString = `${process.env.DATABASE_URL}`;

	const adapter = new PrismaPg({ connectionString });
	const prisma = new PrismaClient({ adapter });
	await prisma?.$connect();

	// Register API routes
	registerUserRoutes(server.getServer(), prisma);
	registerEventRoutes(server.getServer(), prisma);

	await server.listen();
};

start().catch(e => {
	// biome-ignore lint/suspicious/noConsole: no reason to change this
	console.error(e);
});
