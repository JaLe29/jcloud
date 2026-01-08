import type { AppRouter } from '@jcloud/bff/src/trpc/router';
import type { inferRouterOutputs } from '@trpc/server';
import { Card, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useState } from 'react';
import { trpc } from '../utils/trpc';

const { Title, Text } = Typography;

type RouterOutput = inferRouterOutputs<AppRouter>;
type DeploymentData = RouterOutput['deployment']['list']['deployments'][number];

export const DeploymentsPage = () => {
	const [page, setPage] = useState(1);

	const { data, isLoading } = trpc.deployment.list.useQuery({
		page,
		limit: 20,
		sortBy: 'createdAt',
		sortOrder: 'desc',
	});

	const columns: ColumnsType<DeploymentData> = [
		{
			title: 'Image',
			dataIndex: 'image',
			key: 'image',
			ellipsis: true,
			render: (image: string) => (
				<Text code style={{ fontSize: 12 }}>
					{image}
				</Text>
			),
		},
		{
			title: 'Service',
			key: 'service',
			width: 200,
			render: (_: unknown, record: DeploymentData) => (
				<Space direction="vertical" size={0}>
					<Text>{record.service.name}</Text>
					<Text type="secondary" style={{ fontSize: 12 }}>
						{record.service.application.name}
					</Text>
				</Space>
			),
		},
		{
			title: 'Created',
			dataIndex: 'createdAt',
			key: 'createdAt',
			width: 160,
			render: (date: Date) => <Text style={{ fontSize: 12 }}>{dayjs(date).format('DD.MM.YYYY HH:mm:ss')}</Text>,
		},
	];

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
					Deployments
				</Title>
			</div>

			<Card>
				<Table
					columns={columns}
					dataSource={data?.deployments || []}
					loading={isLoading}
					rowKey="id"
					pagination={{
						current: page,
						total: data?.pagination?.total || 0,
						pageSize: 20,
						showSizeChanger: false,
						showTotal: total => `${total} deployment${total !== 1 ? 's' : ''}`,
						onChange: setPage,
					}}
					locale={{
						emptyText: (
							<Space direction="vertical" style={{ padding: 40 }}>
								<Text type="secondary">No deployments yet</Text>
							</Space>
						),
					}}
				/>
			</Card>
		</Space>
	);
};
