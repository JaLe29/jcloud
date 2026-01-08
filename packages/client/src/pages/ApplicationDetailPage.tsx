import { useNavigate, useParams } from 'react-router-dom';
import { Card, Typography, Space, Button, Table, Tag, Modal, message, Descriptions, Tooltip } from 'antd';
import {
	ArrowLeftOutlined,
	DeleteOutlined,
	EditOutlined,
	PlusOutlined,
	LinkOutlined,
	LockOutlined,
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
	envs?: Array<{ id: string }>;
	apiKey?: {
		id: string;
		deploys: Array<{ id: string; createdAt: Date }>;
	} | null;
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
			message.success('Application deleted');
			utils.application.list.invalidate();
			navigate('/applications');
		},
		onError: (error) => {
			message.error(error.message);
		},
	});

	const deleteServiceMutation = trpc.service.delete.useMutation({
		onSuccess: () => {
			message.success('Service deleted');
			utils.application.getById.invalidate({ id: id! });
		},
		onError: (error) => {
			message.error(error.message);
		},
	});

	const handleDeleteApplication = () => {
		Modal.confirm({
			title: 'Delete Application',
			content: 'This will also delete all services. This action cannot be undone.',
			okText: 'Delete',
			okType: 'danger',
			onOk: () => {
				if (id) deleteApplicationMutation.mutate({ id });
			},
		});
	};

	const handleDeleteService = (serviceId: string, serviceName: string) => {
		Modal.confirm({
			title: `Delete "${serviceName}"?`,
			okText: 'Delete',
			okType: 'danger',
			onOk: () => deleteServiceMutation.mutate({ id: serviceId }),
		});
	};

	const formatResources = (request: number | null, limit: number | null, unit: string) => {
		if (!request && !limit) return '-';
		return `${request ?? '-'} / ${limit ?? '-'} ${unit}`;
	};

	const serviceColumns: ColumnsType<ServiceData> = [
		{
			title: 'Name',
			dataIndex: 'name',
			key: 'name',
			render: (text: string, record) => (
				<Space direction="vertical" size={0}>
					<Text strong>{text}</Text>
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
			width: 80,
			align: 'center',
			render: (replicas: number) => <Tag>{replicas}</Tag>,
		},
		{
			title: 'CPU',
			key: 'cpu',
			width: 100,
			render: (_, record) => (
				<Tooltip title="Request / Limit">
					<Text type="secondary" style={{ fontSize: 12 }}>
						{formatResources(record.cpuRequest, record.cpuLimit, 'm')}
					</Text>
				</Tooltip>
			),
		},
		{
			title: 'Memory',
			key: 'memory',
			width: 100,
			render: (_, record) => (
				<Tooltip title="Request / Limit">
					<Text type="secondary" style={{ fontSize: 12 }}>
						{formatResources(record.memoryRequest, record.memoryLimit, 'MB')}
					</Text>
				</Tooltip>
			),
		},
		{
			title: 'Vars',
			key: 'envs',
			width: 80,
			align: 'center',
			render: (_, record) => {
				const count = record.envs?.length ?? 0;
				return count > 0 ? (
					<Tag icon={<LockOutlined />}>{count}</Tag>
				) : (
					<Text type="secondary">-</Text>
				);
			},
		},
		{
			title: 'Last Deploy',
			key: 'lastDeploy',
			width: 140,
			render: (_, record) => {
				const lastDeploy = record.apiKey?.deploys?.[0];
				return lastDeploy ? (
					<Text type="secondary">{dayjs(lastDeploy.createdAt).format('DD.MM.YYYY HH:mm')}</Text>
				) : (
					<Text type="secondary">Never</Text>
				);
			},
		},
		{
			title: '',
			key: 'actions',
			width: 80,
			render: (_, record) => (
				<Space>
					<Button
						type="text"
						size="small"
						icon={<EditOutlined />}
						onClick={(e) => {
							e.stopPropagation();
							navigate(`/applications/${id}/services/${record.id}/edit`);
						}}
					/>
					<Button
						type="text"
						size="small"
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
		const isNotFound = error.data?.code === 'NOT_FOUND';
		return (
			<Space direction="vertical" size="large" style={{ width: '100%' }}>
				<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/applications')}>
					Back
				</Button>
				<Card style={{ textAlign: 'center', padding: 40 }}>
					<Title level={4}>{isNotFound ? 'Application not found' : 'Error'}</Title>
					<Text type="secondary">{error.message}</Text>
				</Card>
			</Space>
		);
	}

	if (isLoading || !application) {
		return (
			<Space direction="vertical" size="large" style={{ width: '100%' }}>
				<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Back</Button>
				<Card loading />
			</Space>
		);
	}

	// Calculate total resources across all services
	const totalResources = application.services.reduce(
		(acc, service) => {
			// Multiply by replicas to get total resources
			const replicas = service.replicas || 1;
			acc.cpuRequest += (service.cpuRequest ?? 0) * replicas;
			acc.cpuLimit += (service.cpuLimit ?? 0) * replicas;
			acc.memoryRequest += (service.memoryRequest ?? 0) * replicas;
			acc.memoryLimit += (service.memoryLimit ?? 0) * replicas;
			return acc;
		},
		{ cpuRequest: 0, cpuLimit: 0, memoryRequest: 0, memoryLimit: 0 },
	);

	const hasResources = totalResources.cpuRequest > 0 || totalResources.cpuLimit > 0 || totalResources.memoryRequest > 0 || totalResources.memoryLimit > 0;

	return (
		<Space direction="vertical" size="large" style={{ width: '100%' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
				<Space wrap>
					<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/applications')}>
						Back
					</Button>
					<Title level={2} style={{ margin: 0 }}>{application.name}</Title>
					<Tag>{application.namespace}</Tag>
					{hasResources && (
						<>
							<Tooltip title="CPU Request / Limit">
								<Tag color="blue">
									CPU: {totalResources.cpuRequest > 0 ? totalResources.cpuRequest : '-'} / {totalResources.cpuLimit > 0 ? totalResources.cpuLimit : '-'} m
								</Tag>
							</Tooltip>
							<Tooltip title="Memory Request / Limit">
								<Tag color="green">
									Memory: {totalResources.memoryRequest > 0 ? totalResources.memoryRequest : '-'} / {totalResources.memoryLimit > 0 ? totalResources.memoryLimit : '-'} MB
								</Tag>
							</Tooltip>
						</>
					)}
				</Space>
				<Space>
					<Button icon={<EditOutlined />} onClick={() => navigate(`/applications/${id}/edit`)}>
						Edit
					</Button>
					<Button
						danger
						icon={<DeleteOutlined />}
						onClick={handleDeleteApplication}
						loading={deleteApplicationMutation.isPending}
					>
						Delete
					</Button>
				</Space>
			</div>

			<Card>
				<Descriptions column={{ xs: 1, sm: 2, md: 4 }}>
					<Descriptions.Item label="Namespace">{application.namespace}</Descriptions.Item>
					<Descriptions.Item label="Services">{application._count.services}</Descriptions.Item>
					<Descriptions.Item label="Created">{dayjs(application.createdAt).format('DD.MM.YYYY HH:mm')}</Descriptions.Item>
					<Descriptions.Item label="Updated">{dayjs(application.updatedAt).format('DD.MM.YYYY HH:mm')}</Descriptions.Item>
				</Descriptions>
			</Card>

			<Card
				title={`Services (${application.services.length})`}
				extra={
					<Button
						type="primary"
						icon={<PlusOutlined />}
						onClick={() => navigate(`/applications/${id}/services/new`)}
					>
						Add Service
					</Button>
				}
			>
				<Table
					columns={serviceColumns}
					dataSource={application.services}
					rowKey="id"
					pagination={false}
					scroll={{ x: 700 }}
					onRow={(record) => ({
						onClick: () => navigate(`/applications/${id}/services/${record.id}`),
						style: { cursor: 'pointer' },
					})}
					locale={{
						emptyText: (
							<Space direction="vertical" size="middle" style={{ padding: 40 }}>
								<Text type="secondary">No services yet</Text>
								<Button
									type="primary"
									icon={<PlusOutlined />}
									onClick={() => navigate(`/applications/${id}/services/new`)}
								>
									Add Service
								</Button>
							</Space>
						),
					}}
				/>
			</Card>
		</Space>
	);
};
