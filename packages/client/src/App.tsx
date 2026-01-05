import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, theme } from 'antd';
import type React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { ApplicationDetailPage } from './pages/ApplicationDetailPage';
import { ApplicationFormPage } from './pages/ApplicationFormPage';
import { ServiceDetailPage } from './pages/ServiceDetailPage';
import { ServiceFormPage } from './pages/ServiceFormPage';
import { EnvsPage } from './pages/EnvsPage';
import { DockerSecretsPage } from './pages/DockerSecretsPage';
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
			path: '/applications/:applicationId/services/:serviceId',
			element: (
				<Layout>
					<ServiceDetailPage />
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
		{
			path: '/envs',
			element: (
				<Layout>
					<EnvsPage />
				</Layout>
			),
		},
		{
			path: '/docker-secrets',
			element: (
				<Layout>
					<DockerSecretsPage />
				</Layout>
			),
		},
	]);

	return (
		<ConfigProvider
			theme={{
				algorithm: theme.defaultAlgorithm,
				token: {
					colorPrimary: '#1677ff',
					colorSuccess: '#52c41a',
					colorWarning: '#faad14',
					colorError: '#ff4d4f',
					colorInfo: '#1677ff',
					colorBgContainer: '#ffffff',
					colorBgLayout: '#f5f5f5',
					colorBorder: '#d9d9d9',
					borderRadius: 6,
					fontSize: 14,
				},
				components: {
					Layout: {
						headerBg: '#ffffff',
						siderBg: '#ffffff',
						bodyBg: '#f5f5f5',
					},
					Menu: {
						itemBg: 'transparent',
						itemSelectedBg: '#e6f4ff',
						itemHoverBg: '#f5f5f5',
						itemSelectedColor: '#1677ff',
					},
					Table: {
						headerBg: '#fafafa',
						rowHoverBg: '#fafafa',
					},
					Card: {
						colorBgContainer: '#ffffff',
					},
					Button: {
						primaryShadow: 'none',
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
