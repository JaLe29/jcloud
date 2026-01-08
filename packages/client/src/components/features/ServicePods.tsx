import {
	CheckCircleOutlined,
	CloseCircleOutlined,
	ExclamationCircleOutlined,
	LoadingOutlined,
} from '@ant-design/icons';
import type { AppRouter } from '@jcloud/bff/src/trpc/router';
import type { inferRouterOutputs } from '@trpc/server';
import { Card, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { trpc } from '../../utils/trpc';

const { Text } = Typography;

type RouterOutput = inferRouterOutputs<AppRouter>;
type ServiceStatus = RouterOutput['kubernetes']['getServiceStatus'];
type PodInfo = NonNullable<ServiceStatus>['pods'][number];

interface ServicePodsProps {
	serviceId: string;
}

const getPodStatusColor = (status: string, ready: boolean): string => {
	if (ready && status === 'Running') {
		return 'success';
	}
	if (status === 'Pending') {
		return 'default';
	}
	if (status === 'Failed' || status.includes('Error')) {
		return 'error';
	}
	if (status.includes('CrashLoop') || status.includes('ImagePull')) {
		return 'error';
	}
	return 'warning';
};

const getPodStatusIcon = (status: string, ready: boolean): React.ReactNode => {
	if (ready && status === 'Running') {
		return <CheckCircleOutlined />;
	}
	if (status === 'Pending') {
		return <LoadingOutlined />;
	}
	if (status === 'Failed' || status.includes('Error') || status.includes('CrashLoop')) {
		return <CloseCircleOutlined />;
	}
	return <ExclamationCircleOutlined />;
};

export const ServicePods = ({ serviceId }: ServicePodsProps) => {
	const { data, isLoading, error } = trpc.kubernetes.getServiceStatus.useQuery(
		{ serviceId },
		{
			refetchInterval: 5000, // Refresh every 5 seconds
			retry: false,
		},
	);

	if (error) {
		const isNotFound = error.data?.code === 'NOT_FOUND';
		const isInternalError = error.data?.code === 'INTERNAL_SERVER_ERROR';

		if (isNotFound || isInternalError) {
			return (
				<Card title="Pods Status" size="small">
					<Space direction="vertical" style={{ width: '100%' }}>
						<Text type="secondary">
							{isNotFound
								? 'Service not found or cluster not configured'
								: 'Unable to fetch pod status. The service may not be deployed yet.'}
						</Text>
					</Space>
				</Card>
			);
		}

		return (
			<Card title="Pods Status" size="small">
				<Text type="danger">Error: {error.message}</Text>
			</Card>
		);
	}

	if (isLoading || !data) {
		return (
			<Card title="Pods Status" size="small" loading>
				<Text type="secondary">Loading pod information...</Text>
			</Card>
		);
	}

	const columns: ColumnsType<PodInfo> = [
		{
			title: 'Name',
			dataIndex: 'name',
			key: 'name',
			render: (name: string) => (
				<Text code style={{ fontSize: 12 }}>
					{name}
				</Text>
			),
		},
		{
			title: 'Status',
			key: 'status',
			width: 150,
			render: (_: unknown, record: PodInfo) => (
				<Tag
					color={getPodStatusColor(record.status, record.ready)}
					icon={getPodStatusIcon(record.status, record.ready)}
				>
					{record.status}
				</Tag>
			),
		},
		{
			title: 'Ready',
			dataIndex: 'ready',
			key: 'ready',
			width: 80,
			align: 'center',
			render: (ready: boolean) => <Tag color={ready ? 'success' : 'default'}>{ready ? 'Yes' : 'No'}</Tag>,
		},
		{
			title: 'Restarts',
			dataIndex: 'restarts',
			key: 'restarts',
			width: 100,
			align: 'center',
			render: (restarts: number) => <Text type={restarts > 0 ? 'warning' : undefined}>{restarts}</Text>,
		},
		{
			title: 'Age',
			dataIndex: 'age',
			key: 'age',
			width: 80,
		},
		{
			title: 'Node',
			dataIndex: 'nodeName',
			key: 'nodeName',
			ellipsis: true,
			render: (nodeName?: string) => (
				<Text type="secondary" style={{ fontSize: 12 }}>
					{nodeName || '-'}
				</Text>
			),
		},
		{
			title: 'Image',
			dataIndex: 'image',
			key: 'image',
			ellipsis: true,
			render: (image?: string) => (
				<Text code style={{ fontSize: 11 }}>
					{image || '-'}
				</Text>
			),
		},
	];

	const replicasInfo = `${data.readyReplicas}/${data.desiredReplicas} ready`;

	return (
		<Card
			title="Pods Status"
			size="small"
			extra={
				<Space>
					<Text type="secondary" style={{ fontSize: 12 }}>
						Replicas: {replicasInfo}
					</Text>
					{data.desiredReplicas > 0 && data.readyReplicas < data.desiredReplicas && (
						<Tag color="warning" icon={<ExclamationCircleOutlined />}>
							{data.desiredReplicas - data.readyReplicas} not ready
						</Tag>
					)}
				</Space>
			}
		>
			{data.pods.length === 0 ? (
				<Space direction="vertical" style={{ width: '100%' }}>
					<Text type="secondary">No pods found for this service.</Text>
					<Text type="secondary" style={{ fontSize: 12 }}>
						The service may not be deployed yet or the deployment may have been removed.
					</Text>
				</Space>
			) : (
				<Table
					columns={columns}
					dataSource={data.pods}
					rowKey="name"
					pagination={false}
					size="small"
					loading={isLoading}
				/>
			)}
		</Card>
	);
};
