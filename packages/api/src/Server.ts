import cors from '@fastify/cors';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import Fastify from 'fastify';

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


	async listen() {
		if (this.options.cors) {
			await this.server.register(cors, {});
		}

		this.initSystemRoutes();

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

	getServer(): FastifyInstance {
		return this.server;
	}
}
