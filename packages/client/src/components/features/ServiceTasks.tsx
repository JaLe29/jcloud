import { useState } from 'react';
import { Card, Table, Typography, Space, Tag, Modal, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, ClockCircleOutlined, SyncOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { trpc } from '../../utils/trpc';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@jcloud/bff/src/trpc/router';

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
	const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
	const [page, setPage] = useState(1);

	const { data, isLoading } = trpc.task.list.useQuery({
		page,
		limit: 10,
		sortBy: 'createdAt',
		sortOrder: 'desc',
		filter: { serviceId },
	});

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
					onClick={() => setSelectedTask(record)}
				/>
			),
		},
	];

	return (
		<>
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
						showTotal: (total) => `${total} task${total !== 1 ? 's' : ''}`,
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

			<Modal
				title="Task Details"
				open={!!selectedTask}
				onCancel={() => setSelectedTask(null)}
				footer={null}
				width={700}
			>
				{selectedTask && (
					<Space direction="vertical" style={{ width: '100%' }} size="middle">
						<div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
							<div>
								<Text type="secondary">Status: </Text>
								<Tag
									color={statusConfig[selectedTask.status].color}
									icon={statusConfig[selectedTask.status].icon}
								>
									{statusConfig[selectedTask.status].label}
								</Tag>
							</div>
							<div>
								<Text type="secondary">Created: </Text>
								<Text>{dayjs(selectedTask.createdAt).format('DD.MM.YYYY HH:mm:ss')}</Text>
							</div>
							{selectedTask.startedAt && (
								<div>
									<Text type="secondary">Started: </Text>
									<Text>{dayjs(selectedTask.startedAt).format('DD.MM.YYYY HH:mm:ss')}</Text>
								</div>
							)}
							{selectedTask.finishedAt && (
								<div>
									<Text type="secondary">Finished: </Text>
									<Text>{dayjs(selectedTask.finishedAt).format('DD.MM.YYYY HH:mm:ss')}</Text>
								</div>
							)}
						</div>

						{selectedTask.meta && (
						<div>
							<Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Meta:</Text>
							<pre
								style={{
									background: '#f5f5f5',
									color: '#333',
									padding: 12,
									borderRadius: 6,
									maxHeight: 200,
									overflow: 'auto',
									fontSize: 12,
									fontFamily: 'monospace',
									margin: 0,
								}}
							>
								{JSON.stringify(selectedTask.meta, null, 2)}
							</pre>
						</div>
					)}

						<div>
							<Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Log:</Text>
							<pre
								style={{
									background: '#1e1e1e',
									color: '#d4d4d4',
									padding: 16,
									borderRadius: 6,
									maxHeight: 400,
									overflow: 'auto',
									fontSize: 12,
									fontFamily: 'monospace',
									margin: 0,
									whiteSpace: 'pre-wrap',
									wordBreak: 'break-all',
								}}
							>
								{selectedTask.log.length > 0 ? selectedTask.log.join('\n') : '(no log output)'}
							</pre>
						</div>
					</Space>
				)}
			</Modal>
		</>
	);
};

