import { useState, useCallback } from 'react';
import type { TablePaginationConfig } from 'antd/es/table';
import type { SorterResult, FilterValue } from 'antd/es/table/interface';

/**
 * Custom hook for server-side table management with pagination and sorting.
 *
 * @example
 * ```tsx
 * const MyTablePage = () => {
 *   const table = useServerTable<MyDataType>({
 *     initialPage: 1,
 *     initialPageSize: 10,
 *     initialSortBy: 'createdAt',
 *     initialSortOrder: 'desc',
 *   });
 *
 *   const { data, isLoading } = api.myEndpoint.useQuery(table.queryParams);
 *
 *   const columns = [
 *     {
 *       title: 'Name',
 *       dataIndex: 'name',
 *       key: 'name',
 *       sorter: true,
 *       sortOrder: table.getSortOrder('name'),
 *     },
 *   ];
 *
 *   return (
 *     <Table
 *       columns={columns}
 *       dataSource={data?.items}
 *       onChange={table.handleTableChange}
 *       pagination={{
 *         current: table.page,
 *         pageSize: table.pageSize,
 *         total: data?.pagination?.total,
 *       }}
 *     />
 *   );
 * };
 * ```
 */

export type SortOrder = 'asc' | 'desc';

export interface ServerTableState<F = any> {
	page: number;
	limit: number;
	sortBy?: string;
	sortOrder?: SortOrder;
	filter?: F;
}

export interface ServerTableConfig<F = any> {
	initialPage?: number;
	initialPageSize?: number;
	initialSortBy?: string;
	initialSortOrder?: SortOrder;
	initialFilter?: F;
}

export const useServerTable = <T extends Record<string, any>, F = any>(config?: ServerTableConfig<F>) => {
	const [page, setPage] = useState(config?.initialPage ?? 1);
	const [pageSize, setPageSize] = useState(config?.initialPageSize ?? 10);
	const [sortBy, setSortBy] = useState<string | undefined>(config?.initialSortBy);
	const [sortOrder, setSortOrder] = useState<SortOrder | undefined>(config?.initialSortOrder);
	const [filter, setFilter] = useState<F | undefined>(config?.initialFilter);

	const queryParams: ServerTableState<F> = {
		page,
		limit: pageSize,
		sortBy,
		sortOrder,
		filter,
	};

	const handleTableChange = useCallback(
		(
			pagination: TablePaginationConfig,
			_filters: Record<string, FilterValue | null>,
			sorter: SorterResult<T> | SorterResult<T>[],
		) => {
			// Handle pagination
			if (pagination.current !== page) {
				setPage(pagination.current ?? 1);
			}
			if (pagination.pageSize !== pageSize) {
				setPageSize(pagination.pageSize ?? 10);
				setPage(1); // Reset to first page when changing page size
			}

			// Handle sorting (only single column sorting)
			if (!Array.isArray(sorter)) {
				if (sorter.order) {
					// Determine field name (prefer field, fallback to columnKey)
					const field = sorter.field
						? (Array.isArray(sorter.field) ? sorter.field.join('.') : String(sorter.field))
						: String(sorter.columnKey);
					const order: SortOrder = sorter.order === 'ascend' ? 'asc' : 'desc';
					setSortBy(field);
					setSortOrder(order);
				} else {
					// When order is undefined, user cleared the sort - go back to initial
					setSortBy(config?.initialSortBy);
					setSortOrder(config?.initialSortOrder);
				}
			}
		},
		[page, pageSize, config?.initialSortBy, config?.initialSortOrder],
	);

	const getSortOrder = useCallback(
		(columnKey: string): 'ascend' | 'descend' | null => {
			if (sortBy === columnKey && sortOrder) {
				return sortOrder === 'asc' ? 'ascend' : 'descend';
			}
			return null;
		},
		[sortBy, sortOrder],
	);

	const handleFilterChange = useCallback((newFilter: F | undefined) => {
		setFilter(newFilter);
		setPage(1); // Reset to first page when filtering
	}, []);

	const reset = useCallback(() => {
		setPage(config?.initialPage ?? 1);
		setPageSize(config?.initialPageSize ?? 10);
		setSortBy(config?.initialSortBy);
		setSortOrder(config?.initialSortOrder);
		setFilter(undefined);
	}, [config?.initialPage, config?.initialPageSize, config?.initialSortBy, config?.initialSortOrder]);

	return {
		queryParams,
		page,
		pageSize,
		sortBy,
		sortOrder,
		filter,
		handleTableChange,
		handleFilterChange,
		getSortOrder,
		reset,
	};
};

