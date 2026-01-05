// eslint-disable-next-line import/no-relative-packages
import type { AppRouter } from '@jcloud/bff/src/trpc/router';
import { httpLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import superjson from 'superjson';

export const trpc = createTRPCReact<AppRouter>({});

// Dynamicky určí API URL podle prostředí
const getBaseApiUrl = () => {
	if (typeof window === 'undefined') {
		return 'http://localhost:3334';
	}

	// Na localhostu použij localhost, jinak stejnou URL jako aplikace
	if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
		return 'http://localhost:3334';
	}

	// Na produkci použij stejnou URL jako aplikace
	return `${window.location.protocol}//${window.location.host}`;
};

const BASE_API = getBaseApiUrl();

export const trpcClient = trpc.createClient({
	transformer: superjson,
	links: [
		httpLink({
			url: `${BASE_API}/trpc`,
		}),
	],
});
