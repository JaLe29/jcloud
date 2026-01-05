import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { createUserSchema } from '../schemas/user.schema';

export const registerUserRoutes = (server: FastifyInstance, prisma: PrismaClient) => {
	server.post('/user', async (request, reply) => {
		try {
			// Validate input data using Zod
			const validatedData = createUserSchema.parse(request.body);

			// Create user in database
			const user = await prisma.user.create({
				data: {
					userPublicId: validatedData.userPublicId,
				}
			});

			reply.code(201).send({
				success: true,
				data: user,
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

			// Prisma error (e.g. duplicate userPublicId)
			if (error instanceof Error && 'code' in error) {
				const prismaError = error
				if (prismaError.code === 'P2002') {
					reply.code(409).send({
						success: false,
						error: 'User with this userPublicId already exists',
					});
					return;
				}
			}

			// General error
			reply.code(500).send({
				success: false,
				error: 'Internal server error',
			});
		}
	});
};

