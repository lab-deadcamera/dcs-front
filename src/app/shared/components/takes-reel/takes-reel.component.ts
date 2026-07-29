import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Take } from '@core/interfaces/session.models';
import { environment } from '@environment/environment';
import { StudioStore } from '@app/core/stores/studio.store';
import { RESOLVE_URL } from '@app/shared/utils';
import { UsedAsset, VideoGenerateRequest } from '@app/core/interfaces';

/**
 * "CARRETE DE TOMAS" — horizontal strip of take thumbnails.
 *
 * Replaces the old SessionReel. Shows all active takes (one per number)
 * as clickable thumbnails. Discarded takes are grouped in an accordion
 * below, where the user can reactivate them.
 *
 * Clicking a take emits `(selectTake)` with the take's index. Clicking
 * the reactivate button on a discarded take emits `(toggleActive)` with
 * the take's DB id and index.
 */
@Component({
  selector: 'app-takes-reel',
  imports: [TranslatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './takes-reel.component.html',
})
export class TakesReelComponent {
  protected readonly studio = inject(StudioStore);
  /** Active (current generation) takes. */
  readonly takes = input<readonly Take[]>([]);
  /** Discarded (older generation) takes. */
  readonly discardedTakes = input<readonly Take[]>([]);
  /** Currently selected take index (1-based) for highlighting. */
  readonly selectedTakeIndex = input<number>(1);

  /** Emitted when the user clicks a take thumbnail. */
  readonly selectTake = output<number>();
  /** Emitted when the user clicks "reactivate" on a discarded take. */
  readonly toggleActive = output<{ takeId: string; takeIndex: number }>();

  /** Ratings map: takeIndex → 1-5. */
  readonly ratings = input<Record<number, number>>({});

  /** Accordion open state for discarded section. */
  protected readonly discardOpen = signal(false);
  private readonly baseUrl = environment.API_URL.replace(/\/api\/v1\/?$/, '');

  readonly takeSeleted$ = effect(() => {
    const first = this.takes()[this.takes().length - 1];
    if (!first) {
      this.studio.setImagePreview('');
      this.studio.selectClip(null);
      return;
    }
    this.onTakeSeleted(first);
  });

  /** Resolves a possibly-relative video URL (/outputs/...) to an absolute one. */
  protected videoUrl(path: string): string {
    return RESOLVE_URL(path);
  }

  /**
   * Append `#t=0.1` to the video URL so the browser seeks to ~100ms and
   * paints that frame as the visible poster.
   */
  protected posterUrl(url: string): string {
    const full = this.videoUrl(url);
    return full.includes('#') ? full : `${full}#t=0.1`;
  }

  public onTakeSeleted(take: Take) {
    this.selectTake.emit(take.index);
    this.studio.setImagePreview(RESOLVE_URL(take.video_local_url) ?? null);

    const payload: VideoGenerateRequest = JSON.parse(
      take.request_payload || '{}',
    ) as VideoGenerateRequest;
    const text: string = payload.content
      ?.filter((c) => c.type === 'text')
      ?.map((c) => c.text)
      .join('\n');
    this.studio.setRawDescription(text);

    this.studio.clearUsedAssets();
    payload.content
      ?.filter((a) => a.type !== 'text')
      .forEach((a) => {
        const asset: UsedAsset = {
          fileId: a.id,
          characterId: '',
          name: a.text,
          filename: a.name,
          kind: a.type,
        };
        this.studio.useAsset(asset);
      });
  }
}
