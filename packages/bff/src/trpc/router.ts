import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { serviceRouter } from './routers/service.router';
import { applicationRouter } from './routers/application.router';
import { envRouter } from './routers/env.router';
import { apikeyRouter } from './routers/apikey.router';
import { dockerSecretRouter } from './routers/dockersecret.router';
import type { Context } from './context';

export const t = initTRPC.context<Context>().create({ transformer: superjson });

export const appRouter = t.router({
	service: serviceRouter(t.router, t.procedure),
	application: applicationRouter(t.router, t.procedure),
	env: envRouter(t.router, t.procedure),
	apikey: apikeyRouter(t.router, t.procedure),
	dockerSecret: dockerSecretRouter(t.router, t.procedure),
});

export type AppRouter = typeof appRouter;
export type Procedure = typeof t.procedure;
export type Router = typeof t.router;
