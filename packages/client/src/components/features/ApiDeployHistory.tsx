import { Card, Table, Typography, Space, Tag, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, ClockCircleOutlined, SyncOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { trpc } from '../../utils/trpc';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@jcloud/bff/src/trpc/router';

const { Text } = Typography;

type TaskStatus = 'WAITING' | 'EXECUTING' | 'FAILED' | 'DONE';
type RouterOutput = inferRouterOutputs<AppRouter>;
type TaskData = RouterOutput['task']['list']['tasks'][number];

interface ApiDeployHistoryProps {
	serviceId: string;
}

const statusConfig: Record<TaskStatus, { color: string; icon: React.ReactNode; label: string }> = {
	WAITING: { color: 'default', icon: <ClockCircleOutlined />, label: 'Waiting' },
	EXECUTING: { color: 'processing', icon: <SyncOutlined spin />, label: 'Executing' },
	DONE: { color: 'success', icon: <CheckCircleOutlined />, label: 'Done' },
	FAILED: { color: 'error', icon: <CloseCircleOutlined />, label: 'Failed' },
};

export const ApiDeployHistory = ({ serviceId }: ApiDeployHistoryProps) => {
	const navigate = useNavigate();

	const { data, isLoading } = trpc.task.list.useQuery({
		page: 1,
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
			title: 'Time',
			dataIndex: 'createdAt',
			key: 'createdAt',
			width: 160,
			render: (date: Date) => (
				<Text style={{ fontSize: 12 }}>{dayjs(date).format('DD.MM.YYYY HH:mm:ss')}</Text>
			),
		},
		{
			title: 'Docker Image',
			key: 'image',
			ellipsis: true,
			render: (_: unknown, record: TaskData) => {
				const meta = record.meta as Record<string, unknown> | null;
				const image = meta?.image as string | undefined;
				return image ? (
					<Text code style={{ fontSize: 12 }}>{image}</Text>
				) : (
					<Text type="secondary">-</Text>
				);
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
		<Card title="Deployment History" size="small">
			<Table
				columns={columns}
				dataSource={data?.tasks || []}
				loading={isLoading}
				rowKey="id"
				pagination={{
					total: data?.pagination?.total || 0,
					pageSize: 10,
					showSizeChanger: false,
					showTotal: (total) => `${total} deployment${total !== 1 ? 's' : ''}`,
				}}
				locale={{
					emptyText: (
						<Space direction="vertical" style={{ padding: 20 }}>
							<Text type="secondary">No deployments yet</Text>
							<Text type="secondary" style={{ fontSize: 12 }}>
								Deploy your first image using the API key or manual deploy
							</Text>
						</Space>
					),
				}}
			/>
		</Card>
	);
};
