/**
 * Video-generation contract (text-to-video and image-to-video).
 *
 * The canonical request / response types alias the existing studio wire
 * format so `VideoGeneratorService` can stand in for what `SeedanceService`
 * used to do without any backend changes.
 */

import {
  StudioContentItem,
  StudioContentType,
  StudioGenerateRequest,
  StudioOutput,
  StudioTaskResponse,
  StudioTaskStatus,
} from './seedance.interface';

export type VideoGeneratorStatus = StudioTaskStatus;
export type VideoGenerateContentType = StudioContentType;
export type VideoGenerateContentItem = StudioContentItem;
export type VideoGenerateOutput = StudioOutput;
export type VideoGenerateRequest = StudioGenerateRequest;
export type VideoGenerateResponse = StudioTaskResponse;

/**
 * Slot a referenced file fills inside a generation. Kept distinct from
 * `VideoGenerateContentItem` so callers that build typed reference lists
 * (e.g. drop-zone slots) can stay strongly-typed end-to-end.
 */
export interface VideoReference {
  /** File UUID from POST /files/upload. */
  fileId: string;
  role?: 'first-frame' | 'last-frame' | 'reference';
}
