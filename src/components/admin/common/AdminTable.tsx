import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

export interface AdminTableColumn<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  className?: string;
}

export interface AdminTableProps<T> {
  columns: AdminTableColumn<T>[];
  rows: T[];
  keyExtractor: (row: T) => string | number;
  loading?: boolean;
  emptyMessage?: string;
  footer?: React.ReactNode;
}

export function AdminTable<T>({
  columns,
  rows,
  keyExtractor,
  loading = false,
  emptyMessage,
  footer
}: AdminTableProps<T>) {
  const { t } = useTranslation();

  return (
    <div className="bg-white border border-neutral-200 rounded-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-4 py-2.5 font-semibold text-neutral-600 whitespace-nowrap ${column.className ?? ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-neutral-500">
                  <Loader2 className="w-5 h-5 mx-auto animate-spin text-neutral-400" />
                  <span className="sr-only">{t('common.loading')}</span>
                </td>
              </tr>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-neutral-500">
                  {emptyMessage ?? t('common.no_results', 'Sense resultats')}
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((row) => (
                <tr key={keyExtractor(row)} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  {columns.map((column) => (
                    <td key={column.key} className={`px-4 py-2.5 text-neutral-700 align-middle ${column.className ?? ''}`}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {footer && <div className="border-t border-neutral-200 px-4 py-2.5">{footer}</div>}
    </div>
  );
}

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export interface AdminPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** When provided, renders the 25/50/100 page-size selector. */
  onPageSizeChange?: (pageSize: number) => void;
}

export function AdminPagination({ page, pageSize, total, onPageChange, onPageSizeChange }: AdminPaginationProps) {
  const { t } = useTranslation();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-[13px] text-neutral-500">
        {t('admin.pagination.range', '{{from}}–{{to}} de {{total}}', { from, to, total })}
      </p>

      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            aria-label={t('admin.pagination.page_size', 'Files per pàgina')}
            className="px-2 py-1.5 rounded-md border border-neutral-200 bg-white text-[13px] text-neutral-700"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label={t('admin.pagination.previous', 'Anterior')}
          className="p-1.5 rounded-md border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[13px] text-neutral-500 tabular-nums">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label={t('admin.pagination.next', 'Següent')}
          className="p-1.5 rounded-md border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-white transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
