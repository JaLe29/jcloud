import {
	CheckCircleOutlined,
	ClockCircleOutlined,
	CloseCircleOutlined,
	EyeOutlined,
	SyncOutlined,
} from '@ant-design/icons';
import type { AppRouter } from '@jcloud/bff/src/trpc/router';
import type { inferRouterOutputs } from '@trpc/server';
import { Button, Card, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../../utils/trpc';

const { Text } = Typography;

type TaskStatus = 'WAITING' | 'EXECUTING' | 'FAILED' | 'DONE';

type RouterOutput = inferRouterOutputs<AppRouter>;
type TaskData = RouterOutput['task']['list']['tasks'][number];

interface ServiceTasksProps {
	serviceId: string;
}

const statusConfig: Record<TaskStatus, { color: string; icon: React.ReactNode; label: string }> = {
	WAITING: { color: 'default', icon: <ClockCircleOutlined />, label: 'Waiting' },
	EXECUTING: { color: 'processing', icon: <SyncOutlined spin />, label: 'Executing' },
	DONE: { color: 'success', icon: <CheckCircleOutlined />, label: 'Done' },
	FAILED: { color: 'error', icon: <CloseCircleOutlined />, label: 'Failed' },
};

export const ServiceTasks = ({ serviceId }: ServiceTasksProps) => {
	const navigate = useNavigate();
	const [page, setPage] = useState(1);

	const { data, isLoading } = trpc.task.list.useQuery({
		page,
		limit: 10,
		sortBy: 'createdAt',
		sortOrder: 'desc',
		filter: { serviceId },
	});

	const getTaskType = (meta: Record<string, unknown> | null): string => {
		if (!meta) {
			return 'Unknown';
		}
		const type = meta.type as string | undefined;
		if (type === 'deploy-created') {
			return 'Deployment';
		}
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
			title: 'Created',
			dataIndex: 'createdAt',
			key: 'createdAt',
			width: 160,
			render: (date: Date) => <Text style={{ fontSize: 12 }}>{dayjs(date).format('DD.MM.YYYY HH:mm:ss')}</Text>,
		},
		{
			title: 'Duration',
			key: 'duration',
			width: 100,
			render: (_: unknown, record: TaskData) => {
				if (!record.startedAt) {
					return <Text type="secondary">-</Text>;
				}
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
		<Card title="Tasks" size="small">
			<Table
				columns={columns}
				dataSource={data?.tasks || []}
				loading={isLoading}
				rowKey="id"
				pagination={{
					current: page,
					total: data?.pagination?.total || 0,
					pageSize: 10,
					showSizeChanger: false,
					showTotal: total => `${total} task${total !== 1 ? 's' : ''}`,
					onChange: setPage,
				}}
				locale={{
					emptyText: (
						<Space direction="vertical" style={{ padding: 20 }}>
							<Text type="secondary">No tasks yet</Text>
						</Space>
					),
				}}
			/>
		</Card>
	);
};
