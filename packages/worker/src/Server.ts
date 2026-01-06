import cors from '@fastify/cors';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { z } from 'zod';
import { TaskService } from './task.service';

interface ServerOptions {
	port: number;
	appName: string;
}

const deploySchema = z.object({
	image: z.string().min(1),
});

export class Server {
	private server: FastifyInstance;
	private prisma: PrismaClient;
	private taskService: TaskService;

	constructor(private readonly options: ServerOptions) {
		this.server = Fastify({
			logger: true,
		});
		const connectionString = `${process.env.DATABASE_URL}`;
		const adapter = new PrismaPg({ connectionString });
		this.prisma = new PrismaClient({ adapter });
		this.taskService = new TaskService(this.prisma);
	}

	private initSystemRoutes() {
		this.server.get('/ready', () => ({ status: 'ok' }));
	}

	private async tick() {
		try {
			const task = await this.prisma.task.findFirst({
				where: { status: 'WAITING' },
				orderBy: { createdAt: 'asc' },
			});
			if (!task) return;
			await this.taskService.run(task);
		} finally {
			setTimeout(() => this.tick(), 1000);
		}
	}

	async listen() {
		await this.server.register(cors, {});

		this.initSystemRoutes();

		await this.server.listen({ port: this.options.port, host: '0.0.0.0' });

		// biome-ignore lint/suspicious/noConsole: startup message
		console.log(`${this.options.appName} running on port http://localhost:${this.options.port}`);

		this.tick();
	}

	async close() {
		await this.prisma.$disconnect();
		await this.server.close();
	}
}
