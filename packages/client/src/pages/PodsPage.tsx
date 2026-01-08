import {
	CheckCircleOutlined,
	CloseCircleOutlined,
	ExclamationCircleOutlined,
	LoadingOutlined,
} from '@ant-design/icons';
import type { AppRouter } from '@jcloud/bff/src/trpc/router';
import type { inferRouterOutputs } from '@trpc/server';
import { Card, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../utils/trpc';

const { Title, Text } = Typography;

type RouterOutput = inferRouterOutputs<AppRouter>;
type ServiceStatus = RouterOutput['kubernetes']['getServiceStatus'];
type PodInfo = NonNullable<ServiceStatus>['pods'][number];

interface PodWithService extends PodInfo {
	serviceName: string;
	serviceId: string;
	applicationName: string;
	applicationId: string;
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

export const PodsPage = () => {
	const navigate = useNavigate();
	const [applicationFilter, setApplicationFilter] = useState<string | undefined>();
	const [serviceFilter, setServiceFilter] = useState<string | undefined>();

	const { data: applicationsData } = trpc.application.list.useQuery({ limit: 100 });

	// Get all services for selected application or all services
	const serviceIds = useMemo(() => {
		if (!applicationsData) {
			return [];
		}

		if (serviceFilter) {
			return [serviceFilter];
		}

		if (applicationFilter) {
			const app = applicationsData.applications.find(a => a.id === applicationFilter);
			return app?.services.map(s => s.id) || [];
		}

		// All services from all applications
		return applicationsData.applications.flatMap(app => app.services.map(s => s.id));
	}, [applicationsData, applicationFilter, serviceFilter]);

	// Fetch status for all services in parallel
	const serviceStatusQueries = serviceIds.map(serviceId =>
		trpc.kubernetes.getServiceStatus.useQuery(
			{ serviceId },
			{
				refetchInterval: 5000, // Refresh every 5 seconds
				retry: false,
			},
		),
	);

	const isLoading = serviceStatusQueries.some(query => query.isLoading);

	// Collect all pods with their service and application information
	const allPods: PodWithService[] = [];

	serviceStatusQueries.forEach((query, index) => {
		const serviceId = serviceIds[index];
		if (!serviceId || !query.data) {
			return;
		}

		// Find application and service info
		const app = applicationsData?.applications.find(a =>
			a.services.some(s => s.id === serviceId),
		);
		const service = app?.services.find(s => s.id === serviceId);

		query.data.pods.forEach(pod => {
			allPods.push({
				...pod,
				serviceName: query.data!.serviceName,
				serviceId,
				applicationName: app?.name || 'Unknown',
				applicationId: app?.id || '',
			});
		});
	});

	// Build application options
	const applicationOptions = useMemo(
		() =>
			applicationsData?.applications.map(app => ({
				label: app.name,
				value: app.id,
			})) || [],
		[applicationsData],
	);

	// Build service options - all services or filtered by selected application
	const serviceOptions = useMemo(() => {
		if (!applicationsData) {
			return [];
		}

		const apps = applicationFilter
			? applicationsData.applications.filter(app => app.id === applicationFilter)
			: applicationsData.applications;

		return apps.flatMap(app =>
			app.services.map(service => ({
				label: `${app.name} / ${service.name}`,
				value: service.id,
			})),
		);
	}, [applicationsData, applicationFilter]);

	// Reset service filter when application filter changes
	const handleApplicationFilterChange = (value: string | undefined) => {
		setApplicationFilter(value);
		if (value && serviceFilter) {
			// Check if current service filter is still valid
			const app = applicationsData?.applications.find(a => a.id === value);
			const serviceExists = app?.services.some(s => s.id === serviceFilter);
			if (!serviceExists) {
				setServiceFilter(undefined);
			}
		}
	};

	const columns: ColumnsType<PodWithService> = [
		{
			title: 'Application',
			dataIndex: 'applicationName',
			key: 'application',
			width: 150,
			render: (applicationName: string, record) => (
				<Text
					strong
					style={{ fontSize: 12, cursor: 'pointer' }}
					onClick={() => navigate(`/applications/${record.applicationId}`)}
				>
					{applicationName}
				</Text>
			),
		},
		{
			title: 'Service',
			dataIndex: 'serviceName',
			key: 'service',
			width: 150,
			render: (serviceName: string, record) => (
				<Text
					strong
					style={{ fontSize: 12, cursor: 'pointer' }}
					onClick={() => navigate(`/applications/${record.applicationId}/services/${record.serviceId}`)}
				>
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

	// Calculate totals
	const totalPods = allPods.length;
	const readyPods = allPods.filter(pod => pod.ready).length;

	return (
		<Space direction="vertical" size="large" style={{ width: '100%' }}>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					flexWrap: 'wrap',
					gap: 16,
				}}
			>
				<Title level={2} style={{ margin: 0 }}>
					Pods
				</Title>
			</div>

			<Card>
				<Space direction="vertical" size="middle" style={{ width: '100%' }}>
					<Space wrap>
						<Select
							placeholder="Filter by Application"
							allowClear
							style={{ width: 200 }}
							value={applicationFilter}
							onChange={handleApplicationFilterChange}
							options={applicationOptions}
						/>
						<Select
							placeholder="Filter by Service"
							allowClear
							style={{ width: 250 }}
							value={serviceFilter}
							onChange={setServiceFilter}
							options={serviceOptions}
							disabled={!applicationsData}
						/>
					</Space>

					<Table
						columns={columns}
						dataSource={allPods}
						rowKey={record => `${record.serviceId}-${record.name}`}
						pagination={false}
						size="small"
						loading={isLoading}
						locale={{
							emptyText: (
								<Space direction="vertical" style={{ padding: 40 }}>
									<Text type="secondary">No pods found</Text>
									<Text type="secondary" style={{ fontSize: 12 }}>
										{applicationFilter || serviceFilter
											? 'Try adjusting your filters'
											: 'Services may not be deployed yet or deployments may have been removed.'}
									</Text>
								</Space>
							),
						}}
						summary={() => (
							<Table.Summary fixed>
								<Table.Summary.Row>
									<Table.Summary.Cell index={0} colSpan={3}>
										<Text strong>
											Total: {totalPods} pod{totalPods !== 1 ? 's' : ''} ({readyPods} ready)
										</Text>
									</Table.Summary.Cell>
								</Table.Summary.Row>
							</Table.Summary>
						)}
					/>
				</Space>
			</Card>
		</Space>
	);
};

