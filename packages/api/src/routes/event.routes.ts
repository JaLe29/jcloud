import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { createEventSchema } from '../schemas/event.schema';

export const registerEventRoutes = (server: FastifyInstance, prisma: PrismaClient) => {
	server.post('/event', async (request, reply) => {
		try {
			// Validate input data using Zod
			const validatedData = createEventSchema.parse(request.body);

			// Check if user exists
			const userExists = await prisma.user.findUnique({
				where: {
					userPublicId: validatedData.userPublicId,
				},
			});

			if (!userExists) {
				reply.code(404).send({
					success: false,
					error: 'User not found',
				});
				return;
			}

			// Create event in database
			const event = await prisma.event.create({
				data: {
					userId: userExists.id,
					event: validatedData.event,
					meta: validatedData.meta ?? undefined,
				} ,
			});

			reply.code(201).send({
				success: true,
				data: event,
			});
		} catch (error) {
			// Zod validation error
			if (error instanceof Error && error.name === 'ZodError') {
				reply.code(400).send({
					success: false,
					error: 'Validation error',
					details: error,
				});
				return;
			}

			// General error
			reply.code(500).send({
				success: false,
				error: 'Internal server error',
			});
		}
	});
};

