import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SectionHeaderComponent } from '@shared/components/section-header/section-header.component';
import { StudioStore } from '@app/core/stores/studio.store';
import { UsedAssetKind } from '@core/interfaces/studio.models';

/**
 * Section 06 — PROMPT BUILDER.
 *
 * A single textarea that holds the prompt the user (and the cinematography
 * presets) write into. Presets inject themselves into the matching section
 * headers so what the user sees is exactly the text that gets sent to the
 * Seedance API. Reference assets live as chips on top of the textarea and
 * travel through the API payload separately, not as inline tokens.
 */
@Component({
  selector: 'app-prompt-builder',
  imports: [SectionHeaderComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="border-t border-ink-600 px-6 py-6">
      <ui-section-header
        number="06"
        labelKey="STUDIO.PROMPT.TITLE"
        hintKey="STUDIO.PROMPT.HINT"
      />

      <!--
        Reference chips — files attached as generation references. The
        source is unified across the asset drop-zones (first/last/free)
        and the Characters library quick-pick. Each chip has a × to
        remove the reference; the API payload picks them up automatically.
      -->
      @if (studio.usedAssets().length > 0) {
        <div
          class="mt-4 flex flex-wrap items-center gap-2 border border-ink-500 bg-ink-900 px-3 py-2"
        >
          <span
            class="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-muted"
          >
            {{ 'STUDIO.PROMPT.REFERENCES' | translate }}
          </span>
          @for (a of studio.usedAssets(); track a.fileId) {
            <span
              class="inline-flex items-center gap-1.5 border border-ink-500 bg-ink-800 px-2 py-1 font-mono text-[11px] text-secondary-500"
              [attr.data-testid]="'used-asset-' + a.fileId"
              [title]="a.filename"
            >
              <i class="pi" [class]="iconForKind(a.kind)" aria-hidden="true"></i>
              <span>{{ a.name }}</span>
              <button
                type="button"
                class="ml-1 text-fg-muted transition-colors hover:text-primary-500"
                [attr.aria-label]="'COMMON.DELETE' | translate"
                (click)="studio.unuseAsset(a.fileId)"
              >×</button>
            </span>
          }
        </div>
      }

      <div class="mt-4">
        <textarea
          class="block w-full resize-y border border-ink-500 bg-ink-850 px-4 py-3 font-mono text-[12px] leading-relaxed text-fg-strong placeholder:italic placeholder:font-sans placeholder:text-fg-muted focus:border-primary-500 focus:outline-none"
          rows="12"
          [value]="studio.rawDescription()"
          (input)="onInput($event)"
          [placeholder]="placeholder()"
          data-testid="prompt-textarea"
        ></textarea>
        <div class="mt-1 flex items-center justify-end">
          <span class="font-mono text-[11px] text-fg-muted">
            {{ 'STUDIO.PROMPT.CHARS' | translate: { n: studio.rawLength() } }}
          </span>
        </div>
      </div>

      <!--
        Generate action — spans the full Prompt Builder column width
        (matches the viewer width above) for a confident submit affordance.
      -->
      <button
        type="button"
        class="mt-3 flex w-full items-center justify-center gap-3 bg-primary-500 py-3 text-sm font-bold uppercase tracking-[0.28em] text-fg-strong transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        [disabled]="!studio.canGenerate() || !takeSelected()"
        (click)="onGenerate()"
      >
        {{ generateLabel() }}
        <span aria-hidden="true">→</span>
      </button>
    </section>
  `,
})
export class PromptBuilderComponent {
  protected readonly studio = inject(StudioStore);
  private readonly i18n = inject(TranslateService);

  /** Wire this in the parent shell to actually fire the generation call. */
  readonly generate = output<void>();

  /** When true, the generate button reads "VOLVER A GENERAR". */
  readonly isRegenerating = input(false);
  /** When false, the generate button is disabled (no take selected). */
  readonly takeSelected = input(true);

  /** Re-resolve placeholder when the language changes. */
  private readonly lang = toSignal(this.i18n.onLangChange, { initialValue: null });

  protected readonly placeholder = computed(() => {
    this.lang();
    return this.i18n.instant('STUDIO.PROMPT.PLACEHOLDER');
  });

  /** Button label: GENERAR or VOLVER A GENERAR. */
  protected readonly generateLabel = computed(() => {
    // Read signals so this computed re-evaluates when either changes
    const lang = this.lang();
    const regen = this.isRegenerating();
    return this.i18n.instant(
      regen ? 'STUDIO.PROMPT.REGENERATE' : 'STUDIO.PROMPT.GENERATE',
    );
  });

  protected onInput(e: Event) {
    this.studio.setRawDescription((e.target as HTMLTextAreaElement).value);
  }

  protected onGenerate(): void {
    if (!this.studio.canGenerate()) return;
    this.generate.emit();
  }

  /** PrimeIcons class for the chip representing each asset kind. */
  protected iconForKind(kind: UsedAssetKind): string {
    switch (kind) {
      case 'video':
        return 'pi-video';
      case 'audio':
        return 'pi-volume-up';
      case 'mixed':
        return 'pi-folder';
      default:
        return 'pi-image';
    }
  }
}
