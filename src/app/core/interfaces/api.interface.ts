/**
 * Cross-module API contract shared by every feature service.
 *
 * Feature services may either receive backend responses already wrapped in
 * `ResponseBase` (the canonical shape) OR receive raw entities directly,
 * and are then responsible for re-wrapping into the normalized
 * `{ error, msg, data }` shape that components consume.
 */

export interface ResponseBase<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ListId {
  id: number | string;
  name: string;
}

export interface PageParams<F> {
  page: number;
  limit: number;
  sortField?: string;
  sortOrder?: 1 | -1;
  filters?: F;
}

export interface PageData<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type PageResponse<T> = ResponseBase<PageData<T>>;
