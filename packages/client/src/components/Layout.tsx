import {
	AppstoreOutlined,
	ClusterOutlined,
	ContainerOutlined,
	ExclamationCircleOutlined,
	HomeOutlined,
	KeyOutlined,
	LockOutlined,
	MenuOutlined,
	RocketOutlined,
	UnorderedListOutlined,
} from '@ant-design/icons';
import { Layout as AntLayout, Button, Menu, Select, Tag, Typography } from 'antd';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useClusterStore } from '../stores/clusterStore';
import { trpc } from '../utils/trpc';

const { Header, Sider, Content } = AntLayout;
const { Text } = Typography;

interface LayoutProps {
	children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
	const navigate = useNavigate();
	const location = useLocation();
	const [collapsed, setCollapsed] = useState(false);
	const { selectedClusterId, setSelectedClusterId } = useClusterStore();
	const { data: clusters } = trpc.cluster.list.useQuery();

	const menuItems = [
		{
			key: '/',
			icon: <HomeOutlined />,
			label: 'Dashboard',
		},
		{
			key: '/clusters',
			icon: <ClusterOutlined />,
			label: 'Clusters',
		},
		{
			key: '/applications',
			icon: <AppstoreOutlined />,
			label: 'Applications',
		},
		{
			key: '/deployments',
			icon: <RocketOutlined />,
			label: 'Deployments',
		},
		{
			key: '/pods',
			icon: <ContainerOutlined />,
			label: 'Pods',
		},
		{
			key: '/tasks',
			icon: <UnorderedListOutlined />,
			label: 'Tasks',
		},
		{
			key: '/envs',
			icon: <LockOutlined />,
			label: 'Env Variables',
		},
		{
			key: '/docker-secrets',
			icon: <KeyOutlined />,
			label: 'Docker Secrets',
		},
	];

	const getSelectedKey = () => {
		if (location.pathname.startsWith('/applications')) {
			return '/applications';
		}
		if (location.pathname.startsWith('/clusters')) {
			return '/clusters';
		}
		if (location.pathname.startsWith('/deployments')) {
			return '/deployments';
		}
		if (location.pathname.startsWith('/pods')) {
			return '/pods';
		}
		if (location.pathname.startsWith('/tasks')) {
			return '/tasks';
		}
		if (location.pathname.startsWith('/envs')) {
			return '/envs';
		}
		if (location.pathname.startsWith('/docker-secrets')) {
			return '/docker-secrets';
		}
		return location.pathname;
	};

	// Validate that the selected cluster (loaded from localStorage by persist middleware) still exists
	useEffect(() => {
		if (selectedClusterId && clusters) {
			const clusterExists = clusters.some(c => c.id === selectedClusterId);
			if (!clusterExists) {
				// Cluster was deleted, clear selection
				setSelectedClusterId(null);
			}
		}
	}, [selectedClusterId, clusters, setSelectedClusterId]);

	const handleMenuClick = (key: string) => {
		navigate(key);
		if (window.innerWidth < 992) {
			setCollapsed(true);
		}
	};

	return (
		<AntLayout style={{ minHeight: '100vh' }}>
			<Sider
				breakpoint="lg"
				collapsedWidth="0"
				collapsed={collapsed}
				onCollapse={value => setCollapsed(value)}
				width={220}
				style={{
					overflow: 'auto',
					height: '100vh',
					position: 'fixed',
					left: 0,
					top: 0,
					bottom: 0,
					zIndex: 999,
					borderRight: '1px solid #f0f0f0',
				}}
			>
				<div
					style={{
						height: '64px',
						display: 'flex',
						alignItems: 'center',
						padding: '0 24px',
						borderBottom: '1px solid #f0f0f0',
					}}
				>
					<Text style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.5px' }}>JCloud</Text>
				</div>
				<Menu
					mode="inline"
					selectedKeys={[getSelectedKey()]}
					items={menuItems}
					onClick={({ key }) => handleMenuClick(key)}
					style={{ border: 'none', marginTop: 8 }}
				/>
			</Sider>
			<AntLayout style={{ marginLeft: collapsed ? 0 : 220, transition: 'margin-left 0.2s' }}>
				<Header
					style={{
						padding: '0 24px',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						position: 'sticky',
						top: 0,
						zIndex: 998,
						borderBottom: '1px solid #f0f0f0',
					}}
				>
					<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
						<Button type="text" icon={<MenuOutlined />} onClick={() => setCollapsed(!collapsed)} />
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
						{clusters && clusters.length > 0 ? (
							<Select
								value={selectedClusterId}
								onChange={setSelectedClusterId}
								placeholder="Select cluster"
								style={{ minWidth: 200 }}
								options={clusters.map(cluster => ({
									label: cluster.name,
									value: cluster.id,
								}))}
							/>
						) : (
							<Tag color="warning" icon={<ExclamationCircleOutlined />}>
								No clusters available
							</Tag>
						)}
						{clusters && clusters.length > 0 && !selectedClusterId && (
							<Tag color="error" icon={<ExclamationCircleOutlined />}>
								No cluster selected
							</Tag>
						)}
					</div>
				</Header>
				<Content style={{ padding: 24 }}>{children}</Content>
			</AntLayout>
		</AntLayout>
	);
};
