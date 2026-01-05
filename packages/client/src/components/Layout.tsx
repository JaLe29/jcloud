import { useState } from 'react';
import { Layout as AntLayout, Menu, Typography, theme, Button } from 'antd';
import { UserOutlined, HomeOutlined, CalendarOutlined, MenuOutlined } from '@ant-design/icons';
import type React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = AntLayout;
const { Title } = Typography;

interface LayoutProps {
	children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
	const navigate = useNavigate();
	const location = useLocation();
	const [collapsed, setCollapsed] = useState(false);
	const {
		token: { colorBgContainer, borderRadiusLG },
	} = theme.useToken();

	const menuItems = [
		{
			key: '/',
			icon: <HomeOutlined />,
			label: 'Home',
		},
		{
			key: '/users',
			icon: <UserOutlined />,
			label: 'Users',
		},
		{
			key: '/events',
			icon: <CalendarOutlined />,
			label: 'Events',
		},
	];

	const handleMenuClick = (key: string) => {
		navigate(key);
		// Auto-collapse on mobile after navigation
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
				style={{
					overflow: 'auto',
					height: '100vh',
					position: 'fixed',
					left: 0,
					top: 0,
					bottom: 0,
					zIndex: 999,
				}}
			>
				<div
					style={{
						height: '64px',
						margin: '16px',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						padding: '0 16px',
					}}
				>
					<Title level={4} style={{ color: 'white', margin: 0, whiteSpace: 'nowrap' }}>
						🎮 Jump Game
					</Title>
				</div>
				<Menu
					theme="dark"
					mode="inline"
					selectedKeys={[location.pathname]}
					items={menuItems}
					onClick={({ key }) => handleMenuClick(key)}
				/>
			</Sider>
			<AntLayout style={{ marginLeft: collapsed ? 0 : 200, transition: 'margin-left 0.2s' }}>
				<Header
					style={{
						padding: '0 24px',
						background: '#ffffff',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
						position: 'sticky',
						top: 0,
						zIndex: 998,
						borderBottom: '1px solid #e5e7eb',
					}}
				>
					<div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
						<Button
							type="text"
							icon={<MenuOutlined />}
							onClick={() => setCollapsed(!collapsed)}
							style={{ fontSize: '18px', color: '#9019F9' }}
						/>
						<Title
							level={3}
							style={{
								margin: 0,
								color: '#9019F9',
								fontWeight: 700,
							}}
						>
							Dashboard
						</Title>
					</div>
				</Header>
				<Content style={{ margin: '24px 16px', overflow: 'initial' }}>
					<div
						style={{
							padding: 24,
							background: colorBgContainer,
							borderRadius: borderRadiusLG,
							minHeight: 'calc(100vh - 112px)',
							boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
							border: '1px solid #e2e8f0',
						}}
					>
						{children}
					</div>
				</Content>
			</AntLayout>
		</AntLayout>
	);
};

