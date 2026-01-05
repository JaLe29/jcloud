import { Empty, Typography, Space, Card } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export const EventsPage = () => {
	return (
		<Space direction="vertical" size="large" style={{ width: '100%' }}>
			<div>
				<Title level={2} style={{ marginBottom: 8 }}>
					Events Management
				</Title>
				<Text type="secondary" style={{ fontSize: 15 }}>
					View and manage all game events
				</Text>
			</div>

			<Card
				bordered={false}
				style={{
					borderRadius: 12,
					minHeight: 400,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<Empty
					image={
						<div
							style={{
								width: 80,
								height: 80,
								borderRadius: '50%',
								background: '#f3f4f6',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								margin: '0 auto',
							}}
						>
							<CalendarOutlined style={{ fontSize: 48, color: '#9019F9' }} />
						</div>
					}
					description={
						<Space direction="vertical" size="small" style={{ marginTop: 16 }}>
							<Title level={4} style={{ margin: 0 }}>No events available yet</Title>
							<Text type="secondary" style={{ fontSize: 14 }}>
								Events will appear here when users start playing
							</Text>
						</Space>
					}
				/>
			</Card>
		</Space>
	);
};

