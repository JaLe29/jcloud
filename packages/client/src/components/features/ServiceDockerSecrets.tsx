import { KeyOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Form, List, Modal, Space, Tag, Typography } from 'antd';
import { useState } from 'react';
import { trpc } from '../../utils/trpc';

const { Text } = Typography;

interface ServiceDockerSecretsProps {
	serviceId: string;
}

export const ServiceDockerSecrets = ({ serviceId }: ServiceDockerSecretsProps) => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [form] = Form.useForm();

	const { data: assignedSecrets, isLoading } = trpc.dockerSecret.getByServiceId.useQuery({ serviceId });

	const handleOpenModal = () => {
		// Pre-fill with currently assigned secrets
		form.setFieldsValue({
			secretIds: assignedSecrets?.map(s => s.id) || [],
		});
		setIsModalOpen(true);
	};

	const renderContent = () => {
		if (isLoading) {
			return <Text type="secondary">Loading...</Text>;
		}
		if (assignedSecrets && assignedSecrets.length > 0) {
			return (
				<List
					size="small"
					dataSource={assignedSecrets}
					renderItem={secret => (
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
			);
		}
		return (
			<Space direction="vertical" style={{ width: '100%' }}>
				<Text type="secondary">No Docker secrets assigned</Text>
				<Text type="secondary" style={{ fontSize: 12 }}>
					Assign secrets to pull images from private registries
				</Text>
			</Space>
		);
	};

	return (
		<Card
			title="Docker Registry Secrets"
			size="small"
			extra={
				<Button type="link" size="small" icon={<PlusOutlined />} onClick={handleOpenModal}>
					Manage
				</Button>
			}
		>
			{renderContent()}

			<Modal
				title="Manage Docker Secrets"
				open={isModalOpen}
				onCancel={() => setIsModalOpen(false)}
				footer={null}
			>
				<Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
					To assign Docker secrets to this service, please use the Docker Secrets page and use the "Assign to
					Services" feature.
				</Text>
				<Button onClick={() => setIsModalOpen(false)}>Close</Button>
			</Modal>
		</Card>
	);
};
