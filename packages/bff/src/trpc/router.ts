import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { userRouter } from './routers/user.router';
import { eventRouter } from './routers/event.router';
import type { Context } from './context';

export const t = initTRPC.context<Context>().create({ transformer: superjson });

export const appRouter = t.router({
	user: userRouter(t.router, t.procedure),
	event: eventRouter(t.router, t.procedure),
});

export type AppRouter = typeof appRouter;
export type Procedure = typeof t.procedure;
export type Router = typeof t.router;

