import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ClusterStore {
	selectedClusterId: string | null;
	setSelectedClusterId: (clusterId: string | null) => void;
}

export const useClusterStore = create<ClusterStore>()(
	persist(
		set => ({
			selectedClusterId: null,
			setSelectedClusterId: clusterId => set({ selectedClusterId: clusterId }),
		}),
		{
			name: 'cluster-storage',
		},
	),
);
