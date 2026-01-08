import { createDeployTaskMeta } from '@jcloud/backend-shared';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { deploySchema } from '../schemas/deploy.schema';

interface DeployRouteDependencies {
	prisma: PrismaClient;
}

export function registerDeployRoute(server: FastifyInstance, deps: DeployRouteDependencies) {
	server.post('/deploy', async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			// Get API key from header
			const apiKey = request.headers['x-api-key'];

			if (!apiKey || typeof apiKey !== 'string') {
				return reply.code(401).send({
					error: 'Unauthorized',
					message: 'Missing or invalid X-API-Key header',
				});
			}

			// Validate API key
			const key = await deps.prisma.apiKey.findUnique({
				where: { key: apiKey },
				include: { service: true },
			});

			if (!key) {
				return reply.code(401).send({
					error: 'Unauthorized',
					message: 'Invalid API key',
				});
			}

			// Parse and validate body
			const parseResult = deploySchema.safeParse(request.body);

			if (!parseResult.success) {
				// biome-ignore lint/suspicious/noConsole: error message
				console.log(parseResult.error.issues.map(issue => issue.message).join(', '));
				return reply.code(400).send({
					error: 'Bad Request',
					message: 'Invalid request body',
				});
			}

			const { image } = parseResult.data;

			// Record deployment
			const deploy = await deps.prisma.apiDeploy.create({
				data: {
					apiKeyId: key.id,
					image,
				},
			});

			// Create task for deployment
			await deps.prisma.task.create({
				data: {
					serviceId: key.service.id,
					meta: createDeployTaskMeta(image, deploy.id) as unknown as Prisma.InputJsonValue,
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
			server.log.error(error);
			return reply.code(500).send({
				error: 'Internal Server Error',
				message: 'Failed to process deployment',
			});
		}
	});
}
