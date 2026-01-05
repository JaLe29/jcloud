import { useNavigate, useParams } from 'react-router-dom';
import { Card, Typography, Space, Button, Table, Tag, Modal, message, Tooltip } from 'antd';
import {
	ArrowLeftOutlined,
	DeleteOutlined,
	EditOutlined,
	PlusOutlined,
	CloudServerOutlined,
	AppstoreOutlined,
	LinkOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { trpc } from '../utils/trpc';

const { Title, Text } = Typography;

interface ServiceData {
	id: string;
	name: string;
	replicas: number;
	ingressUrl: string | null;
	cpuRequest: number | null;
	cpuLimit: number | null;
	memoryRequest: number | null;
	memoryLimit: number | null;
	createdAt: Date;
}

export const ApplicationDetailPage = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const utils = trpc.useUtils();

	const { data: application, isLoading, error } = trpc.application.getById.useQuery(
		{ id: id! },
		{
			enabled: !!id,
			retry: false,
		},
	);

	const deleteApplicationMutation = trpc.application.delete.useMutation({
		onSuccess: () => {
			message.success('Application deleted successfully');
			utils.application.list.invalidate();
			navigate('/applications');
		},
		onError: (error) => {
			message.error(`Failed to delete application: ${error.message}`);
		},
	});

	const deleteServiceMutation = trpc.service.delete.useMutation({
		onSuccess: () => {
			message.success('Service deleted successfully');
			utils.application.getById.invalidate({ id: id! });
		},
		onError: (error) => {
			message.error(`Failed to delete service: ${error.message}`);
		},
	});

	const handleDeleteApplication = () => {
		Modal.confirm({
			title: 'Are you sure you want to delete this application?',
			content: 'This action cannot be undone. All services in this application will also be deleted.',
			okText: 'Delete',
			okType: 'danger',
			cancelText: 'Cancel',
			onOk: () => {
				if (id) {
					deleteApplicationMutation.mutate({ id });
				}
			},
		});
	};

	const handleDeleteService = (serviceId: string, serviceName: string) => {
		Modal.confirm({
			title: `Delete service "${serviceName}"?`,
			content: 'This action cannot be undone.',
			okText: 'Delete',
			okType: 'danger',
			cancelText: 'Cancel',
			onOk: () => {
				deleteServiceMutation.mutate({ id: serviceId });
			},
		});
	};

	const formatResources = (request: number | null, limit: number | null, unit: string) => {
		if (!request && !limit) return <Text type="secondary">-</Text>;
		return (
			<Text style={{ fontSize: 12 }}>
				{request ?? '-'} / {limit ?? '-'} {unit}
			</Text>
		);
	};

	const serviceColumns: ColumnsType<ServiceData> = [
		{
			title: 'Name',
			dataIndex: 'name',
			key: 'name',
			render: (text: string, record) => (
				<Space direction="vertical" size={0}>
					<Text strong style={{ color: '#10b981' }}>
						{text}
					</Text>
					{record.ingressUrl && (
						<a
							href={record.ingressUrl}
							target="_blank"
							rel="noopener noreferrer"
							onClick={(e) => e.stopPropagation()}
							style={{ fontSize: 12 }}
						>
							<LinkOutlined /> {record.ingressUrl}
						</a>
					)}
				</Space>
			),
		},
		{
			title: 'Replicas',
			dataIndex: 'replicas',
			key: 'replicas',
			width: 90,
			align: 'center',
			render: (replicas: number) => (
				<Tag color={replicas > 0 ? 'blue' : 'default'}>{replicas}</Tag>
			),
		},
		{
			title: 'CPU',
			key: 'cpu',
			width: 120,
			render: (_, record) => (
				<Tooltip title="Request / Limit (millicores)">
					{formatResources(record.cpuRequest, record.cpuLimit, 'm')}
				</Tooltip>
			),
		},
		{
			title: 'Memory',
			key: 'memory',
			width: 120,
			render: (_, record) => (
				<Tooltip title="Request / Limit (MB)">
					{formatResources(record.memoryRequest, record.memoryLimit, 'MB')}
				</Tooltip>
			),
		},
		{
			title: 'Created',
			dataIndex: 'createdAt',
			key: 'createdAt',
			width: 140,
			render: (date: Date) => dayjs(date).format('DD.MM.YYYY HH:mm'),
		},
		{
			title: 'Actions',
			key: 'actions',
			width: 100,
			render: (_, record) => (
				<Space>
					<Button
						type="text"
						icon={<EditOutlined />}
						onClick={(e) => {
							e.stopPropagation();
							navigate(`/applications/${id}/services/${record.id}/edit`);
						}}
					/>
					<Button
						type="text"
						danger
						icon={<DeleteOutlined />}
						onClick={(e) => {
							e.stopPropagation();
							handleDeleteService(record.id, record.name);
						}}
					/>
				</Space>
			),
		},
	];

	if (error) {
		const isNotFound = error.data?.code === 'NOT_FOUND' || error.message.includes('NOT_FOUND');
		return (
			<Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
				<Card
					bordered={false}
					style={{
						borderRadius: 12,
						padding: '40px 20px',
						textAlign: 'center',
					}}
				>
					<Space direction="vertical" size="large" style={{ width: '100%' }}>
						<div style={{ fontSize: 72, opacity: 0.3 }}>
							{isNotFound ? '🔍' : '⚠️'}
						</div>
						<div>
							<Title level={2} style={{ marginBottom: 8 }}>
								{isNotFound ? 'Application Not Found' : 'Error'}
							</Title>
							<Text type="secondary" style={{ fontSize: 16 }}>
								{isNotFound
									? 'The application you are looking for does not exist or has been deleted.'
									: error.message}
							</Text>
						</div>
						<Space>
							<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
								Go Back
							</Button>
							<Button type="primary" onClick={() => navigate('/applications')}>
								View All Applications
							</Button>
						</Space>
					</Space>
				</Card>
			</Space>
		);
	}

	if (isLoading || !application) {
		return (
			<Space direction="vertical" size="large" style={{ width: '100%' }}>
				<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
					Back
				</Button>
				<Card loading={true} />
			</Space>
		);
	}

	return (
		<Space direction="vertical" size="large" style={{ width: '100%' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
				<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/applications')}>
					Back to Applications
				</Button>
				<Space>
					<Button
						icon={<EditOutlined />}
						onClick={() => navigate(`/applications/${id}/edit`)}
					>
						Edit Application
					</Button>
					<Button
						danger
						icon={<DeleteOutlined />}
						onClick={handleDeleteApplication}
						loading={deleteApplicationMutation.isPending}
					>
						Delete Application
					</Button>
				</Space>
			</div>

			<Card
				bordered={false}
				style={{
					borderRadius: 12,
					background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
				}}
			>
				<Space direction="vertical" size="middle" style={{ width: '100%' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
						<AppstoreOutlined style={{ fontSize: 32, color: '#0ea5e9' }} />
						<div>
							<Text type="secondary" style={{ fontSize: 13 }}>Application Name</Text>
							<Title level={2} style={{ margin: '4px 0', color: '#0ea5e9' }}>
								{application.name}
							</Title>
						</div>
					</div>

					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
							gap: 20,
						}}
					>
						<div
							style={{
								padding: 16,
								background: 'white',
								borderRadius: 8,
								border: '1px solid #e0f2fe',
							}}
						>
							<Text type="secondary" style={{ fontSize: 12 }}>Namespace</Text>
							<div style={{ marginTop: 4 }}>
								<Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
									{application.namespace}
								</Tag>
							</div>
						</div>

						<div
							style={{
								padding: 16,
								background: 'white',
								borderRadius: 8,
								border: '1px solid #e0f2fe',
							}}
						>
							<Text type="secondary" style={{ fontSize: 12 }}>Services</Text>
							<div style={{ fontSize: 28, fontWeight: 600, marginTop: 4, color: '#10b981' }}>
								{application._count.services}
							</div>
						</div>

						<div
							style={{
								padding: 16,
								background: 'white',
								borderRadius: 8,
								border: '1px solid #e0f2fe',
							}}
						>
							<Text type="secondary" style={{ fontSize: 12 }}>Created</Text>
							<div style={{ fontSize: 14, fontWeight: 500, marginTop: 8 }}>
								{dayjs(application.createdAt).format('DD.MM.YYYY HH:mm:ss')}
							</div>
						</div>

						<div
							style={{
								padding: 16,
								background: 'white',
								borderRadius: 8,
								border: '1px solid #e0f2fe',
							}}
						>
							<Text type="secondary" style={{ fontSize: 12 }}>Updated</Text>
							<div style={{ fontSize: 14, fontWeight: 500, marginTop: 8 }}>
								{dayjs(application.updatedAt).format('DD.MM.YYYY HH:mm:ss')}
							</div>
						</div>
					</div>
				</Space>
			</Card>

			<Card
				title={
					<Space style={{ width: '100%', justifyContent: 'space-between' }}>
						<Space>
							<CloudServerOutlined style={{ color: '#10b981' }} />
							<span>Services ({application.services.length})</span>
						</Space>
						<Button
							type="primary"
							icon={<PlusOutlined />}
							onClick={() => navigate(`/applications/${id}/services/new`)}
							style={{ background: '#10b981', borderColor: '#10b981' }}
						>
							Add Service
						</Button>
					</Space>
				}
				bordered={false}
				style={{ borderRadius: 12 }}
			>
				<Table
					columns={serviceColumns}
					dataSource={application.services}
					rowKey="id"
					pagination={false}
					scroll={{ x: 800 }}
					locale={{
						emptyText: (
							<Space direction="vertical" size="small" style={{ padding: 40 }}>
								<CloudServerOutlined style={{ fontSize: 48, color: '#d1d5db' }} />
								<Text type="secondary">No services in this application yet</Text>
								<Button
									type="primary"
									icon={<PlusOutlined />}
									onClick={() => navigate(`/applications/${id}/services/new`)}
									style={{ background: '#10b981', borderColor: '#10b981' }}
								>
									Add First Service
								</Button>
							</Space>
						),
					}}
				/>
			</Card>
		</Space>
	);
};
