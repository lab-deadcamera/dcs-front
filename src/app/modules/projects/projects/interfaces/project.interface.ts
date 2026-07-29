export interface Project {
  id: string;
  name: string;
  description: string;
  chapter_count: number;
  metadata: Record<string, unknown>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  project_id: string;
  number: number;
  name: string;
  description: string;
  active: boolean;
  scene_count: number;
  created_at: string;
  updated_at: string;
}

export interface Scene {
  id: string;
  project_id: string;
  chapter_id: string;
  number: number;
  name: string;
  description: string;
  active: boolean;
  shot_count: number;
  created_at: string;
  updated_at: string;
}

export interface Shot {
  id: string;
  scene_id: string;
  number: number;
  name: string;
  description: string;
  active: boolean;
  take_count: number;
  aspect_ratio?: string;
  duration_seconds?: number;
  created_at: string;
  updated_at: string;
}

export interface Take {
  id: string;
  shot_id: string;
  number: number;
  video_url: string;
  video_local_url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  active: boolean;
  final: boolean;
  finalized_at: string | null;
  task_id?: string;
  request_payload?: string;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithChapters {
  project: Project;
  chapters: ChapterWithScenes[];
}

export interface ChapterWithScenes {
  chapter: Chapter;
  scenes: SceneWithShots[];
}

export interface SceneWithShots {
  scene: Scene;
  shots: ShotWithTakes[];
}

export interface ShotWithTakes {
  shot: Shot;
  takes: Take[];
}

// Legacy types for backward compatibility
export interface ProjectWithScenes {
  project: Project;
  scenes: Scene[];
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

export interface CreateChapterRequest {
  number: number;
  name: string;
  description?: string;
}

export interface UpdateChapterRequest {
  number?: number;
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

export interface CreateShotRequest {
  number: number;
  name: string;
  description?: string;
}

export interface UpdateShotRequest {
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
  status?: string;
  active?: boolean;
  final?: boolean;
  task_id?: string;
  rating?: number;
}
