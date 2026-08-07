import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TooltipModule } from 'primeng/tooltip';
import { Popover } from 'primeng/popover';
import { SceneAssignmentComponent } from '@modules/director/director/ui/scene-assignment/scene-assignment';
import { TruncateLenPipe } from '@app/core/pipes';

export interface BreadcrumbOption {
  id: string;
  number: number;
  name: string;
  label: string;
  /** Whether the scene has any resources assigned. */
  hasAssignments?: boolean;
  /** The shot's pre-prompt (description) — used when cloning a shot. */
  description?: string;
  /** Number of takes recorded against the item — used to block deletion. */
  takeCount?: number;
}

/** Sortable field for the breadcrumb selects. */
export type SortField = 'name' | 'number';
export type SortDir = 'asc' | 'desc';

/** Target of the shared edit / delete dialogs (scene or shot). */
type ManageTarget = { kind: 'scene' | 'shot'; option: BreadcrumbOption };

const SORT_KEY = 'studio-breadcrumb-sort';

/** Read the persisted sort preference; falls back to name-asc (current behavior). */
function loadSortPref(): { field: SortField; dir: SortDir } {
  try {
    const raw = localStorage.getItem(SORT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { field?: SortField; dir?: SortDir };
      const field = parsed.field === 'number' ? 'number' : 'name';
      const dir = parsed.dir === 'desc' ? 'desc' : 'asc';
      return { field, dir };
    }
  } catch {
    /* corrupted storage — use default */
  }
  return { field: 'name', dir: 'asc' };
}

/** Sort a list of options by field + direction (returns a new array). */
function sortOptions<T extends { name: string; number: number }>(
  list: T[],
  pref: { field: SortField; dir: SortDir },
): T[] {
  const dir = pref.dir === 'desc' ? -1 : 1;
  return [...list].sort((a, b) => {
    const cmp =
      pref.field === 'number' ? a.number - b.number : a.name.localeCompare(b.name);
    return cmp * dir;
  });
}

@Component({
  selector: 'app-studio-breadcrumb',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    DecimalPipe,
    ButtonModule,
    DialogModule,
    SelectModule,
    TruncateLenPipe,
    FloatLabelModule,
    SceneAssignmentComponent,
    TooltipModule,
    Popover,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './studio-breadcrumb.html',
  styleUrl: './studio-breadcrumb.css',
})
export class StudioBreadcrumbComponent {
  // ── Inputs: option arrays ───────────────────────────────────────────

  readonly projects = input<{ id: string; name: string }[]>([]);
  readonly chapters = input<BreadcrumbOption[]>([]);
  readonly scenes = input<BreadcrumbOption[]>([]);
  readonly shots = input<BreadcrumbOption[]>([]);
  /** Show the "Assign Resources" button next to the scene select. */
  readonly showAssignmentButton = input(false);
  /** Show the scene/shot edit & delete buttons (gated to directors/admins). */
  readonly canManage = input(false);

  // ── Inputs: loading states ──────────────────────────────────────────

  readonly loadingProjects = input(false);
  readonly loadingChapters = input(false);
  readonly loadingScenes = input(false);
  readonly loadingShots = input(false);

  // ── Inputs: selected scene for the new-shot dialog ──────────────────

  readonly selectedSceneObj = input<{ id: string; number: number; name: string } | null>(null);

  // ── Two-way models: selected IDs ────────────────────────────────────

  readonly selectedProjectId = model<string | null>(null);
  readonly selectedChapterId = model<string | null>(null);
  readonly selectedSceneId = model<string | null>(null);
  readonly selectedShotId = model<string | null>(null);

  // ── Outputs ─────────────────────────────────────────────────────────

  readonly projectChange = output<string | null>();
  readonly chapterChange = output<string | null>();
  readonly sceneChange = output<string | null>();
  readonly shotChange = output<string | null>();
  /** Emitted when "Create & Open" is confirmed in the New Shot dialog. */
  readonly createShot = output<{ name: string; sourceShot: BreadcrumbOption | null }>();
  /** Emitted after resources are assigned/changed in the dialog. */
  readonly assignmentsChanged = output<void>();
  /** Emitted when the user confirms an edit of the selected scene. */
  readonly editScene = output<BreadcrumbOption>();
  /** Emitted when the user confirms an edit of the selected shot. */
  readonly editShot = output<BreadcrumbOption>();
  /** Emitted when the user confirms deletion of the selected scene. */
  readonly deleteScene = output<BreadcrumbOption>();
  /** Emitted when the user confirms deletion of the selected shot. */
  readonly deleteShot = output<BreadcrumbOption>();

  // ── Sort preference ─────────────────────────────────────────────────

  /** User-chosen sort order for the selects, persisted to localStorage. */
  readonly sortPref = signal<{ field: SortField; dir: SortDir }>(loadSortPref());
  /** Popover host for the sort controls. */
  @ViewChild('sortPopover') protected readonly sortPopover!: Popover;

  /** Options sorted per the user preference (never mutate the inputs). */
  protected readonly sortedProjects = computed(() => {
    const dir = this.sortPref().dir === 'desc' ? -1 : 1;
    return [...this.projects()].sort((a, b) => a.name.localeCompare(b.name) * dir);
  });
  protected readonly sortedChapters = computed(() =>
    sortOptions(this.chapters(), this.sortPref()),
  );
  protected readonly sortedScenes = computed(() => sortOptions(this.scenes(), this.sortPref()));
  protected readonly sortedShots = computed(() => sortOptions(this.shots(), this.sortPref()));

  protected readonly sortFieldLabel = computed(() =>
    this.sortPref().field === 'number' ? 'Number' : 'Name',
  );
  protected readonly sortDirLabel = computed(() =>
    this.sortPref().dir === 'desc' ? 'Descending' : 'Ascending',
  );

  protected onSortFieldChange(field: SortField): void {
    this.sortPref.update((p) => ({ ...p, field }));
    this.persistSortPref();
  }

  protected onSortDirChange(dir: SortDir): void {
    this.sortPref.update((p) => ({ ...p, dir }));
    this.persistSortPref();
  }

  private persistSortPref(): void {
    try {
      localStorage.setItem(SORT_KEY, JSON.stringify(this.sortPref()));
    } catch {
      /* storage unavailable — ignore */
    }
  }

  // ── Episode Assignment dialog state ────────────────────────────────

  protected readonly episodeAssignmentDialogVisible = signal(false);

  /** Resolved names for the assignment dialog inputs. */
  protected readonly selectedProjectName = computed(
    () => this.projects().find((p) => p.id === this.selectedProjectId())?.name ?? '',
  );
  protected readonly selectedChapterNumber = computed(() => {
    const c = this.chapters().find((c) => c.id === this.selectedChapterId());
    return c?.number ?? 0;
  });
  protected readonly selectedChapterName = computed(
    () => this.chapters().find((c) => c.id === this.selectedChapterId())?.name ?? '',
  );
  protected readonly selectedSceneNumber = computed(() => {
    const s = this.scenes().find((s) => s.id === this.selectedSceneId());
    return s?.number ?? 0;
  });
  protected readonly selectedSceneName = computed(
    () => this.scenes().find((s) => s.id === this.selectedSceneId())?.name ?? '',
  );

  // ── New Shot dialog state ───────────────────────────────────────────

  protected readonly newShotDialogVisible = signal(false);
  protected readonly newShotSubmitting = signal(false);

  /** Reactive form for the New Shot dialog. The name validator is dynamic:
   *  without a source shot it requires a full name; with a source shot it
   *  requires the name to extend the source with a suffix of ≥3 letters. */
  protected readonly newShotForm = new FormGroup(
    {
      source: new FormControl<BreadcrumbOption | null>(null),
      name: new FormControl(''),
    },
    { validators: [this.newShotNameValidator] },
  );

  /** The currently selected clone source (for the template helper text). */
  protected readonly newShotSource = computed(() => this.newShotForm.controls.source.value);

  private newShotNameValidator(group: AbstractControl): ValidationErrors | null {
    const form = group as FormGroup;
    const name = (form.get('name')?.value ?? '').trim();
    if (!name) return { requiredName: true };

    const source = form.get('source')?.value as BreadcrumbOption | null;
    if (!source) return null; // brand new shot — any non-empty name is valid

    if (!name.startsWith(source.name)) return { suffixRequired: true };
    const suffix = name.slice(source.name.length);
    const letters = [...suffix].filter((ch) => /[a-zA-Z]/.test(ch)).length;
    return letters >= 3 ? null : { suffixTooShort: true };
  }

  // ── Handlers ────────────────────────────────────────────────────────

  protected onProjectChange(id: string | null): void {
    this.selectedProjectId.set(id);
    this.selectedChapterId.set(null);
    this.selectedSceneId.set(null);
    this.selectedShotId.set(null);
    this.projectChange.emit(id);
  }

  protected onChapterChange(id: string | null): void {
    this.selectedChapterId.set(id);
    this.selectedSceneId.set(null);
    this.selectedShotId.set(null);
    this.chapterChange.emit(id);
  }

  protected onSceneChange(id: string | null): void {
    this.selectedSceneId.set(id);
    this.selectedShotId.set(null);
    this.sceneChange.emit(id);
  }

  /** Click on the cog icon inside an episode dropdown option. */
  protected onEpisodeCogClick(chapter: BreadcrumbOption): void {
    // Select that chapter first so the dialog has the right IDs
    this.selectedChapterId.set(chapter.id);
    this.selectedSceneId.set(null);
    this.selectedShotId.set(null);
    this.chapterChange.emit(chapter.id);
    // Open the assignment dialog
    this.episodeAssignmentDialogVisible.set(true);
  }

  protected onShotChange(id: string | null): void {
    this.selectedShotId.set(id);
    this.shotChange.emit(id);
  }

  // ── New Shot dialog ─────────────────────────────────────────────────

  protected onOpenNewShotDialog(): void {
    this.newShotForm.reset({ source: null, name: '' });
    this.newShotDialogVisible.set(true);
  }

  protected onCancelNewShot(): void {
    this.newShotDialogVisible.set(false);
  }

  /** User picked a shot to clone from — prefill the base name so they can
   *  append their own suffix (no "(copy)" auto-added). */
  protected onNewShotSourceChange(source: BreadcrumbOption | null): void {
    this.newShotForm.patchValue({ source, name: source ? source.name : '' });
    this.newShotForm.markAllAsTouched();
  }

  protected onConfirmNewShot(): void {
    if (this.newShotForm.invalid) return;
    const name = (this.newShotForm.controls.name.value ?? '').trim();
    const source = this.newShotForm.controls.source.value;
    if (!name) return;
    this.newShotSubmitting.set(true);
    this.createShot.emit({ name, sourceShot: source });
  }

  /** Called from parent after create completes to reset dialog state. */
  resetNewShotDialog(): void {
    this.newShotSubmitting.set(false);
    this.newShotDialogVisible.set(false);
    this.newShotForm.reset({ source: null, name: '' });
  }

  // ── Edit / Delete dialogs (scene & shot) ─────────────────────────

  /** Which item the shared edit dialog is currently editing. */
  protected readonly editTarget = signal<ManageTarget | null>(null);
  protected readonly editDialogVisible = signal(false);
  protected readonly editSubmitting = signal(false);

  /** Reactive form for the edit dialog (number + name). */
  protected readonly editForm = new FormGroup({
    number: new FormControl<number>(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1)],
    }),
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected readonly editDialogTitle = computed(() =>
    this.editTarget()?.kind === 'scene' ? 'Edit Scene' : 'Edit Shot',
  );

  /** Which item the shared delete-confirm dialog is about to delete. */
  protected readonly deleteTarget = signal<ManageTarget | null>(null);
  protected readonly deleteDialogVisible = signal(false);
  protected readonly deleteSubmitting = signal(false);

  /** Open the shared edit dialog for the given scene/shot option. */
  protected onEditOption(kind: 'scene' | 'shot', option: BreadcrumbOption): void {
    this.editTarget.set({ kind, option });
    this.editForm.setValue({ number: option.number, name: option.name });
    this.editDialogVisible.set(true);
  }

  protected onCancelEdit(): void {
    this.editDialogVisible.set(false);
  }

  protected onConfirmEdit(): void {
    const target = this.editTarget();
    if (!target || this.editForm.invalid) return;
    const payload: BreadcrumbOption = {
      id: target.option.id,
      number: Number(this.editForm.controls.number.value),
      name: (this.editForm.controls.name.value ?? '').trim(),
      label: target.option.label,
      description: target.option.description,
      takeCount: target.option.takeCount,
    };
    this.editSubmitting.set(true);
    if (target.kind === 'scene') this.editScene.emit(payload);
    else this.editShot.emit(payload);
  }

  /** Called from parent after the edit completes to close the dialog. */
  resetEditDialog(): void {
    this.editSubmitting.set(false);
    this.editDialogVisible.set(false);
    this.editTarget.set(null);
  }

  /** Open the delete confirmation for the given scene/shot option
   *  (no-op if the item already has takes — the button is also disabled). */
  protected onDeleteOption(kind: 'scene' | 'shot', option: BreadcrumbOption): void {
    if ((option.takeCount ?? 0) > 0) return;
    this.deleteTarget.set({ kind, option });
    this.deleteDialogVisible.set(true);
  }

  protected onCancelDelete(): void {
    this.deleteDialogVisible.set(false);
  }

  protected onConfirmDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;
    this.deleteSubmitting.set(true);
    if (target.kind === 'scene') this.deleteScene.emit(target.option);
    else this.deleteShot.emit(target.option);
  }

  /** Called from parent after deletion completes to close the dialog. */
  resetDeleteDialog(): void {
    this.deleteSubmitting.set(false);
    this.deleteDialogVisible.set(false);
    this.deleteTarget.set(null);
  }
}
