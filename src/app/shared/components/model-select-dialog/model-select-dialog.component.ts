import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ModelService } from '@app/services';
import { ModelData } from '@app/core/interfaces';
import { StudioStore } from '@app/core/stores/studio.store';

@Component({
  selector: 'app-model-select-dialog',
  imports: [DialogModule, ButtonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="visibleChange.emit($event)"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [style]="{ width: '32rem' }"
      header="Select Model"
    >
      @if (loading()) {
        <p class="py-8 text-center text-[13px] italic text-fg-muted">Loading models…</p>
      }

      @if (!loading() && grouped().length === 0) {
        <div class="flex flex-col items-center gap-3 py-12">
          <i class="pi pi-database text-3xl text-fg-muted"></i>
          <p class="text-[13px] text-fg-muted">No models available.</p>
          <p class="text-[11px] text-fg-muted">Configure providers and models in the Providers section first.</p>
        </div>
      }

      <div class="flex flex-col gap-2">
        @for (group of grouped(); track group.provider) {
          <div>
            <p
              class="mb-1 border-b pb-1 text-[11px] font-bold uppercase tracking-[0.12em]"
              style="border-color: var(--border-color); color: var(--text-secondary);"
            >
              {{ group.provider }}
            </p>

            <div class="flex flex-col gap-0.5">
              @for (m of group.models; track m.id) {
                <button
                  type="button"
                  class="flex w-full items-center gap-3 rounded px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-ink-800"
                  [class.bg-ink-800]="isSelected(m.id)"
                  (click)="select(m)"
                >
                  <span
                    class="flex h-4 w-4 items-center justify-center rounded-full border text-[8px]"
                    [class.border-primary-500]="isSelected(m.id)"
                    [class.bg-primary-500]="isSelected(m.id)"
                    [class.text-ink-950]="isSelected(m.id)"
                    [class.border-ink-500]="!isSelected(m.id)"
                  >
                    @if (isSelected(m.id)) {
                      ✓
                    }
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="truncate font-medium">{{ m.name }}</p>
                    <p class="truncate text-[11px] text-fg-muted">{{ m.url }}{{ m.endpoint }}</p>
                  </div>
                  @if (m.favorite) {
                    <span
                      class="flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]"
                      style="background: var(--primary-500); color: var(--ink-950);"
                    >
                      fav
                    </span>
                  }
                </button>
              }
            </div>
          </div>
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
export class ModelSelectDialogComponent {
  private readonly modelService = inject(ModelService);
  private readonly studio = inject(StudioStore);

  readonly visible = input(false);
  readonly visibleChange = output<boolean>();

  protected readonly loading = signal(true);
  protected readonly grouped = signal<{ provider: string; models: ModelData[] }[]>([]);

  /** Refetch models cada vez que el diálogo se abre, así siempre está actualizado. */
  private readonly fetchOnOpen = effect(() => {
    if (!this.visible()) return;
    this.loading.set(true);
    this.modelService.getAllModels().subscribe((res) => {
      this.loading.set(false);
      if (res.error || !res.data) return;

      const map = new Map<string, ModelData[]>();
      for (const m of res.data) {
        const key = m.provider_name || 'Other';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(m);
      }
      this.grouped.set(
        Array.from(map.entries()).map(([provider, models]) => ({ provider, models })),
      );
    });
  });

  protected isSelected(id: string): boolean {
    return this.studio.modelCode()?.id === id;
  }

  protected select(m: ModelData): void {
    this.studio.model = m;
    this.visibleChange.emit(false);
  }
}
