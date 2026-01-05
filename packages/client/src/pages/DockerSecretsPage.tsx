import { Table, Typography, Space, Alert, Card, Button, Modal, Form, Input, message, Select } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, LockOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useState, useEffect, useMemo } from 'react';
import { trpc } from '../utils/trpc';

const { Title, Text } = Typography;

interface DockerSecretData {
	id: string;
	name: string;
	server: string;
	username: string;
	password: string;
	createdAt: Date;
	_count: {
		services: number;
	};
	services?: Array<{
		id: string;
		name: string;
		application: {
			id: string;
			name: string;
		};
	}>;
}

interface DockerSecretFormValues {
	name: string;
	server: string;
	username: string;
	password: string;
	serviceIds: string[];
}

export const DockerSecretsPage = () => {
	const utils = trpc.useUtils();

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingSecret, setEditingSecret] = useState<DockerSecretData | null>(null);
	const [form] = Form.useForm<DockerSecretFormValues>();

	const { data: secrets, isLoading, error } = trpc.dockerSecret.list.useQuery();
	const { data: applicationsData } = trpc.application.list.useQuery({ limit: 100, filter: undefined });

	const { data: secretDetail } = trpc.dockerSecret.getById.useQuery(
		{ id: editingSecret?.id ?? '' },
		{
			enabled: !!editingSecret,
			retry: false,
			onError: (error) => {
				message.error(error.message);
				closeModal();
			},
		},
	);

	const createMutation = trpc.dockerSecret.create.useMutation({
		onSuccess: () => {
			message.success('Docker secret created');
			utils.dockerSecret.list.invalidate();
			closeModal();
		},
		onError: (error) => message.error(error.message),
	});

	const updateMutation = trpc.dockerSecret.update.useMutation({
		onSuccess: () => {
			message.success('Docker secret updated');
			utils.dockerSecret.list.invalidate();
			closeModal();
		},
		onError: (error) => message.error(error.message),
	});

	const deleteMutation = trpc.dockerSecret.delete.useMutation({
		onSuccess: () => {
			message.success('Docker secret deleted');
			utils.dockerSecret.list.invalidate();
		},
		onError: (error) => message.error(error.message),
	});

	const assignMutation = trpc.dockerSecret.assignToServices.useMutation({
		onError: (error) => message.error(error.message),
	});

	const serviceOptions = useMemo(() =>
		applicationsData?.applications.flatMap((app) =>
			app.services.map((service) => ({
				label: `${app.name} / ${service.name}`,
				value: service.id,
			})),
		) || [],
	[applicationsData]);

	const openCreateModal = () => {
		setEditingSecret(null);
		form.resetFields();
		setIsModalOpen(true);
	};

	const openEditModal = (secret: DockerSecretData) => {
		setEditingSecret(secret);
		setIsModalOpen(true);
	};

	useEffect(() => {
		if (secretDetail && editingSecret) {
			form.setFieldsValue({
				name: secretDetail.name,
				server: secretDetail.server,
				username: secretDetail.username,
				password: secretDetail.password,
				serviceIds: secretDetail.services?.map(s => s.id) || [],
			});
		}
	}, [secretDetail, editingSecret, form]);

	const closeModal = () => {
		setIsModalOpen(false);
		setEditingSecret(null);
		form.resetFields();
	};

	const handleSubmit = async (values: DockerSecretFormValues) => {
		const { serviceIds, ...secretData } = values;

		try {
			if (editingSecret) {
				await updateMutation.mutateAsync({
					id: editingSecret.id,
					...secretData,
				});
				// Assign to services
				await assignMutation.mutateAsync({
					dockerSecretId: editingSecret.id,
					serviceIds: serviceIds || [],
				});
			} else {
				const newSecret = await createMutation.mutateAsync(secretData);
				// Assign to services
				if (serviceIds && serviceIds.length > 0) {
					await assignMutation.mutateAsync({
						dockerSecretId: newSecret.id,
						serviceIds,
					});
				}
			}
			message.success(`Docker secret ${editingSecret ? 'updated' : 'created'}`);
			utils.dockerSecret.list.invalidate();
			closeModal();
		} catch (error) {
			// Error already handled by mutations
		}
	};

	const handleDelete = (secret: DockerSecretData) => {
		Modal.confirm({
			title: `Delete "${secret.name}"?`,
			content: 'This will also remove the secret from all assigned services.',
			okText: 'Delete',
			okType: 'danger',
			onOk: () => deleteMutation.mutate({ id: secret.id }),
		});
	};

	const columns: ColumnsType<DockerSecretData> = [
		{
			title: 'Name',
			dataIndex: 'name',
			key: 'name',
			render: (text: string) => <Text strong>{text}</Text>,
		},
		{
			title: 'Server',
			dataIndex: 'server',
			key: 'server',
			render: (server: string) => <Text code>{server}</Text>,
		},
		{
			title: 'Username',
			dataIndex: 'username',
			key: 'username',
		},
		{
			title: 'Password',
			dataIndex: 'password',
			key: 'password',
			render: () => (
				<Text type="secondary">
					<LockOutlined /> ••••••••
				</Text>
			),
		},
		{
			title: 'Services',
			key: 'services',
			width: 100,
			align: 'center',
			render: (_, record) => (
				<Text>{record._count.services}</Text>
			),
		},
		{
			title: 'Updated',
			dataIndex: 'updatedAt',
			key: 'updatedAt',
			width: 140,
			render: (date: Date) => (
				<Text type="secondary">{dayjs(date).format('DD.MM.YYYY HH:mm')}</Text>
			),
		},
		{
			title: '',
			key: 'actions',
			width: 80,
			render: (_, record) => (
				<Space>
					<Button
						type="text"
						size="small"
						icon={<EditOutlined />}
						onClick={() => openEditModal(record)}
					/>
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
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
				<div>
					<Title level={2} style={{ marginBottom: 4 }}>Docker Registry Secrets</Title>
					{secrets && (
						<Text type="secondary">
							{secrets.length} secret{secrets.length !== 1 ? 's' : ''}
						</Text>
					)}
				</div>

				<Button
					type="primary"
					icon={<PlusOutlined />}
					onClick={openCreateModal}
				>
					New Secret
				</Button>
			</div>

			<Card>
				<Table
					columns={columns}
					dataSource={secrets || []}
					loading={isLoading}
					rowKey="id"
					pagination={false}
				/>
			</Card>

			<Modal
				title={editingSecret ? 'Edit Docker Secret' : 'New Docker Secret'}
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
					<Form.Item
						label="Name"
						name="name"
						rules={[{ required: true, message: 'Required' }]}
					>
						<Input placeholder="my-registry-secret" />
					</Form.Item>

					<Form.Item
						label="Registry Server"
						name="server"
						rules={[{ required: true, message: 'Required' }]}
					>
						<Input placeholder="docker.io" />
					</Form.Item>

					<Form.Item
						label="Username"
						name="username"
						rules={[{ required: true, message: 'Required' }]}
					>
						<Input placeholder="username" />
					</Form.Item>

					<Form.Item
						label="Password"
						name="password"
						rules={[{ required: !editingSecret, message: 'Required' }]}
					>
						<Input.Password placeholder={editingSecret ? 'Leave empty to keep current' : 'Enter password'} />
					</Form.Item>

					<Form.Item
						label="Assign to Services"
						name="serviceIds"
					>
						<Select
							mode="multiple"
							placeholder="Select services that need this secret"
							options={serviceOptions}
							optionFilterProp="label"
							showSearch
						/>
					</Form.Item>

					<Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
						<Space>
							<Button
								type="primary"
								htmlType="submit"
								loading={createMutation.isPending || updateMutation.isPending || assignMutation.isPending}
							>
								{editingSecret ? 'Save' : 'Create'}
							</Button>
							<Button onClick={closeModal}>Cancel</Button>
						</Space>
					</Form.Item>
				</Form>
			</Modal>
		</Space>
	);
};

