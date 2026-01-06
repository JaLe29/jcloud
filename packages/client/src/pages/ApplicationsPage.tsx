import { Table, Typography, Space, Alert, Card, Input, Button, Tag } from 'antd';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServerTable } from '../hooks/useServerTable';
import { trpc } from '../utils/trpc';
import { useClusterStore } from '../stores/clusterStore';

const { Title, Text } = Typography;

interface ApplicationData {
	id: string;
	name: string;
	namespace: string;
	createdAt: Date;
	cluster?: {
		id: string;
		name: string;
	};
	_count: {
		services: number;
	};
}

interface ApplicationFilter {
	name?: string;
	namespace?: string;
}

export const ApplicationsPage = () => {
	const navigate = useNavigate();
	const { selectedClusterId } = useClusterStore();
	const table = useServerTable<ApplicationData, ApplicationFilter>({
		initialPage: 1,
		initialPageSize: 10,
		initialSortBy: 'createdAt',
		initialSortOrder: 'desc',
	});

	const [searchValue, setSearchValue] = useState('');

	useEffect(() => {
		const timer = setTimeout(() => {
			const trimmed = searchValue.trim();
			table.handleFilterChange(trimmed ? { name: trimmed } : undefined);
		}, 500);

		return () => clearTimeout(timer);
	}, [searchValue, table.handleFilterChange]);

	const { data, isLoading, error } = trpc.application.list.useQuery({
		page: table.page,
		limit: table.pageSize,
		sortBy: table.sortBy as 'createdAt' | 'updatedAt' | 'name' | 'namespace' | 'servicesCount' | undefined,
		sortOrder: table.sortOrder,
		filter: {
			...table.filter,
			clusterId: selectedClusterId || undefined,
		},
	});

	const columns: ColumnsType<ApplicationData> = [
		{
			title: 'Name',
			dataIndex: 'name',
			key: 'name',
			render: (text: string) => <Text strong>{text}</Text>,
			sorter: true,
			sortOrder: table.getSortOrder('name'),
			sortDirections: ['descend', 'ascend'],
		},
		{
			title: 'Namespace',
			dataIndex: 'namespace',
			key: 'namespace',
			render: (text: string) => <Tag>{text}</Tag>,
			sorter: true,
			sortOrder: table.getSortOrder('namespace'),
			sortDirections: ['descend', 'ascend'],
		},
		{
			title: 'Cluster',
			key: 'cluster',
			render: (_, record) => (
				record.cluster ? <Tag color="blue">{record.cluster.name}</Tag> : <Text type="secondary">-</Text>
			),
		},
		{
			title: 'Services',
			key: 'servicesCount',
			render: (_, record) => (
				<Text type={record._count.services > 0 ? undefined : 'secondary'}>
					{record._count.services}
				</Text>
			),
			width: 100,
			align: 'center',
			sorter: true,
			sortOrder: table.getSortOrder('servicesCount'),
			sortDirections: ['descend', 'ascend'],
		},
		{
			title: 'Created',
			dataIndex: 'createdAt',
			key: 'createdAt',
			render: (date: Date) => (
				<Text type="secondary">{dayjs(date).format('DD.MM.YYYY HH:mm')}</Text>
			),
			sorter: true,
			sortOrder: table.getSortOrder('createdAt'),
			sortDirections: ['descend', 'ascend'],
		},
	];

	if (error) {
		return <Alert message="Error" description={error.message} type="error" showIcon />;
	}

	if (!selectedClusterId) {
		return (
			<Space direction="vertical" size="large" style={{ width: '100%' }}>
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
					<div>
						<Title level={2} style={{ marginBottom: 4 }}>Applications</Title>
					</div>
				</div>
				<Card>
					<Alert
						message="No cluster selected"
						description="Please select a cluster from the dropdown in the header to view applications."
						type="warning"
						showIcon
					/>
				</Card>
			</Space>
		);
	}

	return (
		<Space direction="vertical" size="large" style={{ width: '100%' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
				<div>
					<Title level={2} style={{ marginBottom: 4 }}>Applications</Title>
					{data?.pagination && (
						<Text type="secondary">
							{data.pagination.total} application{data.pagination.total !== 1 ? 's' : ''}
						</Text>
					)}
				</div>

				<Space wrap>
					<Input
						placeholder="Search..."
						prefix={<SearchOutlined style={{ opacity: 0.5 }} />}
						allowClear
						value={searchValue}
						onChange={(e) => setSearchValue(e.target.value)}
						style={{ width: 200 }}
					/>
					<Button
						type="primary"
						icon={<PlusOutlined />}
						onClick={() => navigate('/applications/new')}
						disabled={!selectedClusterId}
					>
						New Application
					</Button>
				</Space>
			</div>

			<Card>
				<Table
					columns={columns}
					dataSource={data?.applications || []}
					loading={isLoading}
					rowKey="id"
					onRow={(record) => ({
						onClick: () => navigate(`/applications/${record.id}`),
						style: { cursor: 'pointer' },
					})}
					onChange={table.handleTableChange}
					pagination={{
						total: data?.pagination?.total || 0,
						current: table.page,
						pageSize: table.pageSize,
						showSizeChanger: true,
						showTotal: (total) => `${total} items`,
					}}
				/>
			</Card>
		</Space>
	);
};
