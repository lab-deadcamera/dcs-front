import { ResponseBase } from '@app/core/interfaces';
import { ModelConfig } from '@app/core/interfaces/models.interface';

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
  model_type: string;
  api_key: string;
  url: string;
  endpoint: string;
  access_key_id?: string;
  secret_access_key?: string;
  default_asset_group_id?: string;
  project_name?: string;
  project_number?: string;
  /** Per-model limits (min/max videos per generation, min/max duration). */
  config?: ModelConfig;
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
  model_type?: string;
  api_key: string;
  url: string;
  endpoint: string;
  access_key_id?: string;
  secret_access_key?: string;
  default_asset_group_id?: string;
  project_name?: string;
  project_number?: string;
  config?: ModelConfig;
  active?: boolean;
}

export interface UpdateModelRequest {
  name?: string;
  model_type?: string;
  api_key?: string;
  url?: string;
  endpoint?: string;
  access_key_id?: string;
  secret_access_key?: string;
  default_asset_group_id?: string;
  project_name?: string;
  project_number?: string;
  config?: ModelConfig;
  active?: boolean;
}
