/**
 * Types for the shot builder error log (failed generate-shots calls).
 * Mirrors dcs-back internal/modules/studio/text/log_store.go.
 */

/** Light row used in list queries (no heavy prompt/payload columns). */
export interface ShotBuilderLogSummary {
  id: string;
  user_id?: number;
  user_name: string;
  user_email: string;
  project_id: string;
  project_name: string;
  scene_id: string;
  key_model: string;
  api_model: string;
  skill_id: string;
  skill_name: string;
  status: string;
  error_message: string;
  attempts: number;
  total_input_tokens: number;
  total_output_tokens: number;
  duration_ms: number;
  created_at: string;
}

/** Full log detail — includes the raw payload and the composed prompts. */
export interface ShotBuilderLogEntry extends ShotBuilderLogSummary {
  request_payload: string;
  system_prompt: string;
  prompt: string;
  response: string;
  updated_at?: string;
}

/** One Claude API call within a failed generate-shots call. */
export interface ShotBuilderAttempt {
  id: string;
  log_id: string;
  attempt_number: number;
  prompt: string;
  response: string;
  valid: boolean;
  error_message: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  duration_ms: number;
  created_at: string;
}

/** Paginated wrapper for GET /studio/text/claude/generate-shots-logs. */
export interface ShotBuilderLogListResponse {
  logs: ShotBuilderLogSummary[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/** Detail payload for GET /studio/text/claude/generate-shots-logs/:id. */
export interface ShotBuilderLogDetailResponse {
  log: ShotBuilderLogEntry;
  attempts: ShotBuilderAttempt[];
}
