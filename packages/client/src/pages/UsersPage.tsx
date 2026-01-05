import { Table, Typography, Space, Alert, Card, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServerTable } from '../hooks/useServerTable';
import { trpc } from '../utils/trpc';

const { Title, Text } = Typography;

interface UserData {
	id: string;
	userPublicId: string;
	createdAt: Date;
	lastEventTime: Date | null;
	_count: {
		events: number;
	};
}

interface UserFilter {
	userPublicId?: string;
}

export const UsersPage = () => {
	const navigate = useNavigate();
	const table = useServerTable<UserData, UserFilter>({
		initialPage: 1,
		initialPageSize: 10,
		initialSortBy: 'createdAt',
		initialSortOrder: 'desc',
	});

	// Local state for search input (for debouncing)
	const [searchValue, setSearchValue] = useState('');

	// Debounce search input
	useEffect(() => {
		const timer = setTimeout(() => {
			const trimmed = searchValue.trim();
			table.handleFilterChange(trimmed ? { userPublicId: trimmed } : undefined);
		}, 500);

		return () => clearTimeout(timer);
	}, [searchValue, table.handleFilterChange]);

	const { data, isLoading, error } = trpc.user.list.useQuery({
		page: table.page,
		limit: table.pageSize,
		sortBy: table.sortBy as 'createdAt' | 'updatedAt' | 'userPublicId' | 'eventsCount' | 'lastEventTime' | undefined,
		sortOrder: table.sortOrder,
		filter: table.filter,
	});

	const columns: ColumnsType<UserData> = [
		{
			title: 'Public ID',
			dataIndex: 'userPublicId',
			key: 'userPublicId',
			render: (text: string) => (
				<Text strong style={{ color: '#9019F9' }}>
					{text}
				</Text>
			),
		},
		{
			title: 'Created At',
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
		{
			title: 'Last Event Time',
			key: 'lastEventTime',
			render: (_, record) => {
				if (!record.lastEventTime) {
					return <Text type="secondary">-</Text>;
				}
				return (
					<Space direction="vertical" size={0}>
						<Text>{dayjs(record.lastEventTime).format('DD.MM.YYYY')}</Text>
						<Text type="secondary" style={{ fontSize: 12 }}>
							{dayjs(record.lastEventTime).format('HH:mm:ss')}
						</Text>
					</Space>
				);
			},
			sorter: true,
			sortOrder: table.getSortOrder('lastEventTime'),
			sortDirections: ['descend', 'ascend'],
		},
		{
			title: 'Events Count',
			key: 'eventsCount',
			render: (_, record) => (
				<Text strong style={{ color: record._count.events > 0 ? '#9019F9' : '#94a3b8' }}>
					{record._count.events}
				</Text>
			),
			width: 140,
			align: 'center',
			sorter: true,
			sortOrder: table.getSortOrder('eventsCount'),
			sortDirections: ['descend', 'ascend'],
		},
	];

	if (error) {
		return <Alert message="Error" description={error.message} type="error" showIcon />;
	}

	return (
		<Space direction="vertical" size="large" style={{ width: '100%' }}>
			<Space direction="horizontal" size="middle" style={{ width: '100%', justifyContent: 'space-between', alignItems: 'flex-start' }}>
				<div>
					<Title level={2} style={{ marginBottom: 8 }}>
						Users Management
					</Title>
					{data?.pagination && (
						<Text type="secondary" style={{ fontSize: 15 }}>
							Total Users: <Text strong style={{ color: '#9019F9' }}>{data.pagination.total}</Text> | Page {data.pagination.page} of {data.pagination.totalPages}
						</Text>
					)}
				</div>

				<Input
					placeholder="Search by Public ID..."
					prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
					allowClear
					value={searchValue}
					onChange={(e) => setSearchValue(e.target.value)}
					style={{
						width: 280,
						borderRadius: 8,
					}}
				/>
			</Space>

			<Card bordered={false} style={{ borderRadius: 12 }}>
				<Table
					columns={columns}
					dataSource={data?.users || []}
					loading={isLoading}
					rowKey="id"
					onRow={(record) => ({
						onClick: () => navigate(`/users/${record.id}`),
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
								Showing <Text strong>{range[0]}-{range[1]}</Text> of <Text strong>{total}</Text> users
							</Text>
						),
					}}
				/>
			</Card>
		</Space>
	);
};

