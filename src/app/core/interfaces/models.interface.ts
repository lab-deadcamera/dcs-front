export interface ModelRequest {
  provider_id: string;
  name: string;
  api_key: string;
  url: string;
  endpoint: string;
  active: boolean;
}

export interface ModelData {
  id: string;
  provider_id: string;
  name: string;
  model_type: string;
  api_key: string;
  favorite: boolean;
  url: string;
  endpoint: string;
  access_key_id?: string;
  secret_access_key?: string;
  default_asset_group_id?: string;
  project_name?: string;
  project_number?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string;
  provider_name: string;
}
