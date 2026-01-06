import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Typography, Space, Card, Tag, Button, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, ClockCircleOutlined, SyncOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { trpc } from '../utils/trpc';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@jcloud/bff/src/trpc/router';

const { Title, Text } = Typography;

type TaskStatus = 'WAITING' | 'EXECUTING' | 'FAILED' | 'DONE';
type RouterOutput = inferRouterOutputs<AppRouter>;
type TaskData = RouterOutput['task']['list']['tasks'][number];

const statusConfig: Record<TaskStatus, { color: string; icon: React.ReactNode; label: string }> = {
	WAITING: { color: 'default', icon: <ClockCircleOutlined />, label: 'Waiting' },
	EXECUTING: { color: 'processing', icon: <SyncOutlined spin />, label: 'Executing' },
	DONE: { color: 'success', icon: <CheckCircleOutlined />, label: 'Done' },
	FAILED: { color: 'error', icon: <CloseCircleOutlined />, label: 'Failed' },
};

export const TasksPage = () => {
	const navigate = useNavigate();
	const [page, setPage] = useState(1);
	const [statusFilter, setStatusFilter] = useState<TaskStatus | undefined>();

	const { data, isLoading } = trpc.task.list.useQuery({
		page,
		limit: 20,
		sortBy: 'createdAt',
		sortOrder: 'desc',
		filter: statusFilter ? { status: statusFilter } : undefined,
	});

	const getTaskType = (meta: Record<string, unknown> | null): string => {
		if (!meta) return 'Unknown';
		const type = meta.type as string | undefined;
		if (type === 'deploy-created') return 'Deployment';
		return type || 'Unknown';
	};

	const columns: ColumnsType<TaskData> = [
		{
			title: 'Status',
			dataIndex: 'status',
			key: 'status',
			width: 120,
			render: (status: TaskStatus) => {
				const config = statusConfig[status];
				return (
					<Tag color={config.color} icon={config.icon}>
						{config.label}
					</Tag>
				);
			},
		},
		{
			title: 'Type',
			key: 'type',
			width: 120,
			render: (_: unknown, record: TaskData) => {
				const meta = record.meta as Record<string, unknown> | null;
				return <Text>{getTaskType(meta)}</Text>;
			},
		},
		{
			title: 'Service',
			key: 'service',
			width: 200,
			render: (_: unknown, record: TaskData) => (
				<Space direction="vertical" size={0}>
					<Text>{record.service.name}</Text>
					<Text type="secondary" style={{ fontSize: 12 }}>{record.service.application.name}</Text>
				</Space>
			),
		},
		{
			title: 'Created',
			dataIndex: 'createdAt',
			key: 'createdAt',
			width: 160,
			render: (date: Date) => (
				<Text style={{ fontSize: 12 }}>{dayjs(date).format('DD.MM.YYYY HH:mm:ss')}</Text>
			),
		},
		{
			title: 'Duration',
			key: 'duration',
			width: 100,
			render: (_: unknown, record: TaskData) => {
				if (!record.startedAt) return <Text type="secondary">-</Text>;
				const end = record.finishedAt ? dayjs(record.finishedAt) : dayjs();
				const duration = end.diff(dayjs(record.startedAt), 'second');
				return <Text style={{ fontSize: 12 }}>{duration}s</Text>;
			},
		},
		{
			title: '',
			key: 'actions',
			width: 60,
			render: (_: unknown, record: TaskData) => (
				<Button
					type="text"
					size="small"
					icon={<EyeOutlined />}
					onClick={() => navigate(`/tasks/${record.id}`)}
				/>
			),
		},
	];

	return (
		<Space direction="vertical" size="large" style={{ width: '100%' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
				<Title level={2} style={{ margin: 0 }}>Tasks</Title>
				<Select
					placeholder="Filter by status"
					allowClear
					style={{ width: 150 }}
					value={statusFilter}
					onChange={setStatusFilter}
					options={[
						{ value: 'WAITING', label: 'Waiting' },
						{ value: 'EXECUTING', label: 'Executing' },
						{ value: 'DONE', label: 'Done' },
						{ value: 'FAILED', label: 'Failed' },
					]}
				/>
			</div>

			<Card>
				<Table
					columns={columns}
					dataSource={data?.tasks || []}
					loading={isLoading}
					rowKey="id"
					pagination={{
						current: page,
						total: data?.pagination?.total || 0,
						pageSize: 20,
						showSizeChanger: false,
						showTotal: (total) => `${total} task${total !== 1 ? 's' : ''}`,
						onChange: setPage,
					}}
					locale={{
						emptyText: (
							<Space direction="vertical" style={{ padding: 40 }}>
								<Text type="secondary">No tasks yet</Text>
							</Space>
						),
					}}
				/>
			</Card>
		</Space>
	);
};
