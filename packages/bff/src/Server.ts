import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import Fastify from 'fastify';
import path from 'path';

interface ServerOptions {
	port: number;
	appName: string;
	cors?: boolean;
	validators?: boolean;
	serveStatic?: boolean;
	staticPath?: string;
}

export class Server {
	private server: FastifyInstance;

	constructor(private readonly options: ServerOptions) {
		this.server = Fastify({
			logger: false,
		});
	}

	private initSystemRoutes() {
		this.server.get('/ready', () => ({ status: 'ok' }));
	}

	private async initStaticFiles() {
		if (this.options.serveStatic && this.options.staticPath) {
			await this.server.register(fastifyStatic, {
				root: path.join(process.cwd(), this.options.staticPath),
				prefix: '/',
			});

			// Serve index.html for all non-API routes (SPA routing)
			this.server.setNotFoundHandler((request, reply) => {
				// Don't serve index.html for API routes
				if (request.url.startsWith('/trpc') || request.url.startsWith('/ready')) {
					reply.code(404).send({ error: 'Not Found' });
					return;
				}

				// Serve index.html for all other routes (SPA routing)
				reply.sendFile('index.html', path.join(process.cwd(), this.options.staticPath!));
			});
		}
	}

	async listen() {
		if (this.options.cors) {
			await this.server.register(cors, {});
		}

		this.initSystemRoutes();
		await this.initStaticFiles();

		await this.server.listen({ port: this.options.port, host: '0.0.0.0' });

		// biome-ignore lint/suspicious/noConsole: no reason to change this
		console.log(`${this.options.appName} running on port http://localhost:${this.options.port}`);
	}

	async close() {
		await this.server.close();
	}
	post(path: string, handler: (request: FastifyRequest, reply: FastifyReply) => Promise<void>) {
		this.server.post(path, handler);
	}

	async register(plugin: any, options?: any) {
		await this.server.register(plugin, options);
	}

	get(path: string, handler: (request: FastifyRequest, reply: FastifyReply) => Promise<void>) {
		this.server.get(path, handler);
	}

	getServer(): FastifyInstance {
		return this.server;
	}
}
