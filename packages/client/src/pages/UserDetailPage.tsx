import { useNavigate, useParams } from 'react-router-dom';
import { Card, Descriptions, Typography, Space, Button, Table, Tag, Modal, message, Select, Segmented, DatePicker } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, CalendarOutlined, FilterOutlined, LineChartOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useServerTable } from '../hooks/useServerTable';
import { trpc } from '../utils/trpc';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface EventData {
	id: string;
	event: string;
	meta: unknown;
	createdAt: Date;
}

interface EventFilter {
	userId: string;
	eventType?: string;
}

export const UserDetailPage = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const utils = trpc.useContext();
	const [eventTypeFilter, setEventTypeFilter] = useState<string | undefined>(undefined);
	const [chartEventType, setChartEventType] = useState<string | undefined>(undefined);
	const [chartTimeRange, setChartTimeRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
	const [customDateRange, setCustomDateRange] = useState<[Dayjs, Dayjs] | null>(null);

	const { data: eventTypes } = trpc.event.getEventTypes.useQuery();

	// Calculate start and end dates based on range with useMemo to prevent infinite loops
	const dateRange = useMemo((): { startDate?: Date; endDate?: Date } => {
		if (chartTimeRange === 'custom' && customDateRange) {
			return {
				startDate: customDateRange[0].toDate(),
				endDate: customDateRange[1].toDate(),
			};
		}

		const now = new Date();
		let startDate: Date;

		switch (chartTimeRange) {
			case '7d':
				startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
				break;
			case '30d':
				startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
				break;
			case '90d':
				startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
				break;
			default:
				startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
		}

		return { startDate, endDate: now };
	}, [chartTimeRange, customDateRange]);

	const { data: timeSeriesData, isLoading: chartLoading } = trpc.event.getTimeSeries.useQuery(
		{
			userId: id!,
			eventType: chartEventType,
			...dateRange,
		},
		{
			enabled: !!id && (chartTimeRange !== 'custom' || !!customDateRange),
		},
	);

	const { data: user, isLoading, error } = trpc.user.getById.useQuery(
		{ id: id! },
		{
			enabled: !!id,
			retry: false,
		},
	);

	const eventsTable = useServerTable<EventData, EventFilter>({
		initialPage: 1,
		initialPageSize: 10,
		initialSortBy: 'createdAt',
		initialSortOrder: 'desc',
	});

	// Build filter directly from current values instead of using state
	const eventsFilter: EventFilter | undefined = id ? {
		userId: id,
		eventType: eventTypeFilter,
	} : undefined;

	const { data: eventsData, isLoading: eventsLoading } = trpc.event.list.useQuery(
		{
			page: eventsTable.page,
			limit: eventsTable.pageSize,
			sortBy: eventsTable.sortBy as 'createdAt' | 'event' | undefined,
			sortOrder: eventsTable.sortOrder,
			filter: eventsFilter,
		},
		{
			enabled: !!id,
		},
	);

	const deleteMutation = trpc.user.delete.useMutation({
		onSuccess: () => {
			message.success('User deleted successfully');
			utils.user.list.invalidate();
			navigate('/users');
		},
		onError: (error) => {
			message.error(`Failed to delete user: ${error.message}`);
		},
	});

	const handleDelete = () => {
		Modal.confirm({
			title: 'Are you sure you want to delete this user?',
			content: 'This action cannot be undone. All user events will also be deleted.',
			okText: 'Delete',
			okType: 'danger',
			cancelText: 'Cancel',
			onOk: () => {
				if (id) {
					deleteMutation.mutate({ id });
				}
			},
		});
	};

	const eventColumns: ColumnsType<EventData> = [
		{
			title: 'Event',
			dataIndex: 'event',
			key: 'event',
			render: (text: string) => <Tag color="purple">{text}</Tag>,
			sorter: true,
			sortOrder: eventsTable.getSortOrder('event'),
		},
		{
			title: 'Created At',
			dataIndex: 'createdAt',
			key: 'createdAt',
			render: (date: Date) => dayjs(date).format('DD.MM.YYYY HH:mm:ss'),
			sorter: true,
			sortOrder: eventsTable.getSortOrder('createdAt'),
			sortDirections: ['descend', 'ascend'],
		},
		{
			title: 'Meta',
			dataIndex: 'meta',
			key: 'meta',
			render: (meta: unknown) => (
				<Text code style={{ fontSize: 12 }}>
					{meta ? JSON.stringify(meta) : 'null'}
				</Text>
			),
		},
	];

	if (error) {
		const isNotFound = error.data?.code === 'NOT_FOUND' || error.message.includes('NOT_FOUND');
		return (
			<Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
				<Card
					bordered={false}
					style={{
						borderRadius: 12,
						padding: '40px 20px',
						textAlign: 'center',
					}}
				>
					<Space direction="vertical" size="large" style={{ width: '100%' }}>
						<div
							style={{
								fontSize: 72,
								opacity: 0.3,
							}}
						>
							{isNotFound ? '🔍' : '⚠️'}
						</div>
						<div>
							<Title level={2} style={{ marginBottom: 8 }}>
								{isNotFound ? 'User Not Found' : 'Error'}
							</Title>
							<Text type="secondary" style={{ fontSize: 16 }}>
								{isNotFound
									? 'The user you are looking for does not exist or has been deleted.'
									: error.message}
							</Text>
						</div>
						<Space>
							<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
								Go Back
							</Button>
							<Button type="primary" onClick={() => navigate('/users')}>
								View All Users
							</Button>
						</Space>
					</Space>
				</Card>
			</Space>
		);
	}

	if (isLoading || !user) {
		return (
			<Space direction="vertical" size="large" style={{ width: '100%' }}>
				<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
					Back
				</Button>
				<Card loading={true} />
			</Space>
		);
	}

	return (
		<Space direction="vertical" size="large" style={{ width: '100%' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
					Back
				</Button>
				<Button
					danger
					icon={<DeleteOutlined />}
					onClick={handleDelete}
					loading={deleteMutation.isLoading}
				>
					Delete User
				</Button>
			</div>

			<Card
				bordered={false}
				style={{
					borderRadius: 12,
					background: '#f9fafb',
					marginBottom: 24,
				}}
			>
				<Space direction="vertical" size="middle" style={{ width: '100%' }}>
					<div>
						<Text type="secondary" style={{ fontSize: 13 }}>Public ID</Text>
						<Title level={3} style={{ margin: '4px 0', color: '#9019F9' }}>
							{user.userPublicId}
						</Title>
					</div>

					<div style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
						gap: 20,
					}}>
						<div style={{
							padding: 16,
							background: 'white',
							borderRadius: 8,
							border: '1px solid #f0f0f0',
						}}>
							<Text type="secondary" style={{ fontSize: 12 }}>Total Events</Text>
							<div style={{ fontSize: 28, fontWeight: 600, marginTop: 4, color: '#9019F9' }}>
								{user._count.events}
							</div>
						</div>

						<div style={{
							padding: 16,
							background: 'white',
							borderRadius: 8,
							border: '1px solid #f0f0f0',
						}}>
							<Text type="secondary" style={{ fontSize: 12 }}>First Event</Text>
							<div style={{ fontSize: 14, fontWeight: 500, marginTop: 8 }}>
								{user.firstEventTime
									? dayjs(user.firstEventTime).format('DD.MM.YYYY HH:mm:ss')
									: <Text type="secondary">-</Text>}
							</div>
						</div>

						<div style={{
							padding: 16,
							background: 'white',
							borderRadius: 8,
							border: '1px solid #f0f0f0',
						}}>
							<Text type="secondary" style={{ fontSize: 12 }}>Last Event</Text>
							<div style={{ fontSize: 14, fontWeight: 500, marginTop: 8 }}>
								{user.lastEventTime
									? dayjs(user.lastEventTime).format('DD.MM.YYYY HH:mm:ss')
									: <Text type="secondary">-</Text>}
							</div>
						</div>

						<div style={{
							padding: 16,
							background: 'white',
							borderRadius: 8,
							border: '1px solid #f0f0f0',
						}}>
							<Text type="secondary" style={{ fontSize: 12 }}>Created</Text>
							<div style={{ fontSize: 14, fontWeight: 500, marginTop: 8 }}>
								{dayjs(user.createdAt).format('DD.MM.YYYY HH:mm:ss')}
							</div>
						</div>
					</div>
				</Space>
			</Card>

			<Card bordered={false} style={{ borderRadius: 12, marginBottom: 24 }}>
				<Descriptions column={{ xs: 1, sm: 2 }} bordered>
					<Descriptions.Item label="User ID" span={2}>
						<Text code copyable style={{ fontSize: 12 }}>
							{user.id}
						</Text>
					</Descriptions.Item>
					<Descriptions.Item label="Created At">
						{dayjs(user.createdAt).format('DD.MM.YYYY HH:mm:ss')}
					</Descriptions.Item>
					<Descriptions.Item label="Updated At">
						{dayjs(user.updatedAt).format('DD.MM.YYYY HH:mm:ss')}
					</Descriptions.Item>
				</Descriptions>
			</Card>

			<Card
				title={
					<Space>
						<LineChartOutlined />
						<span>Event Timeline</span>
					</Space>
				}
				bordered={false}
				style={{ borderRadius: 12, marginBottom: 24 }}
			>
				<Space direction="vertical" size="middle" style={{ width: '100%' }}>
					<Space style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
						<Space wrap>
							<Segmented
								value={chartTimeRange}
								onChange={(value) => {
									setChartTimeRange(value as typeof chartTimeRange);
									if (value !== 'custom') {
										setCustomDateRange(null);
									}
								}}
								options={[
									{ label: 'Last 7 Days', value: '7d' },
									{ label: 'Last 30 Days', value: '30d' },
									{ label: 'Last 90 Days', value: '90d' },
									{ label: 'Custom', value: 'custom' },
								]}
							/>
							{chartTimeRange === 'custom' && (
								<RangePicker
									showTime={{ format: 'HH:mm' }}
									format="DD.MM.YYYY HH:mm"
									value={customDateRange}
									onChange={(dates) => setCustomDateRange(dates as [Dayjs, Dayjs] | null)}
									placeholder={['Start Date & Time', 'End Date & Time']}
								/>
							)}
						</Space>
						<Select
							placeholder="All Event Types"
							allowClear
							style={{ width: 200 }}
							value={chartEventType}
							onChange={(value) => setChartEventType(value)}
							options={[
								{ label: 'All Events', value: undefined },
								...(eventTypes?.map((type) => ({ label: type, value: type })) || []),
							]}
						/>
					</Space>

					{chartLoading ? (
						<div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
							<Text type="secondary">Loading chart...</Text>
						</div>
					) : (
						<ResponsiveContainer width="100%" height={300}>
							<LineChart data={timeSeriesData}>
								<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
								<XAxis
									dataKey="date"
									tickFormatter={(value) => {
										// If hourly data (contains T and time)
										if (value.includes('T')) {
											return dayjs(value).format('DD.MM HH:mm');
										}
										return dayjs(value).format('DD.MM');
									}}
									stroke="#94a3b8"
									style={{ fontSize: 12 }}
									angle={-45}
									textAnchor="end"
									height={60}
								/>
								<YAxis
									stroke="#94a3b8"
									style={{ fontSize: 12 }}
									allowDecimals={false}
								/>
								<Tooltip
									contentStyle={{
										backgroundColor: 'white',
										border: '1px solid #f0f0f0',
										borderRadius: 8,
									}}
									labelFormatter={(value) => {
										if (String(value).includes('T')) {
											return dayjs(value).format('DD.MM.YYYY HH:mm');
										}
										return dayjs(value).format('DD.MM.YYYY');
									}}
									formatter={(value) => [value || 0, 'Events']}
								/>
								<Line
									type="monotone"
									dataKey="count"
									stroke="#9019F9"
									strokeWidth={2}
									dot={{ fill: '#9019F9', r: 3 }}
									activeDot={{ r: 5 }}
								/>
							</LineChart>
						</ResponsiveContainer>
					)}

					{timeSeriesData && (
						<Text type="secondary" style={{ fontSize: 12 }}>
							Total: <Text strong style={{ color: '#9019F9' }}>
								{timeSeriesData.reduce((sum, item) => sum + item.count, 0)}
							</Text> events in selected period
						</Text>
					)}
				</Space>
			</Card>

			<Card
				title={
					<Space style={{ width: '100%', justifyContent: 'space-between' }}>
						<Space>
							<CalendarOutlined />
							<span>Events ({eventsData?.pagination?.total || 0})</span>
						</Space>
						<Select
							placeholder="Filter by event type"
							allowClear
							style={{ width: 250 }}
							value={eventTypeFilter}
							onChange={(value) => setEventTypeFilter(value)}
							options={[
								{ label: 'All Events', value: undefined },
								...(eventTypes?.map((type) => ({ label: type, value: type })) || []),
							]}
							suffixIcon={<FilterOutlined />}
						/>
					</Space>
				}
				bordered={false}
				style={{ borderRadius: 12 }}
			>
				<Table
					columns={eventColumns}
					dataSource={eventsData?.events || []}
					loading={eventsLoading}
					rowKey="id"
					onChange={eventsTable.handleTableChange}
					pagination={{
						total: eventsData?.pagination?.total || 0,
						current: eventsTable.page,
						pageSize: eventsTable.pageSize,
						showSizeChanger: true,
						showTotal: (total, range) => (
							<Text type="secondary">
								Showing <Text strong>{range[0]}-{range[1]}</Text> of <Text strong>{total}</Text> events
							</Text>
						),
					}}
					locale={{
						emptyText: 'No events found for this user',
					}}
				/>
			</Card>
		</Space>
	);
};

