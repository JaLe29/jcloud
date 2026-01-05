import { Server } from './Server';

const start = async (): Promise<void> => {
	const server = new Server({
		appName: 'jCloud Deploy API',
		port: Number(process.env.PORT) || 3333,
	});

	await server.listen();
};

start().catch(e => {
	// biome-ignore lint/suspicious/noConsole: startup error
	console.error('Failed to start server:', e);
	process.exit(1);
});
