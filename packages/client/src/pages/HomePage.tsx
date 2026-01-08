import { AppstoreOutlined, CloudServerOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Col, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
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
			render: (text: string) => <Text strong>{text}</Text>,
		},
		{
			title: 'Namespace',
			dataIndex: 'namespace',
			key: 'namespace',
			render: (text: string) => <Tag>{text}</Tag>,
		},
		{
			title: 'Services',
			key: 'servicesCount',
			render: (_, record) => (
				<Text type={record._count.services > 0 ? undefined : 'secondary'}>{record._count.services}</Text>
			),
			width: 80,
			align: 'center',
		},
		{
			title: 'Created',
			dataIndex: 'createdAt',
			key: 'createdAt',
			render: (date: Date) => <Text type="secondary">{dayjs(date).format('DD.MM.YYYY')}</Text>,
		},
	];

	if (error) {
		return <Alert message="Error" description={error.message} type="error" showIcon />;
	}

	const totalServices = data?.applications?.reduce((sum, app) => sum + app._count.services, 0) || 0;

	return (
		<Space direction="vertical" size="large" style={{ width: '100%' }}>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'flex-start',
					flexWrap: 'wrap',
					gap: 16,
				}}
			>
				<div>
					<Title level={2} style={{ marginBottom: 4 }}>
						Dashboard
					</Title>
					<Text type="secondary">Overview of your applications and services</Text>
				</div>
				<Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/applications/new')}>
					New Application
				</Button>
			</div>

			<Row gutter={[16, 16]}>
				<Col xs={24} sm={12} lg={8}>
					<Card hoverable onClick={() => navigate('/applications')}>
						<Statistic
							title="Applications"
							value={data?.pagination?.total || 0}
							prefix={<AppstoreOutlined />}
						/>
					</Card>
				</Col>
				<Col xs={24} sm={12} lg={8}>
					<Card>
						<Statistic title="Services" value={totalServices} prefix={<CloudServerOutlined />} />
					</Card>
				</Col>
				<Col xs={24} sm={12} lg={8}>
					<Card>
						<Statistic
							title="Avg Services / App"
							value={data?.pagination?.total ? (totalServices / data.pagination.total).toFixed(1) : 0}
						/>
					</Card>
				</Col>
			</Row>

			<Card
				title="Recent Applications"
				extra={
					<Button type="link" onClick={() => navigate('/applications')}>
						View All
					</Button>
				}
			>
				<Table
					columns={columns}
					dataSource={data?.applications || []}
					loading={isLoading}
					rowKey="id"
					onRow={record => ({
						onClick: () => navigate(`/applications/${record.id}`),
						style: { cursor: 'pointer' },
					})}
					pagination={false}
					locale={{
						emptyText: (
							<Space direction="vertical" size="middle" style={{ padding: 40 }}>
								<AppstoreOutlined style={{ fontSize: 40, opacity: 0.3 }} />
								<Text type="secondary">No applications yet</Text>
								<Button
									type="primary"
									icon={<PlusOutlined />}
									onClick={e => {
										e.stopPropagation();
										navigate('/applications/new');
									}}
								>
									Create Application
								</Button>
							</Space>
						),
					}}
				/>
			</Card>
		</Space>
	);
};
