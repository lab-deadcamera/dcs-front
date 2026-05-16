export interface Project {
  id: string;
  name: string;
  description: string;
  metadata: Record<string, unknown>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Scene {
  id: string;
  project_id: string;
  number: number;
  name: string;
  description: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Take {
  id: string;
  scene_id: string;
  number: number;
  video_url: string;
  video_local_url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithScenes {
  project: Project;
  scenes: SceneWithTakes[];
}

export interface SceneWithTakes {
  scene: Scene;
  takes: Take[];
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  active?: boolean;
}

export interface CreateSceneRequest {
  number: number;
  name: string;
  description?: string;
}

export interface UpdateSceneRequest {
  number?: number;
  name?: string;
  description?: string;
  active?: boolean;
}

export interface CreateTakeRequest {
  number: number;
}

export interface UpdateTakeRequest {
  video_url?: string;
  video_local_url?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
}
