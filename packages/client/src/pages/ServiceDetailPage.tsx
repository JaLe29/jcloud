import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Typography, Space, Button, Modal, message, Descriptions, Tag, Input, Form } from 'antd';
import {
	ArrowLeftOutlined,
	DeleteOutlined,
	EditOutlined,
	LinkOutlined,
	RocketOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { trpc } from '../utils/trpc';
import { ServiceApiKey } from '../components/features/ServiceApiKey';
import { ApiDeployHistory } from '../components/features/ApiDeployHistory';
import { ServiceDockerSecrets } from '../components/features/ServiceDockerSecrets';

const { Title, Text } = Typography;

export const ServiceDetailPage = () => {
	const { applicationId, serviceId } = useParams<{ applicationId: string; serviceId: string }>();
	const navigate = useNavigate();
	const utils = trpc.useUtils();

	const { data: service, isLoading, error } = trpc.service.getById.useQuery(
		{ id: serviceId! },
		{
			enabled: !!serviceId,
			retry: false,
		},
	);

	const [deployImage, setDeployImage] = useState('');

	const deleteServiceMutation = trpc.service.delete.useMutation({
		onSuccess: () => {
			message.success('Service deleted');
			navigate(`/applications/${applicationId}`);
		},
		onError: (error) => {
			message.error(error.message);
		},
	});

	const deployMutation = trpc.service.deploy.useMutation({
		onSuccess: (data) => {
			message.success(`Deployment started: ${data.image}`);
			setDeployImage('');
			utils.apikey.getDeployHistory.invalidate();
		},
		onError: (error) => {
			message.error(error.message);
		},
	});

	const handleDeploy = () => {
		if (!deployImage.trim()) {
			message.warning('Please enter a Docker image');
			return;
		}
		if (serviceId) {
			deployMutation.mutate({ serviceId, image: deployImage.trim() });
		}
	};

	const handleDelete = () => {
		Modal.confirm({
			title: `Delete "${service?.name}"?`,
			content: 'This action cannot be undone.',
			okText: 'Delete',
			okType: 'danger',
			onOk: () => {
				if (serviceId) deleteServiceMutation.mutate({ id: serviceId });
			},
		});
	};

	const formatResource = (request: number | null, limit: number | null, unit: string) => {
		if (!request && !limit) return 'Not set';
		return `${request ?? '-'} / ${limit ?? '-'} ${unit}`;
	};

	if (error) {
		const isNotFound = error.data?.code === 'NOT_FOUND';
		return (
			<Space direction="vertical" size="large" style={{ width: '100%' }}>
				<Button
					icon={<ArrowLeftOutlined />}
					onClick={() => navigate(`/applications/${applicationId}`)}
				>
					Back to Application
				</Button>
				<Card style={{ textAlign: 'center', padding: 40 }}>
					<Title level={4}>{isNotFound ? 'Service not found' : 'Error'}</Title>
					<Text type="secondary">{error.message}</Text>
				</Card>
			</Space>
		);
	}

	if (isLoading || !service) {
		return (
			<Space direction="vertical" size="large" style={{ width: '100%' }}>
				<Button
					icon={<ArrowLeftOutlined />}
					onClick={() => navigate(`/applications/${applicationId}`)}
				>
					Back
				</Button>
				<Card loading />
			</Space>
		);
	}

	return (
		<Space direction="vertical" size="large" style={{ width: '100%' }}>
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
				<Space>
					<Button
						icon={<ArrowLeftOutlined />}
						onClick={() => navigate(`/applications/${applicationId}`)}
					>
						Back
					</Button>
					<Title level={2} style={{ margin: 0 }}>{service.name}</Title>
					<Tag>{service.application.name}</Tag>
				</Space>
				<Space>
					<Button
						icon={<EditOutlined />}
						onClick={() => navigate(`/applications/${applicationId}/services/${serviceId}/edit`)}
					>
						Edit
					</Button>
					<Button
						danger
						icon={<DeleteOutlined />}
						onClick={handleDelete}
						loading={deleteServiceMutation.isPending}
					>
						Delete
					</Button>
				</Space>
			</div>

			<Card title="Service Details">
				<Descriptions column={{ xs: 1, sm: 2, md: 2, lg: 3 }} bordered>
					<Descriptions.Item label="Name">{service.name}</Descriptions.Item>
					<Descriptions.Item label="Application">{service.application.name}</Descriptions.Item>
					<Descriptions.Item label="Namespace">{service.application.namespace}</Descriptions.Item>
					<Descriptions.Item label="Replicas">
						<Tag color="blue">{service.replicas}</Tag>
					</Descriptions.Item>
					<Descriptions.Item label="Ingress URL" span={2}>
						{service.ingressUrl ? (
							<a href={service.ingressUrl} target="_blank" rel="noopener noreferrer">
								<LinkOutlined /> {service.ingressUrl}
							</a>
						) : (
							<Text type="secondary">Not set</Text>
						)}
					</Descriptions.Item>
					<Descriptions.Item label="CPU (Request / Limit)">
						{formatResource(service.cpuRequest, service.cpuLimit, 'millicores')}
					</Descriptions.Item>
					<Descriptions.Item label="Memory (Request / Limit)">
						{formatResource(service.memoryRequest, service.memoryLimit, 'MB')}
					</Descriptions.Item>
					<Descriptions.Item label="Created">
						{dayjs(service.createdAt).format('DD.MM.YYYY HH:mm')}
					</Descriptions.Item>
					<Descriptions.Item label="Updated">
						{dayjs(service.updatedAt).format('DD.MM.YYYY HH:mm')}
					</Descriptions.Item>
				</Descriptions>
			</Card>

			<Card title="API Key">
				<ServiceApiKey serviceId={service.id} />
			</Card>

			<ServiceDockerSecrets serviceId={service.id} />

			<Card title="Manual Deployment">
				<Space direction="vertical" style={{ width: '100%' }} size="middle">
					<Typography.Text type="secondary">
						Deploy a Docker image to this service manually (without using the API key)
					</Typography.Text>
					<Form layout="inline" style={{ width: '100%' }}>
						<Form.Item style={{ flex: 1, marginRight: 8 }}>
							<Input
								placeholder="Docker image (e.g. ghcr.io/user/app:latest)"
								value={deployImage}
								onChange={(e) => setDeployImage(e.target.value)}
								onPressEnter={handleDeploy}
								disabled={deployMutation.isPending}
							/>
						</Form.Item>
						<Form.Item>
							<Button
								type="primary"
								icon={<RocketOutlined />}
								onClick={handleDeploy}
								loading={deployMutation.isPending}
							>
								Deploy
							</Button>
						</Form.Item>
					</Form>
				</Space>
			</Card>

			<ApiDeployHistory serviceId={service.id} />

			<Card title="Environment Variables">
				<Space direction="vertical" style={{ width: '100%' }}>
					<Text type="secondary">Environment variables for this service</Text>
					<Button
						type="primary"
						onClick={() => navigate(`/envs?serviceId=${service.id}`)}
					>
						Manage Environment Variables
					</Button>
				</Space>
			</Card>
		</Space>
	);
};

