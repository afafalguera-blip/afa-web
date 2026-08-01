export interface ObservabilityFilterState {
  search: string;
  tableName: string;
  action: string;
  userId: string;
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_FILTERS: ObservabilityFilterState = {
  search: '',
  tableName: '',
  action: '',
  userId: '',
  dateFrom: '',
  dateTo: ''
};

export const hasActiveFilters = (filters: ObservabilityFilterState): boolean =>
  Object.values(filters).some((value) => value !== '');
