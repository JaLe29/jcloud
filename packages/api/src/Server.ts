import cors from '@fastify/cors';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { registerDeployRoute } from './routes/deploy.route';
import { registerSystemRoutes } from './routes/system.route';

interface ServerOptions {
	port: number;
	appName: string;
}

export class Server {
	private server: FastifyInstance;
	private prisma: PrismaClient;

	constructor(private readonly options: ServerOptions) {
		this.server = Fastify({
			logger: true,
		});
		const connectionString = `${process.env.DATABASE_URL}`;
		const adapter = new PrismaPg({ connectionString });
		this.prisma = new PrismaClient({ adapter });
	}

	async listen() {
		await this.server.register(cors, {});

		registerSystemRoutes(this.server);
		registerDeployRoute(this.server, { prisma: this.prisma });

		await this.server.listen({ port: this.options.port, host: '0.0.0.0' });

		// biome-ignore lint/suspicious/noConsole: startup message
		console.log(`${this.options.appName} running on port http://localhost:${this.options.port}`);
	}

	async close() {
		await this.prisma.$disconnect();
		await this.server.close();
	}
}
