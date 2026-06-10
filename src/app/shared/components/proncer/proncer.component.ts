import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SectionHeaderComponent } from '@shared/components/section-header/section-header.component';

/**
 * Section 02 — PRONCER.
 *
 * AI-assisted prompt refinement panel. This is a placeholder for the
 * next beta — the section header, collapse affordance and visual rhythm
 * match the other Studio sections so the layout reads consistently,
 * but no logic is wired yet. Claude integration lands in a follow-up
 * ticket; in the meantime the body shows a "coming soon" hint so users
 * understand the slot is reserved.
 */
@Component({
  selector: 'app-proncer',
  imports: [SectionHeaderComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="border-t border-ink-600 px-6 py-6">
      <ui-section-header
        number="02"
        labelKey="STUDIO.PRONCER.TITLE"
        hintKey="STUDIO.PRONCER.HINT"
        [collapsible]="true"
        [expanded]="expanded()"
        (toggle)="toggleExpanded()"
      />

      @if (expanded()) {
        <div class="mt-5 flex flex-col gap-3">
          <p class="text-[13px] italic text-fg-muted">
            {{ 'STUDIO.PRONCER.BODY' | translate }}
          </p>
          <div
            class="inline-flex w-fit items-center gap-2 rounded border border-ink-700 bg-ink-850 px-3 py-1.5"
          >
            <span
              aria-hidden="true"
              class="inline-block h-1.5 w-1.5 rounded-full bg-accent-500"
            ></span>
            <span class="text-[10px] font-bold uppercase tracking-[0.18em] text-fg-muted">
              {{ 'STUDIO.PRONCER.STATUS_SOON' | translate }}
            </span>
          </div>
        </div>
      }
    </section>
  `,
})
export class ProncerComponent {
  /** Disclosure state — section body is hidden until the user expands it,
   *  mirroring the behaviour of the other collapsible Studio sections. */
  protected readonly expanded = signal(false);

  protected toggleExpanded(): void {
    this.expanded.update((v) => !v);
  }
}
