import { ChangeDetectionStrategy, Component, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';

export interface BreadcrumbOption {
  id: string;
  number: number;
  name: string;
  label: string;
}

@Component({
  selector: 'app-studio-breadcrumb',
  imports: [
    FormsModule,
    DecimalPipe,
    ButtonModule,
    DialogModule,
    SelectModule,
    InputTextModule,
    FloatLabelModule,
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
  readonly createShot = output<string>();

  // ── New Shot dialog state ───────────────────────────────────────────

  protected readonly newShotDialogVisible = signal(false);
  protected readonly newShotName = signal('');
  protected readonly newShotSubmitting = signal(false);

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

  protected onShotChange(id: string | null): void {
    this.selectedShotId.set(id);
    this.shotChange.emit(id);
  }

  // ── New Shot dialog ─────────────────────────────────────────────────

  protected onOpenNewShotDialog(): void {
    this.newShotName.set('');
    this.newShotDialogVisible.set(true);
  }

  protected onCancelNewShot(): void {
    this.newShotDialogVisible.set(false);
  }

  protected onConfirmNewShot(): void {
    const raw = this.newShotName().trim();
    if (!raw) return;
    this.newShotSubmitting.set(true);
    this.createShot.emit(raw);
  }

  /** Called from parent after create completes to reset dialog state. */
  resetNewShotDialog(): void {
    this.newShotSubmitting.set(false);
    this.newShotDialogVisible.set(false);
    this.newShotName.set('');
  }
}
