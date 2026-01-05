import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme } from 'antd';
import type React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { ApplicationDetailPage } from './pages/ApplicationDetailPage';
import { ApplicationFormPage } from './pages/ApplicationFormPage';
import { ServiceFormPage } from './pages/ServiceFormPage';
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
			path: '/applications',
			element: (
				<Layout>
					<ApplicationsPage />
				</Layout>
			),
		},
		{
			path: '/applications/new',
			element: (
				<Layout>
					<ApplicationFormPage />
				</Layout>
			),
		},
		{
			path: '/applications/:id',
			element: (
				<Layout>
					<ApplicationDetailPage />
				</Layout>
			),
		},
		{
			path: '/applications/:id/edit',
			element: (
				<Layout>
					<ApplicationFormPage />
				</Layout>
			),
		},
		{
			path: '/applications/:applicationId/services/new',
			element: (
				<Layout>
					<ServiceFormPage />
				</Layout>
			),
		},
		{
			path: '/applications/:applicationId/services/:serviceId/edit',
			element: (
				<Layout>
					<ServiceFormPage />
				</Layout>
			),
		},
	]);

	return (
		<ConfigProvider
			theme={{
				algorithm: theme.defaultAlgorithm,
				token: {
					colorPrimary: '#0ea5e9',
					colorSuccess: '#10b981',
					colorWarning: '#f59e0b',
					colorError: '#ef4444',
					colorInfo: '#0ea5e9',
					borderRadius: 8,
					fontSize: 14,
				},
				components: {
					Layout: {
						headerBg: '#ffffff',
						siderBg: '#0f172a',
						bodyBg: '#f8fafc',
					},
					Menu: {
						darkItemBg: 'transparent',
						darkItemSelectedBg: '#0ea5e9',
						darkItemHoverBg: '#334155',
					},
					Table: {
						headerBg: '#f8fafc',
						rowHoverBg: '#f0f9ff',
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
