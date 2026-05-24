/**
 * Scene-session domain types.
 *
 * A "session" here is the unit of work the user opens through the gate
 * dialog: who they are, which project/scene they're shooting, and the
 * takes associated with that scene. The takes array drives the checklist
 * at the right of the viewer and the video reel at the bottom.
 *
 * Unlike the earlier design (which used local-only takes), takes now
 * mirror the backend DB records — each take has a real `id`, tracks a
 * `videoUrl` when a generation has been saved, and supports a
 * discarded/active toggle so multiple generations for the same take
 * number can coexist.
 */

export type TakeStatus = 'pending' | 'done' | 'confirmed';

/** Identity captured at the gate. Email is recorded but not validated yet. */
export interface SessionUser {
  email: string;
  handle: string;
}

/** A single take in the scene, mirroring the backend DB record. */
export interface Take {
  /** 1-based take number, used in the filename as `T{index}`. */
  index: number;
  /** Local checklist status (pending / done). Not persisted on the backend. */
  status: TakeStatus;

  // ── Backend DB fields (populated after save-generation) ────────────
  /** Real DB id — set once the take has been created/persisted. */
  id?: string;
  /** URL of the generated video, if any. */
  video_url?: string;
  /** Whether this take is the active one for its scene+number. */
  active?: boolean;
}

/**
 * Scene-session config persisted from the gate dialog.
 * `projectId` and `sceneId` are the real DB UUIDs used for API calls.
 */
export interface SceneConfig {
  /** Free-form scene id — e.g. "SC03" or "37". Becomes the filename prefix. */
  code: string;
  /** How many takes the user expects to shoot for this scene (>= 1). */
  totalTakes: number;
}

/** Role returned from the backend. */
export interface UserRole {
  id: number;
  name: string;
  level: number;
}

/** Full user profile returned from /auth/login and /auth/profile. */
export interface AuthUser {
  id: number;
  username: string;
  name: string;
  surname: string;
  user_name: string;
  email: string;
  role: UserRole;
  active: boolean;
}

/** Shape of the login response. */
export interface LoginResponse {
  token: string;
  user: AuthUser;
}

/** Backend Take record shape from the projects API. */
export interface BackendTake {
  id: string;
  scene_id: string;
  number: number;
  video_url: string;
  video_local_url: string;
  status: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
