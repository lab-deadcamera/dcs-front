import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CLAUDE_MODELS } from '@app/core/constants';
import { ClaudeModelOption } from '@app/core/interfaces';

/**
 * Minimal model-select dialog for the Shot Builder.
 * Only lists hardcoded Claude models — does not query the backend provider store.
 */
@Component({
  selector: 'app-claude-model-select-dialog',
  imports: [DialogModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="visibleChange.emit($event)"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [style]="{ width: '28rem' }"
      header="Claude Model"
    >
      <div class="flex flex-col gap-2">
        @for (m of models; track m.id) {
          <button
            type="button"
            class="flex w-full flex-col gap-1 rounded px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-ink-800"
            [class.bg-ink-800]="isSelected(m.id)"
            (click)="select(m)"
          >
            <div class="flex items-center gap-3">
              <span
                class="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[8px]"
                [class.border-primary-500]="isSelected(m.id)"
                [class.bg-primary-500]="isSelected(m.id)"
                [class.text-ink-950]="isSelected(m.id)"
                [class.border-ink-500]="!isSelected(m.id)"
              >
                @if (isSelected(m.id)) {
                  ✓
                }
              </span>
              <span class="font-semibold">{{ m.name }}</span>
            </div>
            <p class="ml-7 text-[11px] leading-snug text-fg-muted">
              {{ m.description }}
            </p>
          </button>
        }
      </div>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            severity="secondary"
            [text]="true"
            label="Cancel"
            (onClick)="visibleChange.emit(false)"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class ClaudeModelSelectDialogComponent {
  readonly visible = input(false);
  readonly visibleChange = output<boolean>();
  /** Emits the selected Claude model name (e.g. "claude-sonnet-4-6"). */
  readonly modelChange = output<string>();

  protected readonly models = CLAUDE_MODELS;

  protected selectedId = CLAUDE_MODELS[0].id;

  protected isSelected(id: string): boolean {
    return this.selectedId === id;
  }

  protected select(m: ClaudeModelOption): void {
    this.selectedId = m.id;
    this.modelChange.emit(m.name);
    this.visibleChange.emit(false);
  }
}
