import type { FastifyInstance } from 'fastify';

export function registerSystemRoutes(server: FastifyInstance) {
	server.get('/ready', () => ({ status: 'ok' }));
}

