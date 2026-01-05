import { useNavigate, useParams } from 'react-router-dom';
import { Card, Typography, Space, Button, Form, Input, InputNumber, message, Spin, Tag, Divider, Table } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, PlusOutlined, LockOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useEffect } from 'react';
import { trpc } from '../utils/trpc';

const { Title, Text } = Typography;

interface ServiceFormValues {
	name: string;
	replicas: number;
	ingressUrl?: string | null;
	cpuRequest?: number | null;
	cpuLimit?: number | null;
	memoryRequest?: number | null;
	memoryLimit?: number | null;
}

interface EnvData {
	id: string;
	key: string;
	value: string;
}

export const ServiceFormPage = () => {
	const { applicationId, serviceId } = useParams<{ applicationId: string; serviceId: string }>();
	const navigate = useNavigate();
	const utils = trpc.useUtils();
	const [form] = Form.useForm<ServiceFormValues>();

	const isEditing = !!serviceId;

	const { data: application, isLoading: isLoadingApplication } = trpc.application.getById.useQuery(
		{ id: applicationId! },
		{
			enabled: !!applicationId,
			retry: false,
		},
	);

	const { data: service, isLoading: isLoadingService } = trpc.service.getById.useQuery(
		{ id: serviceId! },
		{
			enabled: isEditing,
			retry: false,
		},
	);

	const { data: serviceEnvs } = trpc.env.getByServiceId.useQuery(
		{ serviceId: serviceId! },
		{ enabled: isEditing },
	);

	const createMutation = trpc.service.create.useMutation({
		onSuccess: () => {
			message.success('Service created');
			utils.application.getById.invalidate({ id: applicationId! });
			navigate(`/applications/${applicationId}`);
		},
		onError: (error) => {
			message.error(error.message);
		},
	});

	const updateMutation = trpc.service.update.useMutation({
		onSuccess: () => {
			message.success('Service updated');
			utils.application.getById.invalidate({ id: applicationId! });
			utils.service.getById.invalidate({ id: serviceId! });
			navigate(`/applications/${applicationId}`);
		},
		onError: (error) => {
			message.error(error.message);
		},
	});

	useEffect(() => {
		if (service) {
			form.setFieldsValue({
				name: service.name,
				replicas: service.replicas,
				ingressUrl: service.ingressUrl,
				cpuRequest: service.cpuRequest,
				cpuLimit: service.cpuLimit,
				memoryRequest: service.memoryRequest,
				memoryLimit: service.memoryLimit,
			});
		}
	}, [service, form]);

	const handleSubmit = (values: ServiceFormValues) => {
		if (isEditing) {
			updateMutation.mutate({ id: serviceId!, ...values });
		} else {
			createMutation.mutate({ applicationId: applicationId!, ...values });
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	const envColumns: ColumnsType<EnvData> = [
		{
			title: 'Key',
			dataIndex: 'key',
			key: 'key',
			render: (text: string) => <Text strong>{text}</Text>,
		},
		{
			title: 'Value',
			key: 'value',
			render: () => (
				<Text type="secondary">
					<LockOutlined /> ••••••••
				</Text>
			),
		},
	];

	if (isLoadingApplication || (isEditing && isLoadingService)) {
		return (
			<Space direction="vertical" size="large" style={{ width: '100%' }}>
				<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Back</Button>
				<Card style={{ textAlign: 'center', padding: 40 }}>
					<Spin />
				</Card>
			</Space>
		);
	}

	if (!application) {
		return (
			<Space direction="vertical" size="large" style={{ width: '100%' }}>
				<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Back</Button>
				<Card style={{ textAlign: 'center', padding: 40 }}>
					<Title level={4}>Application not found</Title>
				</Card>
			</Space>
		);
	}

	return (
		<Space direction="vertical" size="large" style={{ width: '100%' }}>
			<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/applications/${applicationId}`)}>
				Back
			</Button>

			<Card style={{ maxWidth: 600 }}>
				<Space direction="vertical" size="large" style={{ width: '100%' }}>
					<div>
						<Text type="secondary" style={{ fontSize: 12 }}>Application</Text>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
							<Text strong>{application.name}</Text>
							<Tag>{application.namespace}</Tag>
						</div>
					</div>

					<div>
						<Title level={3} style={{ marginBottom: 4 }}>
							{isEditing ? 'Edit Service' : 'New Service'}
						</Title>
						<Text type="secondary">
							{isEditing ? 'Update service configuration' : 'Add a new service to this application'}
						</Text>
					</div>

					<Form
						form={form}
						layout="vertical"
						onFinish={handleSubmit}
						requiredMark={false}
						initialValues={{ replicas: 1 }}
					>
						<Form.Item
							label="Name"
							name="name"
							rules={[
								{ required: true, message: 'Required' },
								{ max: 100, message: 'Max 100 characters' },
							]}
						>
							<Input placeholder="api-gateway" />
						</Form.Item>

						<Form.Item
							label="Replicas"
							name="replicas"
							rules={[{ required: true, message: 'Required' }]}
						>
							<InputNumber min={0} max={100} style={{ width: '100%' }} />
						</Form.Item>

						<Form.Item
							label="Ingress URL"
							name="ingressUrl"
							rules={[{ type: 'url', message: 'Invalid URL' }]}
						>
							<Input placeholder="https://api.example.com" />
						</Form.Item>

						<Divider>Resources</Divider>

						<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
							<Form.Item label="CPU Request (m)" name="cpuRequest">
								<InputNumber min={0} style={{ width: '100%' }} placeholder="100" />
							</Form.Item>

							<Form.Item label="CPU Limit (m)" name="cpuLimit">
								<InputNumber min={0} style={{ width: '100%' }} placeholder="500" />
							</Form.Item>

							<Form.Item label="Memory Request (MB)" name="memoryRequest">
								<InputNumber min={0} style={{ width: '100%' }} placeholder="128" />
							</Form.Item>

							<Form.Item label="Memory Limit (MB)" name="memoryLimit">
								<InputNumber min={0} style={{ width: '100%' }} placeholder="512" />
							</Form.Item>
						</div>

						<Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
							<Space>
								<Button
									type="primary"
									htmlType="submit"
									icon={<SaveOutlined />}
									loading={isPending}
								>
									{isEditing ? 'Save' : 'Create'}
								</Button>
								<Button onClick={() => navigate(`/applications/${applicationId}`)}>
									Cancel
								</Button>
							</Space>
						</Form.Item>
					</Form>
				</Space>
			</Card>

			{isEditing && (
				<Card
					title={`Environment Variables (${serviceEnvs?.length || 0})`}
					extra={
						<Button
							icon={<PlusOutlined />}
							onClick={() => navigate(`/envs?serviceId=${serviceId}`)}
						>
							Manage Variables
						</Button>
					}
				>
					<Table
						columns={envColumns}
						dataSource={serviceEnvs || []}
						rowKey="id"
						pagination={false}
						size="small"
						locale={{
							emptyText: (
								<Space direction="vertical" size="middle" style={{ padding: 24 }}>
									<Text type="secondary">No environment variables assigned</Text>
									<Button
										icon={<PlusOutlined />}
										onClick={() => navigate(`/envs?serviceId=${serviceId}`)}
									>
										Add Variable
									</Button>
								</Space>
							),
						}}
					/>
				</Card>
			)}
		</Space>
	);
};
