import { DeleteOutlined, EditOutlined, LockOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Modal, message, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { trpc } from '../utils/trpc';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface ClusterData {
	id: string;
	name: string;
	kubeconfig: string;
	createdAt: Date;
	updatedAt: Date;
	_count: {
		applications: number;
	};
}

interface ClusterFormValues {
	name: string;
	kubeconfig: string;
}

export const ClustersPage = () => {
	const utils = trpc.useUtils();

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingCluster, setEditingCluster] = useState<ClusterData | null>(null);
	const [form] = Form.useForm<ClusterFormValues>();

	const { data: clusters, isLoading, error } = trpc.cluster.list.useQuery();

	const { data: clusterDetail } = trpc.cluster.getById.useQuery(
		{ id: editingCluster?.id ?? '' },
		{
			enabled: !!editingCluster,
			retry: false,
			onError: error => {
				message.error(error.message);
				closeModal();
			},
		},
	);

	const createMutation = trpc.cluster.create.useMutation({
		onSuccess: () => {
			message.success('Cluster created');
			utils.cluster.list.invalidate();
			closeModal();
		},
		onError: error => message.error(error.message),
	});

	const updateMutation = trpc.cluster.update.useMutation({
		onSuccess: () => {
			message.success('Cluster updated');
			utils.cluster.list.invalidate();
			closeModal();
		},
		onError: error => message.error(error.message),
	});

	const deleteMutation = trpc.cluster.delete.useMutation({
		onSuccess: () => {
			message.success('Cluster deleted');
			utils.cluster.list.invalidate();
		},
		onError: error => message.error(error.message),
	});

	const openCreateModal = () => {
		setEditingCluster(null);
		form.resetFields();
		setIsModalOpen(true);
	};

	const openEditModal = (cluster: ClusterData) => {
		setEditingCluster(cluster);
		setIsModalOpen(true);
	};

	const closeModal = () => {
		setIsModalOpen(false);
		setEditingCluster(null);
		form.resetFields();
	};

	useEffect(() => {
		if (clusterDetail && editingCluster) {
			form.setFieldsValue({
				name: clusterDetail.name,
				kubeconfig: clusterDetail.kubeconfig,
			});
		}
	}, [clusterDetail, editingCluster, form]);

	const handleSubmit = (values: ClusterFormValues) => {
		if (editingCluster) {
			updateMutation.mutate({
				id: editingCluster.id,
				...values,
			});
		} else {
			createMutation.mutate(values);
		}
	};

	const handleDelete = (cluster: ClusterData) => {
		Modal.confirm({
			title: `Delete "${cluster.name}"?`,
			content:
				cluster._count.applications > 0
					? `This cluster has ${cluster._count.applications} application(s). You must delete all applications first.`
					: 'This action cannot be undone.',
			okText: 'Delete',
			okType: 'danger',
			okButtonProps: {
				disabled: cluster._count.applications > 0,
			},
			onOk: () => deleteMutation.mutate({ id: cluster.id }),
		});
	};

	const columns: ColumnsType<ClusterData> = [
		{
			title: 'Name',
			dataIndex: 'name',
			key: 'name',
			render: (text: string) => <Text strong>{text}</Text>,
		},
		{
			title: 'Kubeconfig',
			dataIndex: 'kubeconfig',
			key: 'kubeconfig',
			render: () => (
				<Text type="secondary">
					<LockOutlined /> ••••••••
				</Text>
			),
		},
		{
			title: 'Applications',
			key: 'applications',
			width: 120,
			align: 'center',
			render: (_, record) => <Text>{record._count.applications}</Text>,
		},
		{
			title: 'Updated',
			dataIndex: 'updatedAt',
			key: 'updatedAt',
			width: 140,
			render: (date: Date) => <Text type="secondary">{dayjs(date).format('DD.MM.YYYY HH:mm')}</Text>,
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
						Clusters
					</Title>
					{clusters && (
						<Text type="secondary">
							{clusters.length} cluster{clusters.length !== 1 ? 's' : ''}
						</Text>
					)}
				</div>

				<Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
					New Cluster
				</Button>
			</div>

			<Card>
				<Table
					columns={columns}
					dataSource={clusters || []}
					loading={isLoading}
					rowKey="id"
					pagination={false}
				/>
			</Card>

			<Modal
				title={editingCluster ? 'Edit Cluster' : 'New Cluster'}
				open={isModalOpen}
				onCancel={closeModal}
				footer={null}
				destroyOnClose
				width={600}
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
						rules={[
							{ required: true, message: 'Required' },
							{ max: 100, message: 'Max 100 characters' },
						]}
					>
						<Input placeholder="production-cluster" />
					</Form.Item>

					<Form.Item
						label="Kubeconfig"
						name="kubeconfig"
						rules={[{ required: !editingCluster, message: 'Required' }]}
						extra={
							editingCluster
								? 'Leave empty to keep current kubeconfig'
								: 'Paste your Kubernetes kubeconfig YAML'
						}
					>
						<TextArea
							rows={8}
							placeholder={
								editingCluster ? 'Leave empty to keep current' : 'apiVersion: v1\nkind: Config\n...'
							}
						/>
					</Form.Item>

					<Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
						<Space>
							<Button
								type="primary"
								htmlType="submit"
								loading={createMutation.isPending || updateMutation.isPending}
							>
								{editingCluster ? 'Save' : 'Create'}
							</Button>
							<Button onClick={closeModal}>Cancel</Button>
						</Space>
					</Form.Item>
				</Form>
			</Modal>
		</Space>
	);
};
