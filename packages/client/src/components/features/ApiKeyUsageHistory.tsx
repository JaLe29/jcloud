import { Card, Table, Typography, Space, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { trpc } from '../../utils/trpc';

const { Text } = Typography;

interface ApiKeyUsageData {
	id: string;
	ipAddress: string | null;
	userAgent: string | null;
	endpoint: string | null;
	createdAt: Date;
}

interface ApiKeyUsageHistoryProps {
	serviceId: string;
}

export const ApiKeyUsageHistory = ({ serviceId }: ApiKeyUsageHistoryProps) => {
	const { data, isLoading } = trpc.apikey.getUsageHistory.useQuery({
		page: 1,
		limit: 10,
		sortBy: 'createdAt',
		sortOrder: 'desc',
		filter: { serviceId },
	});

	const columns: ColumnsType<ApiKeyUsageData> = [
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
			title: 'Endpoint',
			dataIndex: 'endpoint',
			key: 'endpoint',
			render: (endpoint: string | null) =>
				endpoint ? <Tag color="blue">{endpoint}</Tag> : <Text type="secondary">-</Text>,
		},
		{
			title: 'IP Address',
			dataIndex: 'ipAddress',
			key: 'ipAddress',
			render: (ip: string | null) =>
				ip || <Text type="secondary">-</Text>,
		},
		{
			title: 'User Agent',
			dataIndex: 'userAgent',
			key: 'userAgent',
			ellipsis: true,
			render: (ua: string | null) =>
				ua ? <Text type="secondary" style={{ fontSize: 12 }}>{ua}</Text> : <Text type="secondary">-</Text>,
		},
	];

	return (
		<Card title="API Key Usage History" size="small">
			<Table
				columns={columns}
				dataSource={data?.usages || []}
				loading={isLoading}
				rowKey="id"
				pagination={{
					total: data?.pagination?.total || 0,
					pageSize: 10,
					showSizeChanger: false,
					showTotal: (total) => `${total} uses`,
				}}
				locale={{
					emptyText: (
						<Space direction="vertical" style={{ padding: 20 }}>
							<Text type="secondary">No usage recorded yet</Text>
							<Text type="secondary" style={{ fontSize: 12 }}>
								This API key hasn't been used for any deployments
							</Text>
						</Space>
					),
				}}
			/>
		</Card>
	);
};

