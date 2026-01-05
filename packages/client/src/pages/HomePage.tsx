import { Table, Typography, Space, Alert, Card, Row, Col, Statistic } from 'antd';
import { UserOutlined, CalendarOutlined, RiseOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../utils/trpc';

const { Title, Text } = Typography;

interface UserData {
	id: string;
	userPublicId: string;
	createdAt: Date;
	_count: {
		events: number;
	};
}

export const HomePage = () => {
	const navigate = useNavigate();
	const { data, isLoading, error } = trpc.user.list.useQuery(undefined);

	const columns: ColumnsType<UserData> = [
		{
			title: 'ID',
			dataIndex: 'id',
			key: 'id',
			width: 100,
			render: (text: string) => (
				<Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>
					{text.substring(0, 8)}...
				</Text>
			),
		},
		{
			title: 'Public ID',
			dataIndex: 'userPublicId',
			key: 'userPublicId',
			render: (text: string) => (
				<Text strong style={{ color: '#9019F9' }}>
					{text}
				</Text>
			),
		},
		{
			title: 'Created At',
			dataIndex: 'createdAt',
			key: 'createdAt',
			render: (date: Date) => dayjs(date).format('DD.MM.YYYY HH:mm:ss'),
		},
		{
			title: 'Events Count',
			key: 'eventsCount',
			render: (_, record) => (
				<Text strong style={{ color: record._count.events > 0 ? '#9019F9' : '#94a3b8' }}>
					{record._count.events}
				</Text>
			),
			width: 120,
			align: 'center',
		},
	];

	if (error) {
		return (
			<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				<Alert message="Error" description={error.message} type="error" showIcon />
			</div>
		);
	}

	const totalEvents = data?.users?.reduce((sum, user) => sum + user._count.events, 0) || 0;

	return (
		<Space direction="vertical" size="large" style={{ width: '100%' }}>
			<div>
				<Title level={2} style={{ marginBottom: 8 }}>
					Welcome to Jump Game
				</Title>
				<Text type="secondary" style={{ fontSize: 15 }}>
					Manage your users and events in one place
				</Text>
			</div>

			<Row gutter={[16, 16]}>
				<Col xs={24} sm={12} lg={8}>
					<Card
						bordered={false}
						style={{
							borderRadius: 12,
							border: '1px solid #f3f4f6',
						}}
					>
						<Statistic
							title="Total Users"
							value={data?.pagination?.total || 0}
							prefix={<UserOutlined style={{ color: '#9019F9' }} />}
							valueStyle={{ color: '#1f2937' }}
						/>
					</Card>
				</Col>
				<Col xs={24} sm={12} lg={8}>
					<Card
						bordered={false}
						style={{
							borderRadius: 12,
							border: '1px solid #f3f4f6',
						}}
					>
						<Statistic
							title="Total Events"
							value={totalEvents}
							prefix={<CalendarOutlined style={{ color: '#9019F9' }} />}
							valueStyle={{ color: '#1f2937' }}
						/>
					</Card>
				</Col>
				<Col xs={24} sm={12} lg={8}>
					<Card
						bordered={false}
						style={{
							borderRadius: 12,
							border: '1px solid #f3f4f6',
						}}
					>
						<Statistic
							title="Active Rate"
							value={data?.pagination?.total ? ((totalEvents / data.pagination.total) * 100).toFixed(1) : 0}
							suffix="%"
							prefix={<RiseOutlined style={{ color: '#9019F9' }} />}
							valueStyle={{ color: '#1f2937' }}
						/>
					</Card>
				</Col>
			</Row>

			<Card
				title={
					<div>
						<Title level={3} style={{ margin: 0, marginBottom: 4 }}>Recent Users</Title>
						{data?.pagination && (
							<Text type="secondary">
								Total: {data.pagination.total} | Page: {data.pagination.page} / {data.pagination.totalPages}
							</Text>
						)}
					</div>
				}
				bordered={false}
				style={{ borderRadius: 12 }}
			>
				<Table
					columns={columns}
					dataSource={data?.users || []}
					loading={isLoading}
					rowKey="id"
					onRow={(record) => ({
						onClick: () => navigate(`/users/${record.id}`),
						style: { cursor: 'pointer' },
					})}
					pagination={{
						total: data?.pagination?.total || 0,
						current: data?.pagination?.page || 1,
						pageSize: 10,
						showSizeChanger: false,
					}}
				/>
			</Card>
		</Space>
	);
};

