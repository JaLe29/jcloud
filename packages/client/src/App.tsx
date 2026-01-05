import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme } from 'antd';
import type React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { UsersPage } from './pages/UsersPage';
import { UserDetailPage } from './pages/UserDetailPage';
import { EventsPage } from './pages/EventsPage';
import { trpc, trpcClient } from './utils/trpc';
import './global.css';

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
		},
	},
});

export const App: React.FC = () => {
	const router = createBrowserRouter([
		{
			path: '/',
			element: (
				<Layout>
					<HomePage />
				</Layout>
			),
		},
		{
			path: '/users',
			element: (
				<Layout>
					<UsersPage />
				</Layout>
			),
		},
		{
			path: '/users/:id',
			element: (
				<Layout>
					<UserDetailPage />
				</Layout>
			),
		},
		{
			path: '/events',
			element: (
				<Layout>
					<EventsPage />
				</Layout>
			),
		},
	]);

	return (
		<ConfigProvider
			theme={{
				algorithm: theme.defaultAlgorithm,
				token: {
					colorPrimary: '#9019F9',
					colorSuccess: '#10b981',
					colorWarning: '#f59e0b',
					colorError: '#ef4444',
					colorInfo: '#9019F9',
					borderRadius: 8,
					fontSize: 14,
				},
				components: {
					Layout: {
						headerBg: '#ffffff',
						siderBg: '#1e293b',
						bodyBg: '#f8fafc',
					},
					Menu: {
						darkItemBg: '#1e293b',
						darkItemSelectedBg: '#9019F9',
						darkItemHoverBg: '#334155',
					},
					Table: {
						headerBg: '#f8fafc',
						rowHoverBg: '#fafafa',
					},
				},
			}}
		>
			<trpc.Provider client={trpcClient} queryClient={queryClient}>
				<QueryClientProvider client={queryClient}>
					<RouterProvider router={router} />
				</QueryClientProvider>
			</trpc.Provider>
		</ConfigProvider>
	);
};
