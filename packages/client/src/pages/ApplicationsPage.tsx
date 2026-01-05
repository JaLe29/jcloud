import { Table, Typography, Space, Alert, Card, Input, Button, Tag } from 'antd';
import { SearchOutlined, PlusOutlined, AppstoreOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServerTable } from '../hooks/useServerTable';
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

interface ApplicationFilter {
	name?: string;
	namespace?: string;
}

export const ApplicationsPage = () => {
	const navigate = useNavigate();
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
		filter: table.filter,
	});

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
			sorter: true,
			sortOrder: table.getSortOrder('name'),
			sortDirections: ['descend', 'ascend'],
		},
		{
			title: 'Namespace',
			dataIndex: 'namespace',
			key: 'namespace',
			render: (text: string) => (
				<Tag color="blue">{text}</Tag>
			),
			sorter: true,
			sortOrder: table.getSortOrder('namespace'),
			sortDirections: ['descend', 'ascend'],
		},
		{
			title: 'Services',
			key: 'servicesCount',
			render: (_, record) => (
				<Text strong style={{ color: record._count.services > 0 ? '#10b981' : '#94a3b8' }}>
					{record._count.services}
				</Text>
			),
			width: 140,
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
				<Space direction="vertical" size={0}>
					<Text>{dayjs(date).format('DD.MM.YYYY')}</Text>
					<Text type="secondary" style={{ fontSize: 12 }}>
						{dayjs(date).format('HH:mm:ss')}
					</Text>
				</Space>
			),
			sorter: true,
			sortOrder: table.getSortOrder('createdAt'),
			sortDirections: ['descend', 'ascend'],
		},
	];

	if (error) {
		return <Alert message="Error" description={error.message} type="error" showIcon />;
	}

	return (
		<Space direction="vertical" size="large" style={{ width: '100%' }}>
			<Space
				direction="horizontal"
				size="middle"
				style={{ width: '100%', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}
			>
				<div>
					<Title level={2} style={{ marginBottom: 8 }}>
						<AppstoreOutlined style={{ marginRight: 12, color: '#0ea5e9' }} />
						Applications
					</Title>
					{data?.pagination && (
						<Text type="secondary" style={{ fontSize: 15 }}>
							Total Applications: <Text strong style={{ color: '#0ea5e9' }}>{data.pagination.total}</Text>
						</Text>
					)}
				</div>

				<Space wrap>
					<Input
						placeholder="Search by name..."
						prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
						allowClear
						value={searchValue}
						onChange={(e) => setSearchValue(e.target.value)}
						style={{
							width: 240,
							borderRadius: 8,
						}}
					/>
					<Button
						type="primary"
						icon={<PlusOutlined />}
						onClick={() => navigate('/applications/new')}
					>
						New Application
					</Button>
				</Space>
			</Space>

			<Card bordered={false} style={{ borderRadius: 12 }}>
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
						showTotal: (total, range) => (
							<Text type="secondary">
								Showing <Text strong>{range[0]}-{range[1]}</Text> of <Text strong>{total}</Text> applications
							</Text>
						),
					}}
				/>
			</Card>
		</Space>
	);
};

