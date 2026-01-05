import { Typography, Space, Alert, Card, Row, Col, Statistic, Button, Table, Tag } from 'antd';
import { CloudServerOutlined, AppstoreOutlined, PlusOutlined, RocketOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../utils/trpc';

const { Title, Text } = Typography;

interface ApplicationData {
	id: string;
	name: string;
	namespace: string;
	createdAt: Date;
	_count: {
		services: number;
	};
}

export const HomePage = () => {
	const navigate = useNavigate();
	const { data, isLoading, error } = trpc.application.list.useQuery({ limit: 5 });

	const columns: ColumnsType<ApplicationData> = [
		{
			title: 'Name',
			dataIndex: 'name',
			key: 'name',
			render: (text: string) => (
				<Text strong style={{ color: '#0ea5e9' }}>
					{text}
				</Text>
			),
		},
		{
			title: 'Namespace',
			dataIndex: 'namespace',
			key: 'namespace',
			render: (text: string) => <Tag color="blue">{text}</Tag>,
		},
		{
			title: 'Services',
			key: 'servicesCount',
			render: (_, record) => (
				<Text strong style={{ color: record._count.services > 0 ? '#10b981' : '#94a3b8' }}>
					{record._count.services}
				</Text>
			),
			width: 80,
			align: 'center',
		},
		{
			title: 'Created',
			dataIndex: 'createdAt',
			key: 'createdAt',
			render: (date: Date) => (
				<Text type="secondary" style={{ fontSize: 13 }}>
					{dayjs(date).format('DD.MM.YYYY')}
				</Text>
			),
		},
	];

	if (error) {
		return (
			<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				<Alert message="Error" description={error.message} type="error" showIcon />
			</div>
		);
	}

	const totalServices = data?.applications?.reduce((sum, app) => sum + app._count.services, 0) || 0;

	return (
		<Space direction="vertical" size="large" style={{ width: '100%' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
				<div>
					<Title level={2} style={{ marginBottom: 8 }}>
						<RocketOutlined style={{ marginRight: 12, color: '#0ea5e9' }} />
						JCloud Dashboard
					</Title>
					<Text type="secondary" style={{ fontSize: 15 }}>
						Manage your Kubernetes applications and services
					</Text>
				</div>
				<Button
					type="primary"
					icon={<PlusOutlined />}
					size="large"
					onClick={() => navigate('/applications/new')}
				>
					New Application
				</Button>
			</div>

			<Row gutter={[16, 16]}>
				<Col xs={24} sm={12} lg={8}>
					<Card
						bordered={false}
						style={{
							borderRadius: 12,
							background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
							border: '1px solid #bae6fd',
						}}
						hoverable
						onClick={() => navigate('/applications')}
					>
						<Statistic
							title={<Text style={{ color: '#0369a1' }}>Total Applications</Text>}
							value={data?.pagination?.total || 0}
							prefix={<AppstoreOutlined style={{ color: '#0ea5e9' }} />}
							valueStyle={{ color: '#0284c7' }}
						/>
					</Card>
				</Col>
				<Col xs={24} sm={12} lg={8}>
					<Card
						bordered={false}
						style={{
							borderRadius: 12,
							background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
							border: '1px solid #86efac',
						}}
					>
						<Statistic
							title={<Text style={{ color: '#166534' }}>Total Services</Text>}
							value={totalServices}
							prefix={<CloudServerOutlined style={{ color: '#10b981' }} />}
							valueStyle={{ color: '#16a34a' }}
						/>
					</Card>
				</Col>
				<Col xs={24} sm={12} lg={8}>
					<Card
						bordered={false}
						style={{
							borderRadius: 12,
							background: 'linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)',
							border: '1px solid #e879f9',
						}}
					>
						<Statistic
							title={<Text style={{ color: '#86198f' }}>Avg Services per App</Text>}
							value={data?.pagination?.total ? (totalServices / data.pagination.total).toFixed(1) : 0}
							valueStyle={{ color: '#a21caf' }}
						/>
					</Card>
				</Col>
			</Row>

			<Card
				title={
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<Space>
							<AppstoreOutlined style={{ color: '#0ea5e9' }} />
							<span>Recent Applications</span>
						</Space>
						<Button type="link" onClick={() => navigate('/applications')}>
							View All →
						</Button>
					</div>
				}
				bordered={false}
				style={{ borderRadius: 12 }}
			>
				<Table
					columns={columns}
					dataSource={data?.applications || []}
					loading={isLoading}
					rowKey="id"
					onRow={(record) => ({
						onClick: () => navigate(`/applications/${record.id}`),
						style: { cursor: 'pointer' },
					})}
					pagination={false}
					locale={{
						emptyText: (
							<Space direction="vertical" size="middle" style={{ padding: 40 }}>
								<AppstoreOutlined style={{ fontSize: 48, color: '#d1d5db' }} />
								<Text type="secondary">No applications yet</Text>
								<Button
									type="primary"
									icon={<PlusOutlined />}
									onClick={(e) => {
										e.stopPropagation();
										navigate('/applications/new');
									}}
								>
									Create Your First Application
								</Button>
							</Space>
						),
					}}
				/>
			</Card>
		</Space>
	);
};
