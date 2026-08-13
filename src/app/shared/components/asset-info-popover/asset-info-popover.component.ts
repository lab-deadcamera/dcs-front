import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { Popover } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { SourceThumbnailAssetPipe } from '@app/core/pipes';
import { AssetViewerComponent } from '@shared/components/asset-viewer/asset-viewer.component';

/** Descriptor for the asset metadata popover — the minimal fields needed to
 *  identify and preview an asset from any context. */
export interface AssetInfo {
  /** File id — serves the image preview and is shown as the file id. */
  id: string;
  /** Display name (character name or filename). */
  name: string;
  /** File kind: 'image' | 'video' | 'audio' (or a file-like kind). */
  kind: string;
  /** Optional [ImageN] / [VideoN] slot label. */
  slot?: string;
  /** Optional semantic type label (character/location/prop). */
  type?: string;
}

/**
 * Reusable metadata popover for asset thumbnails: shows the image, name, kind,
 * optional slot/type and the file id. Used wherever the `sourceAsset` /
 * `sourceThumbnailAsset` pipes render an asset so the user can click it for
 * its metadata.
 */
@Component({
  selector: 'app-asset-info-popover',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    Popover,
    TooltipModule,
    SourceThumbnailAssetPipe,
    AssetViewerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-popover #pop [dismissable]="true" styleClass="asset-popover-z">
      @if (asset(); as a) {
        <div class="asset-info">
          <p class="asset-info-title">
            @if (a.slot) {
              <span class="asset-info-slot">{{ a.slot }}</span>
            }
            {{ a.name }}
          </p>

          @if ((a.kind === 'image' || a.kind === 'mixed') && a.id) {
            <button
              type="button"
              class="asset-info-img-btn"
              (click)="openViewer()"
              [attr.aria-label]="'STUDIO.SHOT_BUILDER.OPEN_IMAGE_TOOLTIP' | translate"
              [pTooltip]="'STUDIO.SHOT_BUILDER.OPEN_IMAGE_TOOLTIP' | translate"
              tooltipPosition="top"
            >
              <img
                [src]="a.id | sourceThumbnailAsset"
                [alt]="a.name"
                class="asset-info-img"
                loading="lazy"
              />
              <span class="asset-info-expand" aria-hidden="true">
                <i class="pi pi-expand"></i>
              </span>
            </button>
          } @else if ((a.kind === 'video' || a.kind === 'audio') && a.id) {
            <button
              type="button"
              class="asset-info-media-btn"
              (click)="openViewer()"
              [attr.aria-label]="
                (a.kind === 'video'
                  ? 'STUDIO.SHOT_BUILDER.OPEN_VIDEO_TOOLTIP'
                  : 'STUDIO.SHOT_BUILDER.OPEN_AUDIO_TOOLTIP'
                ) | translate
              "
              [pTooltip]="
                (a.kind === 'video'
                  ? 'STUDIO.SHOT_BUILDER.OPEN_VIDEO_TOOLTIP'
                  : 'STUDIO.SHOT_BUILDER.OPEN_AUDIO_TOOLTIP'
                ) | translate
              "
              tooltipPosition="top"
            >
              <i
                class="pi"
                [class.pi-video]="a.kind === 'video'"
                [class.pi-volume-up]="a.kind === 'audio'"
                aria-hidden="true"
              ></i>
            </button>
          }

          <dl class="asset-info-dl">
            <div>
              <dt>{{ 'STUDIO.SHOT_BUILDER.INFO_NAME' | translate }}</dt>
              <dd>{{ a.name }}</dd>
            </div>
            @if (a.type) {
              <div>
                <dt>{{ 'STUDIO.SHOT_BUILDER.INFO_TYPE' | translate }}</dt>
                <dd class="cap">{{ a.type }}</dd>
              </div>
            }
            <div>
              <dt>{{ 'STUDIO.SHOT_BUILDER.INFO_FILE' | translate }}</dt>
              <dd>{{ a.kind }}</dd>
            </div>
            @if (a.slot) {
              <div>
                <dt>{{ 'STUDIO.SHOT_BUILDER.INFO_SLOT' | translate }}</dt>
                <dd class="mono">{{ a.slot }}</dd>
              </div>
            }
            <div>
              <dt>{{ 'STUDIO.SHOT_BUILDER.INFO_FILE_ID' | translate }}</dt>
              <dd class="mono">{{ a.id }}</dd>
            </div>
          </dl>

          @if (useLabel()) {
            <button type="button" class="asset-info-use" (click)="use.emit(a)">
              {{ useLabel() }}
            </button>
          }
        </div>
      }
    </p-popover>

    <!-- Full-screen asset viewer (same component as the Files module / shot builder) -->
    @if (viewerVisible()) {
      <app-asset-viewer [(visible)]="viewerVisible" [file]="viewerFile()" />
    }
  `,
  styles: [
    `
      .asset-info {
        width: 300px;
        padding: 14px;
        background: var(--panel, #121f21);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .asset-info-title {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        color: var(--ink, #ece6d8);
        margin: 0;
        display: flex;
        align-items: baseline;
        gap: 8px;
        word-break: break-all;
      }
      .asset-info-slot {
        color: var(--amber, #e0a95c);
        font-weight: 700;
        width: 5rem;
      }
      .asset-info-img-btn {
        position: relative;
        display: block;
        width: 100%;
        padding: 0;
        border: 1px solid var(--line, #1e3133);
        border-radius: 3px;
        background: var(--bg2, #0f1a1c);
        overflow: hidden;
        cursor: zoom-in;
        transition: border-color 0.15s ease;
      }
      .asset-info-img-btn:hover {
        border-color: var(--amber, #e0a95c);
      }
      .asset-info-img {
        display: block;
        width: 100%;
        max-height: 160px;
        object-fit: cover;
      }
      .asset-info-expand {
        position: absolute;
        top: 6px;
        right: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 3px;
        background: rgba(0, 0, 0, 0.55);
        color: rgba(255, 255, 255, 0.85);
      }
      .asset-info-media-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 80px;
        border: 1px solid var(--line, #1e3133);
        border-radius: 3px;
        background: var(--bg2, #0f1a1c);
        cursor: pointer;
        transition: border-color 0.15s ease;
      }
      .asset-info-media-btn:hover {
        border-color: var(--amber, #e0a95c);
      }
      .asset-info-media-btn .pi {
        font-size: 24px;
        color: var(--ink-dim, #9aa6a3);
      }
      .asset-info-dl {
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .asset-info-dl > div {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
      }
      .asset-info-dl dt {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--ink-faint, #6a7977);
        margin: 0;
        flex-shrink: 0;
      }
      .asset-info-dl dd {
        margin: 0;
        font-size: 12px;
        color: var(--ink, #ece6d8);
        text-align: right;
        word-break: break-all;
      }
      .asset-info-dl dd.cap {
        text-transform: capitalize;
      }
      .asset-info-dl dd.mono {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        color: var(--ink-dim, #9aa6a3);
      }
      .asset-info-use {
        margin-top: 2px;
        width: 100%;
        padding: 8px 0;
        border: 1px solid var(--amber, #e0a95c);
        border-radius: 3px;
        background: rgba(224, 169, 92, 0.12);
        color: var(--amber, #e0a95c);
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .asset-info-use:hover {
        background: rgba(224, 169, 92, 0.24);
      }
    `,
  ],
})
export class AssetInfoPopoverComponent {
  /** Asset currently shown in the popover. */
  protected readonly asset = signal<AssetInfo | null>(null);

  /** File shown in the full-screen viewer (same component as the Files module). */
  protected readonly viewerFile = signal<{ id: string; filename: string; mimeType: string } | null>(
    null,
  );
  /** Whether the full-screen viewer dialog is open. */
  protected readonly viewerVisible = signal(false);

  /** Optional label for a "Use" action (e.g. add to the prompt builder). When
   *  empty, no Use button renders. */
  readonly useLabel = input<string>('');
  /** Emitted when the Use button is clicked. */
  readonly use = output<AssetInfo>();

  @ViewChild('pop') protected readonly pop!: Popover;

  /** Open the metadata popover anchored at the clicked element. */
  open(event: Event, asset: AssetInfo): void {
    this.asset.set(asset);
    this.pop.toggle(event);
  }

  /** Open the full-screen viewer for the asset currently shown in the popover
   *  (same AssetViewerComponent as the Files module / shot builder). */
  protected openViewer(): void {
    const a = this.asset();
    if (!a || !a.id) return;
    this.viewerFile.set({
      id: a.id,
      filename: a.name,
      mimeType: a.kind === 'video' ? 'video/mp4' : a.kind === 'audio' ? 'audio/mpeg' : 'image/png',
    });
    this.viewerVisible.set(true);
    this.close();
  }

  /** Hide the popover (e.g. after the Use action completes). */
  close(): void {
    this.pop.hide();
  }
}
