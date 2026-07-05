import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { SkillService, Skill } from '@app/services/skill.service';
import { StudioStore } from '@app/core/stores/studio.store';

@Component({
  selector: 'app-skill-select-dialog',
  imports: [DialogModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="visibleChange.emit($event)"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [style]="{ width: '32rem' }"
      header="Select Skill"
    >
      @if (loading()) {
        <p class="py-8 text-center text-[13px] italic text-fg-muted">Loading skills…</p>
      }

      @if (!loading() && skills().length === 0) {
        <div class="flex flex-col items-center gap-3 py-12">
          <i class="pi pi-book text-3xl text-fg-muted"></i>
          <p class="text-[13px] text-fg-muted">No skills available.</p>
          <p class="text-[11px] text-fg-muted">
            Create skills in the Skills section first.
          </p>
        </div>
      }

      <div class="flex flex-col gap-1">
        <!-- Default (no skill) option -->
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-ink-800"
          [class.bg-ink-800]="!selectedId()"
          (click)="selectNone()"
        >
          <span
            class="flex h-4 w-4 items-center justify-center rounded-full border text-[8px]"
            [class.border-primary-500]="!selectedId()"
            [class.bg-primary-500]="!selectedId()"
            [class.text-ink-950]="!selectedId()"
            [class.border-ink-500]="selectedId()"
          >
            @if (!selectedId()) { ✓ }
          </span>
          <div class="min-w-0 flex-1">
            <p class="font-medium">Default</p>
            <p class="text-[11px] text-fg-muted">Built-in system prompt (original)</p>
          </div>
        </button>

        @for (skill of skills(); track skill.id) {
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-ink-800"
            [class.bg-ink-800]="selectedId() === skill.id"
            (click)="select(skill)"
          >
            <span
              class="flex h-4 w-4 items-center justify-center rounded-full border text-[8px]"
              [class.border-primary-500]="selectedId() === skill.id"
              [class.bg-primary-500]="selectedId() === skill.id"
              [class.text-ink-950]="selectedId() === skill.id"
              [class.border-ink-500]="selectedId() !== skill.id"
            >
              @if (selectedId() === skill.id) { ✓ }
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{{ skill.name }}</p>
              @if (skill.description) {
                <p class="truncate text-[11px] text-fg-muted">{{ skill.description }}</p>
              }
            </div>
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
export class SkillSelectDialogComponent {
  private readonly skillService = inject(SkillService);
  private readonly studio = inject(StudioStore);

  readonly visible = input(false);
  readonly visibleChange = output<boolean>();

  protected readonly loading = signal(true);
  protected readonly skills = signal<Skill[]>([]);

  protected readonly selectedId = signal<string | null>(null);

  /** Fetch skills when dialog opens. */
  private readonly fetchOnOpen = effect(() => {
    if (!this.visible()) return;
    this.selectedId.set(this.studio.selectedSkill()?.id || null);
    this.loading.set(true);
    this.skillService.list().subscribe((res) => {
      this.loading.set(false);
      if (!res.error && res.data) {
        this.skills.set(res.data);
      }
    });
  });

  protected selectNone(): void {
    this.studio.setSelectedSkill(null);
    this.visibleChange.emit(false);
  }

  protected select(skill: Skill): void {
    this.studio.setSelectedSkill({
      id: skill.id,
      name: skill.name,
      description: skill.description,
    });
    this.visibleChange.emit(false);
  }
}
