import { useNavigate, useParams } from 'react-router-dom';
import { Card, Typography, Space, Button, Form, Input, InputNumber, message, Spin, Tag, Divider } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, CloudServerOutlined } from '@ant-design/icons';
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

	const createMutation = trpc.service.create.useMutation({
		onSuccess: () => {
			message.success('Service created successfully');
			utils.application.getById.invalidate({ id: applicationId! });
			navigate(`/applications/${applicationId}`);
		},
		onError: (error) => {
			message.error(`Failed to create service: ${error.message}`);
		},
	});

	const updateMutation = trpc.service.update.useMutation({
		onSuccess: () => {
			message.success('Service updated successfully');
			utils.application.getById.invalidate({ id: applicationId! });
			utils.service.getById.invalidate({ id: serviceId! });
			navigate(`/applications/${applicationId}`);
		},
		onError: (error) => {
			message.error(`Failed to update service: ${error.message}`);
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
			updateMutation.mutate({
				id: serviceId!,
				...values,
			});
		} else {
			createMutation.mutate({
				applicationId: applicationId!,
				...values,
			});
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	if (isLoadingApplication || (isEditing && isLoadingService)) {
		return (
			<Space direction="vertical" size="large" style={{ width: '100%' }}>
				<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
					Back
				</Button>
				<Card style={{ borderRadius: 12, textAlign: 'center', padding: 40 }}>
					<Spin size="large" />
				</Card>
			</Space>
		);
	}

	if (!application) {
		return (
			<Space direction="vertical" size="large" style={{ width: '100%' }}>
				<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
					Back
				</Button>
				<Card style={{ borderRadius: 12, textAlign: 'center', padding: 40 }}>
					<Title level={4}>Application not found</Title>
				</Card>
			</Space>
		);
	}

	return (
		<Space direction="vertical" size="large" style={{ width: '100%' }}>
			<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/applications/${applicationId}`)}>
				Back to Application
			</Button>

			<Card
				bordered={false}
				style={{
					borderRadius: 12,
					maxWidth: 700,
				}}
			>
				<Space direction="vertical" size="large" style={{ width: '100%' }}>
					<div>
						<Text type="secondary" style={{ fontSize: 12 }}>Application</Text>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
							<Text strong style={{ color: '#0ea5e9' }}>{application.name}</Text>
							<Tag color="blue">{application.namespace}</Tag>
						</div>
					</div>

					<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
						<CloudServerOutlined style={{ fontSize: 28, color: '#10b981' }} />
						<div>
							<Title level={3} style={{ margin: 0, color: '#10b981' }}>
								{isEditing ? 'Edit Service' : 'Add New Service'}
							</Title>
							<Text type="secondary">
								{isEditing
									? 'Update the service details below'
									: 'Fill in the details to add a new service'}
							</Text>
						</div>
					</div>

					<Form
						form={form}
						layout="vertical"
						onFinish={handleSubmit}
						requiredMark="optional"
						initialValues={{ replicas: 1 }}
					>
						<Form.Item
							label="Service Name"
							name="name"
							rules={[
								{ required: true, message: 'Please enter service name' },
								{ min: 1, max: 100, message: 'Name must be between 1 and 100 characters' },
							]}
						>
							<Input
								placeholder="e.g., api-gateway"
								size="large"
								style={{ borderRadius: 8 }}
							/>
						</Form.Item>

						<Form.Item
							label="Replicas"
							name="replicas"
							rules={[{ required: true, message: 'Please enter number of replicas' }]}
						>
							<InputNumber
								min={0}
								max={100}
								size="large"
								style={{ width: '100%', borderRadius: 8 }}
								placeholder="1"
							/>
						</Form.Item>

						<Form.Item
							label="Ingress URL"
							name="ingressUrl"
							rules={[{ type: 'url', message: 'Please enter a valid URL' }]}
						>
							<Input
								placeholder="e.g., https://api.example.com"
								size="large"
								style={{ borderRadius: 8 }}
							/>
						</Form.Item>

						<Divider>Resources</Divider>

						<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
							<Form.Item
								label="CPU Request (millicores)"
								name="cpuRequest"
							>
								<InputNumber
									min={0}
									size="large"
									style={{ width: '100%', borderRadius: 8 }}
									placeholder="e.g., 100"
								/>
							</Form.Item>

							<Form.Item
								label="CPU Limit (millicores)"
								name="cpuLimit"
							>
								<InputNumber
									min={0}
									size="large"
									style={{ width: '100%', borderRadius: 8 }}
									placeholder="e.g., 500"
								/>
							</Form.Item>

							<Form.Item
								label="Memory Request (MB)"
								name="memoryRequest"
							>
								<InputNumber
									min={0}
									size="large"
									style={{ width: '100%', borderRadius: 8 }}
									placeholder="e.g., 128"
								/>
							</Form.Item>

							<Form.Item
								label="Memory Limit (MB)"
								name="memoryLimit"
							>
								<InputNumber
									min={0}
									size="large"
									style={{ width: '100%', borderRadius: 8 }}
									placeholder="e.g., 512"
								/>
							</Form.Item>
						</div>

						<Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
							<Space>
								<Button
									type="primary"
									htmlType="submit"
									icon={<SaveOutlined />}
									loading={isPending}
									size="large"
									style={{ background: '#10b981', borderColor: '#10b981' }}
								>
									{isEditing ? 'Update Service' : 'Add Service'}
								</Button>
								<Button size="large" onClick={() => navigate(`/applications/${applicationId}`)}>
									Cancel
								</Button>
							</Space>
						</Form.Item>
					</Form>
				</Space>
			</Card>
		</Space>
	);
};
