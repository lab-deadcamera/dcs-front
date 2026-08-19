import { UsedAsset } from '@core/interfaces/studio.models';

/**
 * Reference to one asset that travels to the video generator as a
 * reference item (image_url / video_url / audio_url).
 */
export interface SlotRef {
  fileId: string;
  kind: 'image' | 'video' | 'audio';
  /** Original [ImageN]/[VideoN]/[AudioN] slot inherited from the chapter assignment. */
  slot?: string;
}

/**
 * The exact order in which reference assets are attached to the payload:
 * first frame, last frame, then used assets — deduped by fileId.
 * Slot numbering in the prompt must be positional over THIS order, because
 * Seedance resolves [ImageN] against the Nth reference item in the payload.
 */
export function buildSlotReferences(
  first: { id: string; kind: 'image' | 'video' | 'audio' } | null,
  last: { id: string; kind: 'image' | 'video' | 'audio' } | null,
  used: UsedAsset[],
): SlotRef[] {
  const out: SlotRef[] = [];
  const seen = new Set<string>();
  const push = (ref: SlotRef): void => {
    if (seen.has(ref.fileId)) return;
    seen.add(ref.fileId);
    out.push(ref);
  };

  if (first) push({ fileId: first.id, kind: first.kind });
  if (last) push({ fileId: last.id, kind: last.kind });
  for (const a of used) {
    push({
      fileId: a.fileId,
      kind: a.kind === 'mixed' ? 'image' : a.kind,
      slot: a.slot,
    });
  }
  return out;
}

const TOKEN_PATTERN = /\[(image|video|audio)(\d+)\]/gi;

/** Capitalize a kind label ("image" → "Image") for the canonical token form. */
const cap = (s: string): string => s[0].toUpperCase() + s.slice(1);

/**
 * Replace every occurrence of the exact slot token `oldSlot` (e.g.
 * "[Image1]", case-insensitive) with `newSlot`. Only full tokens are matched,
 * so "[Image11]" is never corrupted by a replacement of "[Image1]".
 */
export function replaceSlotToken(text: string, oldSlot: string, newSlot: string): string {
  if (!text || !oldSlot || !newSlot) return text;
  const m = oldSlot.match(/^\[(image|video|audio)(\d+)\]$/i);
  if (!m) return text;
  const re = new RegExp(`\\[${m[1]}${m[2]}\\]`, 'gi');
  return text.replace(re, newSlot);
}

/**
 * Distinct [ImageN]/[VideoN]/[AudioN] tokens in `text`, in ORDER OF FIRST
 * APPEARANCE, deduped (case-insensitive). The pre-prompt's first-appearance
 * order is what determines the positional numbering, so the model resolves
 * each token against the reference item at the same position.
 */
export function collectSlotTokensInOrder(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = new RegExp(TOKEN_PATTERN.source, TOKEN_PATTERN.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const token = m[0].toLowerCase();
    if (!seen.has(token)) {
      seen.add(token);
      out.push(token);
    }
  }
  return out;
}

/**
 * Reindex every [ImageN]/[VideoN]/[AudioN] token in `text` to a POSITIONAL
 * number (1..N per kind, in `refs` order), so the text matches the order in
 * which the reference items are attached to the payload.
 *
 * The mapping is per asset: a token whose number equals an asset's inherited
 * slot is rewritten to that asset's positional number. Every occurrence in the
 * text is replaced (case-insensitive). Tokens that match no used asset are left
 * untouched — they cannot be mapped unambiguously.
 */
export function reindexSlotTokens(
  text: string,
  refs: Array<{ fileId: string; kind: 'image' | 'video' | 'audio'; slot?: string }>,
): string {
  // Build old-slot-token → new-positional-token map, per kind, over refs order.
  const map = new Map<string, string>();
  const counts: Record<'image' | 'video' | 'audio', number> = { image: 0, video: 0, audio: 0 };
  for (const r of refs) {
    counts[r.kind]++;
    if (r.slot) {
      const m = r.slot.match(/^\[(image|video|audio)(\d+)\]$/i);
      if (m) {
        const oldToken = `[${m[1].toLowerCase()}${m[2]}]`;
        map.set(oldToken, `[${cap(r.kind)}${counts[r.kind]}]`);
      }
    }
  }
  if (map.size === 0) return text;

  return text.replace(TOKEN_PATTERN, (full, kind: string, num: string) => {
    const token = `[${kind.toLowerCase()}${num}]`;
    return map.get(token) ?? full;
  });
}
