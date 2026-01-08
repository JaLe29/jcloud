import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, message, Select, Space, Spin, Typography } from 'antd';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useClusterStore } from '../stores/clusterStore';
import { trpc } from '../utils/trpc';

const { Title, Text } = Typography;

interface ApplicationFormValues {
	name: string;
	namespace: string;
	clusterId: string;
}

export const ApplicationFormPage = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const utils = trpc.useUtils();
	const [form] = Form.useForm<ApplicationFormValues>();
	const { selectedClusterId } = useClusterStore();

	const isEditing = !!id;

	const { data: clusters } = trpc.cluster.list.useQuery();

	const { data: application, isLoading: isLoadingApplication } = trpc.application.getById.useQuery(
		{ id: id! },
		{
			enabled: isEditing,
			retry: false,
		},
	);

	const createMutation = trpc.application.create.useMutation({
		onSuccess: data => {
			message.success('Application created');
			utils.application.list.invalidate();
			navigate(`/applications/${data.id}`);
		},
		onError: error => {
			message.error(error.message);
		},
	});

	const updateMutation = trpc.application.update.useMutation({
		onSuccess: () => {
			message.success('Application updated');
			utils.application.list.invalidate();
			utils.application.getById.invalidate({ id: id! });
			navigate(`/applications/${id}`);
		},
		onError: error => {
			message.error(error.message);
		},
	});

	useEffect(() => {
		if (application) {
			form.setFieldsValue({
				name: application.name,
				namespace: application.namespace,
				clusterId: application.clusterId,
			});
		} else if (!isEditing && selectedClusterId && clusters) {
			// Only pre-fill if the selected cluster actually exists in the list
			const clusterExists = clusters.some(c => c.id === selectedClusterId);
			if (clusterExists) {
				form.setFieldsValue({
					clusterId: selectedClusterId,
				});
			}
		}
	}, [application, form, isEditing, selectedClusterId, clusters]);

	const handleSubmit = (values: ApplicationFormValues) => {
		if (isEditing) {
			updateMutation.mutate({
				id: id!,
				name: values.name,
			});
		} else {
			if (!values.clusterId) {
				message.error('Please select a cluster');
				return;
			}
			createMutation.mutate({
				name: values.name,
				namespace: values.namespace,
				clusterId: values.clusterId,
			});
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	if (isEditing && isLoadingApplication) {
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

	return (
		<Space direction="vertical" size="large" style={{ width: '100%' }}>
			<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
				Back
			</Button>

			<Card style={{ maxWidth: 500 }}>
				<Space direction="vertical" size="large" style={{ width: '100%' }}>
					<div>
						<Title level={3} style={{ marginBottom: 4 }}>
							{isEditing ? 'Edit Application' : 'New Application'}
						</Title>
						<Text type="secondary">
							{isEditing ? 'Update application details' : 'Create a new application'}
						</Text>
					</div>

					{!isEditing && !selectedClusterId && (
						<Alert
							message="No cluster selected"
							description="Please select a cluster from the dropdown in the header before creating an application."
							type="warning"
							showIcon
						/>
					)}

					<Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
						<Form.Item
							label="Cluster"
							name="clusterId"
							rules={[{ required: !isEditing, message: 'Required' }]}
							extra={isEditing ? 'Cannot be changed' : undefined}
						>
							<Select
								placeholder="Select cluster"
								disabled={isEditing}
								options={clusters?.map(cluster => ({
									label: cluster.name,
									value: cluster.id,
								}))}
							/>
						</Form.Item>

						<Form.Item
							label="Name"
							name="name"
							rules={[
								{ required: true, message: 'Required' },
								{ max: 100, message: 'Max 100 characters' },
							]}
						>
							<Input placeholder="my-app" />
						</Form.Item>

						<Form.Item
							label="Namespace"
							name="namespace"
							rules={[
								{ required: !isEditing, message: 'Required' },
								{ max: 100, message: 'Max 100 characters' },
							]}
							extra={isEditing ? 'Cannot be changed' : undefined}
						>
							<Input placeholder="production" disabled={isEditing} />
						</Form.Item>

						<Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
							<Space>
								<Button
									type="primary"
									htmlType="submit"
									icon={<SaveOutlined />}
									loading={isPending}
									disabled={!isEditing && !selectedClusterId}
								>
									{isEditing ? 'Save' : 'Create'}
								</Button>
								<Button onClick={() => navigate(-1)}>Cancel</Button>
							</Space>
						</Form.Item>
					</Form>
				</Space>
			</Card>
		</Space>
	);
};
