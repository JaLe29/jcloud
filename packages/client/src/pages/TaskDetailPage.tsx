import { useNavigate, useParams } from 'react-router-dom';
import { Card, Typography, Space, Button, Tag, Descriptions } from 'antd';
import { ArrowLeftOutlined, ClockCircleOutlined, SyncOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { trpc } from '../utils/trpc';

const { Title, Text } = Typography;

type TaskStatus = 'WAITING' | 'EXECUTING' | 'FAILED' | 'DONE';

const statusConfig: Record<TaskStatus, { color: string; icon: React.ReactNode; label: string }> = {
	WAITING: { color: 'default', icon: <ClockCircleOutlined />, label: 'Waiting' },
	EXECUTING: { color: 'processing', icon: <SyncOutlined spin />, label: 'Executing' },
	DONE: { color: 'success', icon: <CheckCircleOutlined />, label: 'Done' },
	FAILED: { color: 'error', icon: <CloseCircleOutlined />, label: 'Failed' },
};

export const TaskDetailPage = () => {
	const { taskId } = useParams<{ taskId: string }>();
	const navigate = useNavigate();

	const { data: task, isLoading, error } = trpc.task.getById.useQuery(
		{ id: taskId! },
		{ enabled: !!taskId, retry: false },
	);

	const getTaskType = (meta: Record<string, unknown> | null): string => {
		if (!meta) return 'Unknown';
		const type = meta.type as string | undefined;
		if (type === 'deploy-created') return 'Deployment';
		return type || 'Unknown';
	};

	const getDuration = (): string => {
		if (!task?.startedAt) return '-';
		const end = task.finishedAt ? dayjs(task.finishedAt) : dayjs();
		const duration = end.diff(dayjs(task.startedAt), 'second');
		return `${duration}s`;
	};

	if (error) {
		const isNotFound = error.data?.code === 'NOT_FOUND';
		return (
			<Space direction="vertical" size="large" style={{ width: '100%' }}>
				<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tasks')}>
					Back to Tasks
				</Button>
				<Card style={{ textAlign: 'center', padding: 40 }}>
					<Title level={4}>{isNotFound ? 'Task not found' : 'Error'}</Title>
					<Text type="secondary">{error.message}</Text>
				</Card>
			</Space>
		);
	}

	if (isLoading || !task) {
		return (
			<Space direction="vertical" size="large" style={{ width: '100%' }}>
				<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tasks')}>
					Back
				</Button>
				<Card loading />
			</Space>
		);
	}

	return (
		<Space direction="vertical" size="large" style={{ width: '100%' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
				<Space>
					<Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tasks')}>
						Back
					</Button>
					<Title level={2} style={{ margin: 0 }}>Task Detail</Title>
					<Tag
						color={statusConfig[task.status].color}
						icon={statusConfig[task.status].icon}
					>
						{statusConfig[task.status].label}
					</Tag>
				</Space>
			</div>

			<Card title="Task Info">
				<Descriptions column={{ xs: 1, sm: 2, md: 2, lg: 3 }} bordered>
					<Descriptions.Item label="Status">
						<Tag
							color={statusConfig[task.status].color}
							icon={statusConfig[task.status].icon}
						>
							{statusConfig[task.status].label}
						</Tag>
					</Descriptions.Item>
					<Descriptions.Item label="Type">
						{getTaskType(task.meta as Record<string, unknown> | null)}
					</Descriptions.Item>
					<Descriptions.Item label="Duration">{getDuration()}</Descriptions.Item>
					<Descriptions.Item label="Service">{task.service.name}</Descriptions.Item>
					<Descriptions.Item label="Application">{task.service.application.name}</Descriptions.Item>
					<Descriptions.Item label="Created">
						{dayjs(task.createdAt).format('DD.MM.YYYY HH:mm:ss')}
					</Descriptions.Item>
					{task.startedAt && (
						<Descriptions.Item label="Started">
							{dayjs(task.startedAt).format('DD.MM.YYYY HH:mm:ss')}
						</Descriptions.Item>
					)}
					{task.finishedAt && (
						<Descriptions.Item label="Finished">
							{dayjs(task.finishedAt).format('DD.MM.YYYY HH:mm:ss')}
						</Descriptions.Item>
					)}
				</Descriptions>
			</Card>

			{task.meta && (
				<Card title="Meta">
					<pre
						style={{
							background: '#f5f5f5',
							color: '#333',
							padding: 16,
							borderRadius: 6,
							maxHeight: 300,
							overflow: 'auto',
							fontSize: 12,
							fontFamily: 'monospace',
							margin: 0,
						}}
					>
						{JSON.stringify(task.meta, null, 2)}
					</pre>
				</Card>
			)}

			<Card title="Log">
				<pre
					style={{
						background: '#1e1e1e',
						color: '#d4d4d4',
						padding: 16,
						borderRadius: 6,
						maxHeight: 500,
						overflow: 'auto',
						fontSize: 12,
						fontFamily: 'monospace',
						margin: 0,
						whiteSpace: 'pre-wrap',
						wordBreak: 'break-all',
					}}
				>
					{task.log.length > 0 ? task.log.join('\n') : '(no log output)'}
				</pre>
			</Card>
		</Space>
	);
};

