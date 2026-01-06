import { Card, Typography, Space, Button, Modal, Form, Select, message, List, Tag } from 'antd';
import { KeyOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { trpc } from '../../utils/trpc';

const { Text } = Typography;

interface ServiceDockerSecretsProps {
	serviceId: string;
}

export const ServiceDockerSecrets = ({ serviceId }: ServiceDockerSecretsProps) => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [form] = Form.useForm();
	const utils = trpc.useUtils();

	const { data: assignedSecrets, isLoading } = trpc.dockerSecret.getByServiceId.useQuery({ serviceId });
	const { data: allSecrets } = trpc.dockerSecret.list.useQuery();

	const assignMutation = trpc.dockerSecret.assignToServices.useMutation({
		onSuccess: () => {
			message.success('Docker secrets updated');
			utils.dockerSecret.getByServiceId.invalidate({ serviceId });
			setIsModalOpen(false);
			form.resetFields();
		},
		onError: (error) => message.error(error.message),
	});

	const handleOpenModal = () => {
		// Pre-fill with currently assigned secrets
		form.setFieldsValue({
			secretIds: assignedSecrets?.map(s => s.id) || [],
		});
		setIsModalOpen(true);
	};

	const handleSaveAll = (values: { secretIds: string[] }) => {
		// We need to update all services for each secret
		// This is a bit tricky - we'll save one by one
		const secretIds = values.secretIds || [];

		// For simplicity, let's just handle the assignment differently
		// We'll update through a different approach

		message.info('Not yet implemented - use Docker Secrets page to assign');
		setIsModalOpen(false);
	};

	const secretOptions = allSecrets?.map(secret => ({
		label: `${secret.name} (${secret.server})`,
		value: secret.id,
	})) || [];

	return (
		<Card title="Docker Registry Secrets" size="small"
			extra={
				<Button
					type="link"
					size="small"
					icon={<PlusOutlined />}
					onClick={handleOpenModal}
				>
					Manage
				</Button>
			}
		>
			{isLoading ? (
				<Text type="secondary">Loading...</Text>
			) : assignedSecrets && assignedSecrets.length > 0 ? (
				<List
					size="small"
					dataSource={assignedSecrets}
					renderItem={(secret) => (
						<List.Item>
							<Space>
								<KeyOutlined style={{ color: '#1890ff' }} />
								<Text strong>{secret.name}</Text>
								<Text type="secondary" code style={{ fontSize: 11 }}>
									{secret.server}
								</Text>
								<Tag>{secret.username}</Tag>
							</Space>
						</List.Item>
					)}
				/>
			) : (
				<Space direction="vertical" style={{ width: '100%' }}>
					<Text type="secondary">No Docker secrets assigned</Text>
					<Text type="secondary" style={{ fontSize: 12 }}>
						Assign secrets to pull images from private registries
					</Text>
				</Space>
			)}

			<Modal
				title="Manage Docker Secrets"
				open={isModalOpen}
				onCancel={() => setIsModalOpen(false)}
				footer={null}
			>
				<Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
					To assign Docker secrets to this service, please use the Docker Secrets page and use the "Assign to Services" feature.
				</Text>
				<Button onClick={() => setIsModalOpen(false)}>Close</Button>
			</Modal>
		</Card>
	);
};



