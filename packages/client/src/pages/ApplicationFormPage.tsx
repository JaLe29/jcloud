import { useNavigate, useParams } from 'react-router-dom';
import { Card, Typography, Space, Button, Form, Input, message, Spin } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useEffect } from 'react';
import { trpc } from '../utils/trpc';

const { Title, Text } = Typography;

interface ApplicationFormValues {
	name: string;
	namespace: string;
}

export const ApplicationFormPage = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const utils = trpc.useUtils();
	const [form] = Form.useForm<ApplicationFormValues>();

	const isEditing = !!id;

	const { data: application, isLoading: isLoadingApplication } = trpc.application.getById.useQuery(
		{ id: id! },
		{
			enabled: isEditing,
			retry: false,
		},
	);

	const createMutation = trpc.application.create.useMutation({
		onSuccess: (data) => {
			message.success('Application created successfully');
			utils.application.list.invalidate();
			navigate(`/applications/${data.id}`);
		},
		onError: (error) => {
			message.error(`Failed to create application: ${error.message}`);
		},
	});

	const updateMutation = trpc.application.update.useMutation({
		onSuccess: () => {
			message.success('Application updated successfully');
			utils.application.list.invalidate();
			utils.application.getById.invalidate({ id: id! });
			navigate(`/applications/${id}`);
		},
		onError: (error) => {
			message.error(`Failed to update application: ${error.message}`);
		},
	});

	useEffect(() => {
		if (application) {
			form.setFieldsValue({
				name: application.name,
				namespace: application.namespace,
			});
		}
	}, [application, form]);

	const handleSubmit = (values: ApplicationFormValues) => {
		if (isEditing) {
			updateMutation.mutate({
				id: id!,
				name: values.name,
			});
		} else {
			createMutation.mutate(values);
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	if (isEditing && isLoadingApplication) {
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

	return (
		<Space direction="vertical" size="large" style={{ width: '100%' }}>
			<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
				Back
			</Button>

			<Card
				bordered={false}
				style={{
					borderRadius: 12,
					maxWidth: 600,
				}}
			>
				<Space direction="vertical" size="large" style={{ width: '100%' }}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
						<AppstoreOutlined style={{ fontSize: 28, color: '#0ea5e9' }} />
						<div>
							<Title level={3} style={{ margin: 0, color: '#0ea5e9' }}>
								{isEditing ? 'Edit Application' : 'Create New Application'}
							</Title>
							<Text type="secondary">
								{isEditing
									? 'Update the application details below'
									: 'Fill in the details to create a new application'}
							</Text>
						</div>
					</div>

					<Form
						form={form}
						layout="vertical"
						onFinish={handleSubmit}
						requiredMark="optional"
					>
						<Form.Item
							label="Application Name"
							name="name"
							rules={[
								{ required: true, message: 'Please enter application name' },
								{ min: 1, max: 100, message: 'Name must be between 1 and 100 characters' },
							]}
						>
							<Input
								placeholder="e.g., my-awesome-app"
								size="large"
								style={{ borderRadius: 8 }}
							/>
						</Form.Item>

						<Form.Item
							label="Namespace"
							name="namespace"
							rules={[
								{ required: !isEditing, message: 'Please enter namespace' },
								{ min: 1, max: 100, message: 'Namespace must be between 1 and 100 characters' },
							]}
							extra={isEditing ? 'Namespace cannot be changed after creation' : undefined}
						>
							<Input
								placeholder="e.g., production"
								size="large"
								style={{ borderRadius: 8 }}
								disabled={isEditing}
							/>
						</Form.Item>

						<Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
							<Space>
								<Button
									type="primary"
									htmlType="submit"
									icon={<SaveOutlined />}
									loading={isPending}
									size="large"
								>
									{isEditing ? 'Update Application' : 'Create Application'}
								</Button>
								<Button size="large" onClick={() => navigate(-1)}>
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
