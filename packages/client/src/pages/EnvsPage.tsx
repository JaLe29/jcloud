import {
	CloseCircleOutlined,
	DeleteOutlined,
	EditOutlined,
	FilterOutlined,
	LockOutlined,
	PlusOutlined,
	SearchOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Modal, message, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useServerTable } from '../hooks/useServerTable';
import { trpc } from '../utils/trpc';

const { Title, Text } = Typography;

interface ServiceInfo {
	id: string;
	name: string;
	application: {
		id: string;
		name: string;
	};
}

interface EnvData {
	id: string;
	name: string;
	key: string;
	value: string;
	createdAt: Date;
	services: ServiceInfo[];
}

interface EnvFilter {
	key?: string;
	serviceId?: string;
	applicationId?: string;
}

interface EnvFormValues {
	name: string;
	key: string;
	value: string;
	serviceIds: string[];
}

export const EnvsPage = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const utils = trpc.useUtils();

	// Get initial filter from URL
	const urlServiceId = searchParams.get('serviceId') || undefined;
	const urlApplicationId = searchParams.get('applicationId') || undefined;

	const table = useServerTable<EnvData, EnvFilter>({
		initialPage: 1,
		initialPageSize: 10,
		initialSortBy: 'key',
		initialSortOrder: 'asc',
		initialFilter: {
			serviceId: urlServiceId,
			applicationId: urlApplicationId,
		},
	});

	const [searchValue, setSearchValue] = useState('');
	const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(urlServiceId);
	const [selectedApplicationId, setSelectedApplicationId] = useState<string | undefined>(urlApplicationId);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingEnv, setEditingEnv] = useState<EnvData | null>(null);
	const [form] = Form.useForm<EnvFormValues>();

	// Update filter when search or dropdowns change
	useEffect(() => {
		const timer = setTimeout(() => {
			const trimmed = searchValue.trim();
			const newFilter: EnvFilter = {};

			if (trimmed) {
				newFilter.key = trimmed;
			}
			if (selectedServiceId) {
				newFilter.serviceId = selectedServiceId;
			}
			if (selectedApplicationId && !selectedServiceId) {
				newFilter.applicationId = selectedApplicationId;
			}

			table.handleFilterChange(Object.keys(newFilter).length > 0 ? newFilter : undefined);
		}, 300);

		return () => clearTimeout(timer);
	}, [searchValue, selectedServiceId, selectedApplicationId, table.handleFilterChange]);

	// Update URL when filters change
	useEffect(() => {
		const params = new URLSearchParams();
		if (selectedServiceId) {
			params.set('serviceId', selectedServiceId);
		} else if (selectedApplicationId) {
			params.set('applicationId', selectedApplicationId);
		}

		setSearchParams(params, { replace: true });
	}, [selectedServiceId, selectedApplicationId, setSearchParams]);

	const { data, isLoading, error } = trpc.env.list.useQuery({
		page: table.page,
		limit: table.pageSize,
		sortBy: table.sortBy as 'createdAt' | 'updatedAt' | 'key' | undefined,
		sortOrder: table.sortOrder,
		filter: table.filter,
	});

	const { data: applicationsData } = trpc.application.list.useQuery({ limit: 100 });

	const { data: envDetail } = trpc.env.getById.useQuery(
		{ id: editingEnv?.id ?? '' },
		{
			enabled: !!editingEnv,
			retry: false,
			onError: error => {
				message.error(error.message);
				closeModal();
			},
		},
	);

	// Build application options
	const applicationOptions = useMemo(
		() =>
			applicationsData?.applications.map(app => ({
				label: app.name,
				value: app.id,
			})) || [],
		[applicationsData],
	);

	// Build service options - all services or filtered by selected application
	const serviceOptions = useMemo(() => {
		if (!applicationsData) {
			return [];
		}

		const apps = selectedApplicationId
			? applicationsData.applications.filter(app => app.id === selectedApplicationId)
			: applicationsData.applications;

		return apps.flatMap(app =>
			app.services.map(service => ({
				label: `${app.name} / ${service.name}`,
				value: service.id,
			})),
		);
	}, [applicationsData, selectedApplicationId]);

	// All service options for the form
	const allServiceOptions = useMemo(
		() =>
			applicationsData?.applications.flatMap(app =>
				app.services.map(service => ({
					label: `${app.name} / ${service.name}`,
					value: service.id,
				})),
			) || [],
		[applicationsData],
	);

	// Get active filter info for display
	const activeFilterInfo = useMemo(() => {
		if (selectedServiceId) {
			const service = applicationsData?.applications
				.flatMap(a => a.services.map(s => ({ ...s, appName: a.name })))
				.find(s => s.id === selectedServiceId);
			if (service) {
				return `${service.appName} / ${service.name}`;
			}
		}
		if (selectedApplicationId) {
			const app = applicationsData?.applications.find(a => a.id === selectedApplicationId);
			if (app) {
				return app.name;
			}
		}
		return null;
	}, [selectedServiceId, selectedApplicationId, applicationsData]);

	const createMutation = trpc.env.create.useMutation({
		onSuccess: () => {
			message.success('Environment variable created');
			utils.env.list.invalidate();
			closeModal();
		},
		onError: error => message.error(error.message),
	});

	const updateMutation = trpc.env.update.useMutation({
		onSuccess: () => {
			message.success('Environment variable updated');
			utils.env.list.invalidate();
			closeModal();
		},
		onError: error => message.error(error.message),
	});

	const deleteMutation = trpc.env.delete.useMutation({
		onSuccess: () => {
			message.success('Environment variable deleted');
			utils.env.list.invalidate();
		},
		onError: error => message.error(error.message),
	});

	const openCreateModal = () => {
		setEditingEnv(null);
		form.resetFields();
		// Pre-select service if filtering by one
		if (selectedServiceId) {
			form.setFieldsValue({ serviceIds: [selectedServiceId] });
		}
		setIsModalOpen(true);
	};

	const openEditModal = (env: EnvData) => {
		setEditingEnv(env);
		setIsModalOpen(true);
	};

	useEffect(() => {
		if (envDetail && editingEnv) {
			form.setFieldsValue({
				name: envDetail.name,
				key: envDetail.key,
				value: envDetail.value,
				serviceIds: envDetail.services.map(s => s.id),
			});
		}
	}, [envDetail, editingEnv, form]);

	const closeModal = () => {
		setIsModalOpen(false);
		setEditingEnv(null);
		form.resetFields();
	};

	const handleSubmit = (values: EnvFormValues) => {
		if (editingEnv) {
			updateMutation.mutate({
				id: editingEnv.id,
				name: values.name,
				key: values.key,
				value: values.value,
				serviceIds: values.serviceIds,
			});
		} else {
			createMutation.mutate({
				name: values.name,
				key: values.key,
				value: values.value,
				serviceIds: values.serviceIds,
			});
		}
	};

	const handleDelete = (env: EnvData) => {
		Modal.confirm({
			title: `Delete "${env.key}"?`,
			okText: 'Delete',
			okType: 'danger',
			onOk: () => deleteMutation.mutate({ id: env.id }),
		});
	};

	const clearFilters = () => {
		setSelectedApplicationId(undefined);
		setSelectedServiceId(undefined);
		setSearchValue('');
	};

	const columns: ColumnsType<EnvData> = [
		{
			title: 'Name',
			dataIndex: 'name',
			key: 'name',
			render: (text: string) => text || <Text type="secondary">—</Text>,
		},
		{
			title: 'Key',
			dataIndex: 'key',
			key: 'key',
			render: (text: string) => <Text strong>{text}</Text>,
			sorter: true,
			sortOrder: table.getSortOrder('key'),
		},
		{
			title: 'Value',
			dataIndex: 'value',
			key: 'value',
			render: () => (
				<Text type="secondary">
					<LockOutlined /> ••••••••
				</Text>
			),
		},
		{
			title: 'Services',
			key: 'services',
			render: (_, record) => (
				<Space wrap size={[4, 4]}>
					{record.services.length === 0 ? (
						<Text type="secondary">None</Text>
					) : (
						record.services.map(s => (
							<Tag key={s.id}>
								{s.application.name}/{s.name}
							</Tag>
						))
					)}
				</Space>
			),
		},
		{
			title: 'Updated',
			dataIndex: 'createdAt',
			key: 'createdAt',
			width: 140,
			render: (date: Date) => <Text type="secondary">{dayjs(date).format('DD.MM.YYYY HH:mm')}</Text>,
			sorter: true,
			sortOrder: table.getSortOrder('createdAt'),
		},
		{
			title: '',
			key: 'actions',
			width: 80,
			render: (_, record) => (
				<Space>
					<Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
					<Button
						type="text"
						size="small"
						danger
						icon={<DeleteOutlined />}
						onClick={() => handleDelete(record)}
					/>
				</Space>
			),
		},
	];

	if (error) {
		return <Alert message="Error" description={error.message} type="error" showIcon />;
	}

	return (
		<Space direction="vertical" size="large" style={{ width: '100%' }}>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'flex-start',
					flexWrap: 'wrap',
					gap: 16,
				}}
			>
				<div>
					<Title level={2} style={{ marginBottom: 4 }}>
						Environment Variables
					</Title>
					<Space size="small">
						{data?.pagination && (
							<Text type="secondary">
								{data.pagination.total} variable{data.pagination.total !== 1 ? 's' : ''}
							</Text>
						)}
						{activeFilterInfo && (
							<Tag icon={<FilterOutlined />} color="blue" closable onClose={clearFilters}>
								{activeFilterInfo}
							</Tag>
						)}
					</Space>
				</div>

				<Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
					New Variable
				</Button>
			</div>

			<Card size="small">
				<Space wrap style={{ width: '100%' }}>
					<Input
						placeholder="Search by key..."
						prefix={<SearchOutlined style={{ opacity: 0.5 }} />}
						allowClear
						value={searchValue}
						onChange={e => setSearchValue(e.target.value)}
						style={{ width: 200 }}
					/>
					<Select
						placeholder="Filter by application"
						allowClear
						value={selectedApplicationId}
						onChange={value => {
							setSelectedApplicationId(value);
							setSelectedServiceId(undefined); // Reset service when app changes
						}}
						options={applicationOptions}
						style={{ width: 180 }}
					/>
					<Select
						placeholder="Filter by service"
						allowClear
						showSearch
						optionFilterProp="label"
						value={selectedServiceId}
						onChange={setSelectedServiceId}
						options={serviceOptions}
						style={{ width: 220 }}
					/>
					{(selectedApplicationId || selectedServiceId || searchValue) && (
						<Button type="text" icon={<CloseCircleOutlined />} onClick={clearFilters}>
							Clear
						</Button>
					)}
				</Space>
			</Card>

			<Card>
				<Table
					columns={columns}
					dataSource={data?.envs || []}
					loading={isLoading}
					rowKey="id"
					onChange={table.handleTableChange}
					pagination={{
						total: data?.pagination?.total || 0,
						current: table.page,
						pageSize: table.pageSize,
						showSizeChanger: true,
						showTotal: total => `${total} items`,
					}}
				/>
			</Card>

			<Modal
				title={editingEnv ? 'Edit Variable' : 'New Variable'}
				open={isModalOpen}
				onCancel={closeModal}
				footer={null}
				destroyOnClose
			>
				<Form
					form={form}
					layout="vertical"
					onFinish={handleSubmit}
					requiredMark={false}
					style={{ marginTop: 24 }}
				>
					<Form.Item label="Name" name="name">
						<Input placeholder="Optional descriptive name" />
					</Form.Item>

					<Form.Item
						label="Key"
						name="key"
						rules={[
							{ required: true, message: 'Required' },
							{ pattern: /^[A-Z_][A-Z0-9_]*$/, message: 'Use UPPER_SNAKE_CASE' },
						]}
					>
						<Input placeholder="DATABASE_URL" />
					</Form.Item>

					<Form.Item label="Value" name="value" rules={[{ required: true, message: 'Required' }]}>
						<Input.TextArea rows={3} placeholder="Enter secret value" />
					</Form.Item>

					<Form.Item label="Assign to Services" name="serviceIds">
						<Select
							mode="multiple"
							placeholder="Select services"
							options={allServiceOptions}
							optionFilterProp="label"
							showSearch
						/>
					</Form.Item>

					<Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
						<Space>
							<Button
								type="primary"
								htmlType="submit"
								loading={createMutation.isPending || updateMutation.isPending}
							>
								{editingEnv ? 'Save' : 'Create'}
							</Button>
							<Button onClick={closeModal}>Cancel</Button>
						</Space>
					</Form.Item>
				</Form>
			</Modal>
		</Space>
	);
};
