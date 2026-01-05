import { useNavigate, useParams } from 'react-router-dom';
import { Card, Typography, Space, Button, Form, Input, message, Spin } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
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
			message.success('Application created');
			utils.application.list.invalidate();
			navigate(`/applications/${data.id}`);
		},
		onError: (error) => {
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
		onError: (error) => {
			message.error(error.message);
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
				<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Back</Button>
				<Card style={{ textAlign: 'center', padding: 40 }}>
					<Spin />
				</Card>
			</Space>
		);
	}

	return (
		<Space direction="vertical" size="large" style={{ width: '100%' }}>
			<Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>Back</Button>

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

					<Form
						form={form}
						layout="vertical"
						onFinish={handleSubmit}
						requiredMark={false}
					>
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
