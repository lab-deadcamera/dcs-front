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
  api_key: string;
  favorite: boolean;
  url: string;
  endpoint: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string;
  provider_name: string;
}
