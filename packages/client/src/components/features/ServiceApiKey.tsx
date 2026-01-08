import { CopyOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Input, Modal, message, Space, Typography } from 'antd';
import { useState } from 'react';
import { trpc } from '../../utils/trpc';

const { Text } = Typography;

interface ServiceApiKeyProps {
	serviceId: string;
}

export const ServiceApiKey = ({ serviceId }: ServiceApiKeyProps) => {
	const [showKey, setShowKey] = useState(false);
	const utils = trpc.useUtils();

	const { data: apiKey, isLoading } = trpc.apikey.getByServiceId.useQuery({ serviceId });

	const generateMutation = trpc.apikey.generate.useMutation({
		onSuccess: () => {
			message.success('API key generated');
			utils.apikey.getByServiceId.invalidate({ serviceId });
			setShowKey(true);
		},
		onError: error => message.error(error.message),
	});

	const regenerateMutation = trpc.apikey.regenerate.useMutation({
		onSuccess: () => {
			message.success('API key regenerated');
			utils.apikey.getByServiceId.invalidate({ serviceId });
			setShowKey(true);
		},
		onError: error => message.error(error.message),
	});

	const deleteMutation = trpc.apikey.delete.useMutation({
		onSuccess: () => {
			message.success('API key deleted');
			utils.apikey.getByServiceId.invalidate({ serviceId });
			setShowKey(false);
		},
		onError: error => message.error(error.message),
	});

	const handleCopyKey = () => {
		if (apiKey?.key) {
			navigator.clipboard.writeText(apiKey.key);
			message.success('API key copied to clipboard');
		}
	};

	const handleRegenerate = () => {
		Modal.confirm({
			title: 'Regenerate API Key?',
			content: 'The old API key will stop working immediately. This action cannot be undone.',
			okText: 'Regenerate',
			okType: 'danger',
			onOk: () => regenerateMutation.mutate({ serviceId }),
		});
	};

	const handleDelete = () => {
		Modal.confirm({
			title: 'Delete API Key?',
			content: 'This action cannot be undone.',
			okText: 'Delete',
			okType: 'danger',
			onOk: () => deleteMutation.mutate({ serviceId }),
		});
	};

	if (isLoading) {
		return <Text type="secondary">Loading...</Text>;
	}

	if (!apiKey) {
		return (
			<Space direction="vertical" style={{ width: '100%' }}>
				<Text type="secondary">No API key generated yet. Generate one to enable deployments.</Text>
				<Button
					type="primary"
					icon={<PlusOutlined />}
					onClick={() => generateMutation.mutate({ serviceId })}
					loading={generateMutation.isPending}
				>
					Generate API Key
				</Button>
			</Space>
		);
	}

	return (
		<Space direction="vertical" style={{ width: '100%' }} size="middle">
			<Space style={{ width: '100%', justifyContent: 'space-between' }}>
				<Text>Use this key for CI/CD deployments</Text>
				<Space>
					<Button icon={<ReloadOutlined />} onClick={handleRegenerate} loading={regenerateMutation.isPending}>
						Regenerate
					</Button>
					<Button danger icon={<DeleteOutlined />} onClick={handleDelete} loading={deleteMutation.isPending}>
						Delete
					</Button>
				</Space>
			</Space>

			<Space style={{ width: '100%' }}>
				<Input.Password
					value={apiKey.key}
					readOnly
					visibilityToggle={{
						visible: showKey,
						onVisibleChange: setShowKey,
					}}
					style={{ fontFamily: 'monospace', fontSize: 12, flex: 1 }}
				/>
				<Button icon={<CopyOutlined />} onClick={handleCopyKey}>
					Copy
				</Button>
			</Space>

			<Text type="secondary" style={{ fontSize: 12 }}>
				Created: {new Date(apiKey.createdAt).toLocaleString()}
			</Text>
		</Space>
	);
};
