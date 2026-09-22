/* ============================================================
 * ROOT
 * ============================================================ */

import { AspectRatio } from './studio.models';

export interface Project {
  id: string;
  title: string;
  description?: string;
  version: string;
  metadata: ProjectMetadata;
  settings: ProjectSettings;
  assets: AssetLibrary;
  characters: Character[];
  locations: Location[];
  props: Prop[];
  sequences: Sequence[];
  ui?: UISettings;
}

export interface ProjectMetadata {
  author?: string;
  studio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSettings {
  defaultLanguage: Language;
  supportedLanguages: Language[];
  defaultAspectRatio: AspectRatio;
  fps: number;
  promptCharacterLimit: number;
  defaultMode: RenderMode;
  colorPipeline?: string;
}

export type Language = 'en' | 'zh';

export type RenderMode = 'M1' | 'M2' | 'M3';

export interface AssetLibrary {
  images: ImageAsset[];
  videos: VideoAsset[];
  audio: AudioAsset[];
  documents: DocumentAsset[];
}

export interface Asset {
  id: string;
  name: string;
  path: string;
  tags?: string[];
}

export interface ImageAsset extends Asset {
  type: 'image';
}

export interface VideoAsset extends Asset {
  type: 'video';
}

export interface AudioAsset extends Asset {
  type: 'audio';
}

export interface DocumentAsset extends Asset {
  type: 'document';
}

export interface Character {
  id: string;
  name: string;
  description?: string;
  defaultReference?: string;
}

export interface Location {
  id: string;
  name: string;
  description?: string;
}

export interface Prop {
  id: string;
  name: string;
  description?: string;
}

export interface Sequence {
  description: string;
  duration: number;
  mode: RenderMode;
  aspectRatio: AspectRatio;
  references: Reference[];
  sequenceFlow: SequenceFlow;
  directorNotes?: DirectorNotes;
  continuity?: Continuity;
  /** Optional per-scene grouping (Episode → Scenes → Shots) so the viewer can
   *  render the shot cards inside a per-scene accordion. Populated by
   *  shotBuilderResultToSequence when the backend returns scenes. */
  scenes?: SequenceScene[];
  shots: Shot[];
}

/** Metadata for one scene within a Sequence. `shotIds` reference the ids of
 *  the Sequence's flattened `shots` that belong to this scene. */
export interface SequenceScene {
  scriptNumber: number;
  scriptLocation: string;
  title?: string;
  description?: string;
  duration: number;
  sceneType?: string;
  mode?: string;
  references?: Reference[];
  shotIds?: string[];
}

export interface SequenceFlow {
  title: string;
  subtitle?: string;
  duration: number;
  metric: FlowMetric;
  scale: FlowScale;
  segments: FlowSegment[];
}

export type FlowMetric = 'dramaticIntensity' | 'emotion' | 'action' | 'suspense' | 'rhythm';

export interface FlowScale {
  start: string;
  middle?: string;
  end: string;
}

export interface FlowSegment {
  id: string;
  shotId: string;
  label: string;
  emotion?: string;
  start: number;
  end: number;
  intensity: number;
  marker?: boolean;
  color?: string;
  /** Number of internal cuts within the shot (0 = single continuous take). */
  cuts?: number;
}

export interface Reference {
  slot: string;
  assetId: string;
  type: ReferenceType;
}

export type ReferenceType =
  | 'character'
  | 'location'
  | 'prop'
  | 'audio'
  | 'plate'
  | 'environment'
  | 'other';

export interface DirectorNotes {
  goal?: string;
  styleGuide?: string;
  warnings?: string[];
  failureModes?: string[];
}

export interface Continuity {
  keepWardrobe?: boolean;
  keepLighting?: boolean;
  keepEyelines?: boolean;
  keepCameraAxis?: boolean;
}

export interface Shot {
  id: string;
  title: string;
  description?: string;
  duration: number;
  start: number;
  end: number;
  /** Number of internal cuts within the shot (0 = single continuous take). */
  cuts?: number;
  camera: Camera;
  composition: Composition;
  blocking: Blocking;
  acting: Acting;
  timeline: Timeline;
  audio: Audio;
  references: Reference[];
  prompt: Prompt;
  render: RenderSettings;
  notes: ShotNotes;
}

export interface Camera {
  lens: string;
  framing: string;
  movement: string;
  fps: number;
  shutter: string;
  aspectRatio: AspectRatio;
}

export interface Composition {
  frameMap?: string;
  subjectLock?: string;
  crossFrameRules?: string;
  focus?: string;
  depth?: string;
}

export interface Blocking {
  location?: string;
  movement?: string;
  interaction?: string;
  positions?: SubjectPosition[];
}

export interface SubjectPosition {
  subjectId: string;
  description: string;
}

export interface Acting {
  emotion?: string;
  bodyLanguage?: string;
  dialogue?: string;
  microExpressions?: string[];
}

export interface Timeline {
  duration: number;
  segments: TimelineSegment[];
  beats: Beat[];
}

export interface TimelineSegment {
  start: number;
  end: number;
  label: string;
}

export interface Beat {
  start: number;
  end: number;
  description: string;
}

export interface Audio {
  dialogue?: string;
  ambient?: string;
  sfx?: string[];
  music?: boolean;
}

export interface Prompt {
  en: string;
  zh?: string;
}

export interface RenderSettings {
  mode: RenderMode;
  engine?: string;
  version?: string;
  /** Calculated on the frontend from prompt character length. Optional from backend. */
  characterCount?: PromptCounter;
}

export interface PromptCounter {
  en: number;
  zh: number;
}

export interface ShotNotes {
  warnings?: string[];
  todos?: string[];
  /** Production QA notes: learned failure modes, continuity locks, what to
   *  check in the first render. Emitted by the shot builder per shot. */
  watchFor?: string[];
  approved?: boolean;
}

export interface UISettings {
  layout?: LayoutType;
  defaultLanguage?: Language;
  showTimeline?: boolean;
  showReferences?: boolean;
  collapsedSections?: string[];
}

export type LayoutType = 'shotCards' | 'shotList' | 'timeline' | 'editor' | 'print';

/** A Claude model option displayed in the dialog. */
export interface ClaudeModelOption {
  id: string;
  name: string;
  description: string;
}
