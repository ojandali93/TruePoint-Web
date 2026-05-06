export interface ApiResponse<T> {
  data: T;
  count?: number;
}

export interface ApiError {
  error: string;
  details?: { field: string; message: string }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}
