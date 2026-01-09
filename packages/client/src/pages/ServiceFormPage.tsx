import { ArrowLeftOutlined, LockOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Card, Divider, Form, Input, InputNumber, message, Space, Spin, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { trpc } from '../utils/trpc';

const { Title, Text } = Typography;

interface ServiceFormValues {
	name: string;
	replicas: number;
	containerPort: number;
	ingressUrl?: string | null;
	cpuRequest?: number | null;
	cpuLimit?: number | null;
	memoryRequest?: number | null;
	memoryLimit?: number | null;
	livenessProbePath?: string | null;
	livenessProbeInitialDelaySeconds?: number | null;
	livenessProbePeriodSeconds?: number | null;
	livenessProbeTimeoutSeconds?: number | null;
	livenessProbeSuccessThreshold?: number | null;
	livenessProbeFailureThreshold?: number | null;
	readinessProbePath?: string | null;
	readinessProbeInitialDelaySeconds?: number | null;
	readinessProbePeriodSeconds?: number | null;
	readinessProbeTimeoutSeconds?: number | null;
	readinessProbeSuccessThreshold?: number | null;
	readinessProbeFailureThreshold?: number | null;
	maxSurge?: string | null;
	maxUnavailable?: string | null;
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

	const { data: serviceEnvs } = trpc.env.getByServiceId.useQuery({ serviceId: serviceId! }, { enabled: isEditing });

	const createMutation = trpc.service.create.useMutation({
		onSuccess: () => {
			message.success('Service created');
			utils.application.getById.invalidate({ id: applicationId! });
			navigate(`/applications/${applicationId}`);
		},
		onError: error => {
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
		onError: error => {
			message.error(error.message);
		},
	});

	useEffect(() => {
		if (service) {
			form.setFieldsValue({
				name: service.name,
				replicas: service.replicas,
				containerPort: service.containerPort,
				ingressUrl: service.ingressUrl,
				cpuRequest: service.cpuRequest,
				cpuLimit: service.cpuLimit,
				memoryRequest: service.memoryRequest,
				memoryLimit: service.memoryLimit,
				livenessProbePath: (service as any).livenessProbePath,
				livenessProbeInitialDelaySeconds: (service as any).livenessProbeInitialDelaySeconds,
				livenessProbePeriodSeconds: (service as any).livenessProbePeriodSeconds,
				livenessProbeTimeoutSeconds: (service as any).livenessProbeTimeoutSeconds,
				livenessProbeSuccessThreshold: (service as any).livenessProbeSuccessThreshold,
				livenessProbeFailureThreshold: (service as any).livenessProbeFailureThreshold,
				readinessProbePath: (service as any).readinessProbePath,
				readinessProbeInitialDelaySeconds: (service as any).readinessProbeInitialDelaySeconds,
				readinessProbePeriodSeconds: (service as any).readinessProbePeriodSeconds,
				readinessProbeTimeoutSeconds: (service as any).readinessProbeTimeoutSeconds,
				readinessProbeSuccessThreshold: (service as any).readinessProbeSuccessThreshold,
				readinessProbeFailureThreshold: (service as any).readinessProbeFailureThreshold,
				maxSurge: (service as any).maxSurge,
				maxUnavailable: (service as any).maxUnavailable,
			});
		}
	}, [service, form]);

	const handleSubmit = (values: ServiceFormValues) => {
		// Convert empty string to null for ingressUrl
		const processedValues = {
			...values,
			ingressUrl: values.ingressUrl?.trim() === '' ? null : values.ingressUrl,
		};
		if (isEditing) {
			updateMutation.mutate({ id: serviceId!, ...processedValues });
		} else {
			createMutation.mutate({ applicationId: applicationId!, ...processedValues });
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
				<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
					Back
				</Button>
				<Card style={{ textAlign: 'center', padding: 40 }}>
					<Spin />
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
						<Text type="secondary" style={{ fontSize: 12 }}>
							Application
						</Text>
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

						<Form.Item label="Replicas" name="replicas" rules={[{ required: true, message: 'Required' }]}>
							<InputNumber min={0} max={100} style={{ width: '100%' }} />
						</Form.Item>

						<Form.Item
							label="Container Port"
							name="containerPort"
							rules={[
								{ required: true, message: 'Required' },
								{ type: 'number', min: 1, max: 65535, message: 'Port must be between 1 and 65535' },
							]}
						>
							<InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="8080" />
						</Form.Item>

						<Form.Item
							label="Ingress URL"
							name="ingressUrl"
							rules={[
								{
									validator: (_, value) => {
										if (!value || value.trim() === '') {
											return Promise.resolve();
										}
										try {
											new URL(value);
											return Promise.resolve();
										} catch {
											return Promise.reject(new Error('Invalid URL'));
										}
									},
								},
							]}
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

						<Divider>Health Probes</Divider>

						<Space direction="vertical" size="middle" style={{ width: '100%' }}>
							<Card size="small" title="Liveness Probe">
								<Form.Item label="Path" name="livenessProbePath">
									<Input placeholder="/health" />
								</Form.Item>
								<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
									<Form.Item label="Initial Delay (s)" name="livenessProbeInitialDelaySeconds">
										<InputNumber min={0} style={{ width: '100%' }} placeholder="30" />
									</Form.Item>
									<Form.Item label="Period (s)" name="livenessProbePeriodSeconds">
										<InputNumber min={1} style={{ width: '100%' }} placeholder="10" />
									</Form.Item>
									<Form.Item label="Timeout (s)" name="livenessProbeTimeoutSeconds">
										<InputNumber min={1} style={{ width: '100%' }} placeholder="5" />
									</Form.Item>
									<Form.Item label="Success Threshold" name="livenessProbeSuccessThreshold">
										<InputNumber min={1} style={{ width: '100%' }} placeholder="1" />
									</Form.Item>
									<Form.Item label="Failure Threshold" name="livenessProbeFailureThreshold">
										<InputNumber min={1} style={{ width: '100%' }} placeholder="3" />
									</Form.Item>
								</div>
							</Card>

							<Card size="small" title="Readiness Probe">
								<Form.Item label="Path" name="readinessProbePath">
									<Input placeholder="/ready" />
								</Form.Item>
								<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
									<Form.Item label="Initial Delay (s)" name="readinessProbeInitialDelaySeconds">
										<InputNumber min={0} style={{ width: '100%' }} placeholder="5" />
									</Form.Item>
									<Form.Item label="Period (s)" name="readinessProbePeriodSeconds">
										<InputNumber min={1} style={{ width: '100%' }} placeholder="10" />
									</Form.Item>
									<Form.Item label="Timeout (s)" name="readinessProbeTimeoutSeconds">
										<InputNumber min={1} style={{ width: '100%' }} placeholder="5" />
									</Form.Item>
									<Form.Item label="Success Threshold" name="readinessProbeSuccessThreshold">
										<InputNumber min={1} style={{ width: '100%' }} placeholder="1" />
									</Form.Item>
									<Form.Item label="Failure Threshold" name="readinessProbeFailureThreshold">
										<InputNumber min={1} style={{ width: '100%' }} placeholder="3" />
									</Form.Item>
								</div>
							</Card>
						</Space>

						<Divider>Rolling Update</Divider>

						<Card size="small" title="Rolling Update Strategy">
							<Space direction="vertical" style={{ width: '100%' }}>
								<Form.Item
									label="Max Surge"
									name="maxSurge"
									tooltip="Maximum number of pods that can be created above the desired number of pods. Can be a number (e.g., '1') or a percentage (e.g., '25%')."
								>
									<Input placeholder="25% or 1" />
								</Form.Item>
								<Form.Item
									label="Max Unavailable"
									name="maxUnavailable"
									tooltip="Maximum number of pods that can be unavailable during the update. Can be a number (e.g., '0') or a percentage (e.g., '25%')."
								>
									<Input placeholder="25% or 0" />
								</Form.Item>
							</Space>
						</Card>

						<Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
							<Space>
								<Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={isPending}>
									{isEditing ? 'Save' : 'Create'}
								</Button>
								<Button onClick={() => navigate(`/applications/${applicationId}`)}>Cancel</Button>
							</Space>
						</Form.Item>
					</Form>
				</Space>
			</Card>

			{isEditing && (
				<Card
					title={`Environment Variables (${serviceEnvs?.length || 0})`}
					extra={
						<Button icon={<PlusOutlined />} onClick={() => navigate(`/envs?serviceId=${serviceId}`)}>
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
