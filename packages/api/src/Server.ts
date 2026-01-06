import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { PrismaPg } from '@prisma/adapter-pg';
import { createDeployTaskMeta } from '@jcloud/backend-shared';

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

	constructor(private readonly options: ServerOptions) {
		this.server = Fastify({
			logger: true,
		});
		const connectionString = `${process.env.DATABASE_URL}`;
		const adapter = new PrismaPg({ connectionString });
		this.prisma = new PrismaClient({ adapter });
	}

	private initSystemRoutes() {
		this.server.get('/ready', () => ({ status: 'ok' }));
	}

	private initDeployRoute() {
		this.server.post('/deploy', async (request, reply) => {
			try {
				// Get API key from header
				const apiKey = request.headers['x-api-key'];

				if (!apiKey || typeof apiKey !== 'string') {
					return reply.code(401).send({
						error: 'Unauthorized',
						message: 'Missing or invalid X-API-Key header'
					});
				}

				// Validate API key
				const key = await this.prisma.apiKey.findUnique({
					where: { key: apiKey },
					include: { service: true },
				});

				if (!key) {
					return reply.code(401).send({
						error: 'Unauthorized',
						message: 'Invalid API key'
					});
				}

				// Parse and validate body
				const parseResult = deploySchema.safeParse(request.body);

				if (!parseResult.success) {
					// biome-ignore lint/suspicious/noConsole: error message
					console.log( parseResult.error.issues.map(issue => issue.message).join(', '));
					return reply.code(400).send({
						error: 'Bad Request',
						message: 'Invalid request body',
					});
				}

				const { image } = parseResult.data;

				// Record deployment
				const deploy = await this.prisma.apiDeploy.create({
					data: {
						apiKeyId: key.id,
						image,
					},
				});

				// Create task for deployment
				await this.prisma.task.create({
					data: {
						serviceId: key.service.id,
						meta: createDeployTaskMeta(image, deploy.id),
					},
				});

				// TODO: Actually deploy to Kubernetes here
				// For now, just return success

				return reply.code(200).send({
					success: true,
					deploymentId: deploy.id,
					service: {
						id: key.service.id,
						name: key.service.name,
					},
					image,
					deployedAt: deploy.createdAt,
					message: 'Deployment recorded successfully',
				});

			} catch (error) {
				this.server.log.error(error);
				return reply.code(500).send({
					error: 'Internal Server Error',
					message: 'Failed to process deployment'
				});
			}
		});
	}

	async listen() {
		await this.server.register(cors, {});

		this.initSystemRoutes();
		this.initDeployRoute();

		await this.server.listen({ port: this.options.port, host: '0.0.0.0' });

		// biome-ignore lint/suspicious/noConsole: startup message
		console.log(`${this.options.appName} running on port http://localhost:${this.options.port}`);
	}

	async close() {
		await this.prisma.$disconnect();
		await this.server.close();
	}
}
