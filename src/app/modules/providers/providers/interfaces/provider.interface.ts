import { ResponseBase } from '@app/core/interfaces';

export interface Provider {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Model {
  id: string;
  provider_id: string;
  name: string;
  api_key: string;
  url: string;
  endpoint: string;
  active: boolean;
  favorite: boolean;
  provider_name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ModelWithProvider extends Model {
  provider_name: string;
}

export interface ProviderWithModels {
  provider: Provider;
  models: Model[];
}

export interface CreateProviderRequest {
  name: string;
}

export interface UpdateProviderRequest {
  name?: string;
  active?: boolean;
}

export interface CreateModelRequest {
  provider_id: string;
  name: string;
  api_key: string;
  url: string;
  endpoint: string;
  active?: boolean;
}

export interface UpdateModelRequest {
  name?: string;
  api_key?: string;
  url?: string;
  endpoint?: string;
  active?: boolean;
}
