import {
	CheckCircleOutlined,
	CloseCircleOutlined,
	ExclamationCircleOutlined,
	LoadingOutlined,
} from '@ant-design/icons';
import type { AppRouter } from '@jcloud/bff/src/trpc/router';
import { useQueries } from '@tanstack/react-query';
import type { inferRouterOutputs } from '@trpc/server';
import { Card, Collapse, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo } from 'react';
import { trpc } from '../../utils/trpc';

const { Text } = Typography;
const { Panel } = Collapse;

type RouterOutput = inferRouterOutputs<AppRouter>;
type ServiceStatus = RouterOutput['kubernetes']['getServiceStatus'];
type PodInfo = NonNullable<ServiceStatus>['pods'][number];

interface ApplicationPodsProps {
	serviceIds: string[];
}

interface PodWithService extends PodInfo {
	serviceName: string;
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

export const ApplicationPods = ({ serviceIds }: ApplicationPodsProps) => {
	// Fetch status for all services in parallel using useQueries
	const utils = trpc.useUtils();
	const serviceStatusQueries = useQueries({
		queries: serviceIds.map(serviceId => ({
			queryKey: [['kubernetes', 'getServiceStatus'], { input: { serviceId }, type: 'query' }],
			queryFn: async () => {
				return await utils.kubernetes.getServiceStatus.fetch({ serviceId });
			},
			refetchInterval: 5000, // Refresh every 5 seconds
			retry: false,
		})),
	});

	const isLoading = serviceStatusQueries.some(query => query.isLoading);
	const hasError = serviceStatusQueries.some(query => query.isError);

	// Collect all pods with their service information
	const { allPods, serviceStatuses } = useMemo(() => {
		const pods: PodWithService[] = [];
		const statuses: Array<{ serviceId: string; serviceName: string; status: ServiceStatus | null }> = [];

		serviceStatusQueries.forEach((query, index) => {
			const serviceId = serviceIds[index];
			if (!serviceId) {
				return;
			}
			if (query.data) {
				statuses.push({
					serviceId,
					serviceName: query.data.serviceName,
					status: query.data,
				});
				if (query.data.pods) {
					query.data.pods.forEach((pod: PodInfo) => {
						pods.push({
							...pod,
							serviceName: query.data!.serviceName,
							serviceId,
						});
					});
				}
			} else if (!query.isLoading && !query.isError) {
				// Service exists but no status yet
				statuses.push({
					serviceId,
					serviceName: `Service ${serviceId.substring(0, 8)}...`,
					status: null,
				});
			}
		});

		return { allPods: pods, serviceStatuses: statuses };
	}, [serviceStatusQueries, serviceIds]);

	const columns: ColumnsType<PodWithService> = [
		{
			title: 'Service',
			dataIndex: 'serviceName',
			key: 'service',
			width: 150,
			render: (serviceName: string) => (
				<Text strong style={{ fontSize: 12 }}>
					{serviceName}
				</Text>
			),
		},
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
			render: (_: unknown, record: PodWithService) => (
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

	if (isLoading) {
		return (
			<Card title="Pods & Services Overview" loading>
				<Text type="secondary">Loading pod information...</Text>
			</Card>
		);
	}

	if (hasError && allPods.length === 0) {
		return (
			<Card title="Pods & Services Overview">
				<Space direction="vertical" style={{ width: '100%' }}>
					<Text type="secondary">
						Unable to fetch pod status. Services may not be deployed yet or cluster may not be configured.
					</Text>
				</Space>
			</Card>
		);
	}

	// Calculate totals
	const totalPods = allPods.length;
	const readyPods = allPods.filter(pod => pod.ready).length;
	const totalDesiredReplicas = serviceStatuses.reduce((sum, s) => sum + (s.status?.desiredReplicas ?? 0), 0);
	const totalReadyReplicas = serviceStatuses.reduce((sum, s) => sum + (s.status?.readyReplicas ?? 0), 0);

	return (
		<Card
			title="Pods & Services Overview"
			extra={
				<Space>
					<Text type="secondary" style={{ fontSize: 12 }}>
						Pods: {readyPods}/{totalPods} ready
					</Text>
					<Text type="secondary" style={{ fontSize: 12 }}>
						Replicas: {totalReadyReplicas}/{totalDesiredReplicas} ready
					</Text>
				</Space>
			}
		>
			{allPods.length === 0 ? (
				<Space direction="vertical" style={{ width: '100%' }}>
					<Text type="secondary">No pods found for any service.</Text>
					<Text type="secondary" style={{ fontSize: 12 }}>
						Services may not be deployed yet or deployments may have been removed.
					</Text>
				</Space>
			) : (
				<>
					<Table
						columns={columns}
						dataSource={allPods}
						rowKey={record => `${record.serviceId}-${record.name}`}
						pagination={false}
						size="small"
						loading={isLoading}
					/>
					{serviceStatuses.length > 0 && (
						<div style={{ marginTop: 16 }}>
							<Collapse size="small" ghost>
								<Panel header={`Service Details (${serviceStatuses.length})`} key="services">
									<Space direction="vertical" style={{ width: '100%' }} size="middle">
										{serviceStatuses.map(({ serviceId, serviceName, status }) => (
											<Card key={serviceId} size="small" title={serviceName}>
												{status ? (
													<Space direction="vertical" size="small">
														<Text>
															<strong>Deployment:</strong> {status.deploymentName}
														</Text>
														<Text>
															<strong>Replicas:</strong> {status.readyReplicas}/
															{status.desiredReplicas} ready
														</Text>
														<Text>
															<strong>Pods:</strong> {status.pods.length}
														</Text>
														{status.desiredReplicas > 0 &&
															status.readyReplicas < status.desiredReplicas && (
																<Tag
																	color="warning"
																	icon={<ExclamationCircleOutlined />}
																>
																	{status.desiredReplicas - status.readyReplicas} not
																	ready
																</Tag>
															)}
													</Space>
												) : (
													<Text type="secondary">No deployment information available</Text>
												)}
											</Card>
										))}
									</Space>
								</Panel>
							</Collapse>
						</div>
					)}
				</>
			)}
		</Card>
	);
};
