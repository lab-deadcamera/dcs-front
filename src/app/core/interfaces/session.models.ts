/**
 * Scene-session domain types.
 *
 * A "session" here is the unit of work the user opens through the gate
 * dialog: who they are, which scene they're shooting, and how many takes
 * the scene has. The takes array drives the checklist at the right of
 * the viewer and the filename of each downloaded clip.
 */

export type TakeStatus = 'pending' | 'done';

/** Identity captured at the gate. Email is recorded but not validated yet. */
export interface SessionUser {
  email: string;
  handle: string;
}

/** Scene metadata. `code` is also used as the filename prefix. */
export interface SceneConfig {
  /** Free-form scene id — e.g. "SC03" or "37". Becomes the filename prefix. */
  code: string;
  /** How many takes the user expects to shoot for this scene (>= 1). */
  totalTakes: number;
}

/** A single take in the scene's take list. */
export interface Take {
  /** 1-based take number, used in the filename as `T{index}`. */
  index: number;
  status: TakeStatus;
}
