import { Card, Table, Typography, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { trpc } from '../../utils/trpc';

const { Text } = Typography;

interface ApiDeployData {
	id: string;
	image: string;
	createdAt: Date;
}

interface ApiDeployHistoryProps {
	serviceId: string;
}

export const ApiDeployHistory = ({ serviceId }: ApiDeployHistoryProps) => {
	const { data, isLoading } = trpc.apikey.getDeployHistory.useQuery({
		page: 1,
		limit: 10,
		sortBy: 'createdAt',
		sortOrder: 'desc',
		filter: { serviceId },
	});

	const columns: ColumnsType<ApiDeployData> = [
		{
			title: 'Time',
			dataIndex: 'createdAt',
			key: 'createdAt',
			width: 180,
			render: (date: Date) => (
				<Text>{dayjs(date).format('DD.MM.YYYY HH:mm:ss')}</Text>
			),
		},
		{
			title: 'Docker Image',
			dataIndex: 'image',
			key: 'image',
			ellipsis: true,
			render: (image: string) => (
				<Text code style={{ fontSize: 12 }}>{image}</Text>
			),
		},
	];

	return (
		<Card title="Deployment History" size="small">
			<Table
				columns={columns}
				dataSource={data?.deploys || []}
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
								Deploy your first image using the API key
							</Text>
						</Space>
					),
				}}
			/>
		</Card>
	);
};

