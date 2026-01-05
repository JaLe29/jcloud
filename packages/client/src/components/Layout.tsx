import { useState } from 'react';
import { Layout as AntLayout, Menu, Typography, Button } from 'antd';
import { AppstoreOutlined, HomeOutlined, MenuOutlined, LockOutlined, KeyOutlined } from '@ant-design/icons';
import type React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = AntLayout;
const { Text } = Typography;

interface LayoutProps {
	children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
	const navigate = useNavigate();
	const location = useLocation();
	const [collapsed, setCollapsed] = useState(false);

	const menuItems = [
		{
			key: '/',
			icon: <HomeOutlined />,
			label: 'Dashboard',
		},
		{
			key: '/applications',
			icon: <AppstoreOutlined />,
			label: 'Applications',
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
		if (location.pathname.startsWith('/envs')) {
			return '/envs';
		}
		if (location.pathname.startsWith('/docker-secrets')) {
			return '/docker-secrets';
		}
		return location.pathname;
	};

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
				onCollapse={(value) => setCollapsed(value)}
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
					<Text style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.5px' }}>
						JCloud
					</Text>
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
						<Button
							type="text"
							icon={<MenuOutlined />}
							onClick={() => setCollapsed(!collapsed)}
						/>
					</div>
				</Header>
				<Content style={{ padding: 24 }}>
					{children}
				</Content>
			</AntLayout>
		</AntLayout>
	);
};
