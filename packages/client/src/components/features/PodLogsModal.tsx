import { ReloadOutlined } from '@ant-design/icons';
import { Button, Modal, Space, Spin, Typography } from 'antd';
import { useEffect, useRef } from 'react';
import { trpc } from '../../utils/trpc';

const { Text } = Typography;

interface PodLogsModalProps {
	open: boolean;
	onClose: () => void;
	serviceId: string;
	podName: string;
	container?: string;
}

export const PodLogsModal = ({ open, onClose, serviceId, podName, container }: PodLogsModalProps) => {
	const logsEndRef = useRef<HTMLDivElement>(null);
	const tailLines = 500;

	const { data, isLoading, error, refetch } = trpc.kubernetes.getPodLogs.useQuery(
		{
			serviceId,
			podName,
			container,
			tailLines,
		},
		{
			enabled: open,
			refetchInterval: 10000, // Refresh every 10 seconds
		},
	);

	// Auto-scroll to bottom when new logs arrive
	useEffect(() => {
		if (data?.logs && logsEndRef.current) {
			logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
		}
	}, [data?.logs]);

	const handleRefresh = () => {
		refetch();
	};

	return (
		<Modal
			title={
				<Space>
					<Text strong>Pod Logs: {podName}</Text>
					{container && <Text type="secondary">({container})</Text>}
				</Space>
			}
			open={open}
			onCancel={onClose}
			footer={
				<Space>
					<Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={isLoading}>
						Refresh
					</Button>
					<Button onClick={onClose}>Close</Button>
				</Space>
			}
			width={900}
			styles={{
				body: {
					padding: 0,
				},
			}}
		>
			{(() => {
				if (isLoading && !data) {
					return (
						<div style={{ padding: 40, textAlign: 'center' }}>
							<Spin size="large" />
							<div style={{ marginTop: 16 }}>
								<Text type="secondary">Loading logs...</Text>
							</div>
						</div>
					);
				}
				if (error) {
					return (
						<div style={{ padding: 40, textAlign: 'center' }}>
							<Text type="danger">Error: {error.message}</Text>
						</div>
					);
				}
				return (
					<pre
						style={{
							background: '#1e1e1e',
							color: '#d4d4d4',
							padding: 16,
							margin: 0,
							maxHeight: '70vh',
							overflow: 'auto',
							fontSize: 12,
							fontFamily: 'monospace',
							lineHeight: 1.5,
							whiteSpace: 'pre-wrap',
							wordBreak: 'break-word',
						}}
					>
						{data?.logs || 'No logs available'}
						<div ref={logsEndRef} />
					</pre>
				);
			})()}
		</Modal>
	);
};
