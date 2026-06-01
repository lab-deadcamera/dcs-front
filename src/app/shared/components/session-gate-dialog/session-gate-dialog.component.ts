import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environment/environment';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { SessionStore } from '@app/core/stores/session.store';
import { StudioStore } from '@app/core/stores/studio.store';
import { ProjectsApiService } from '@modules/projects/projects/services';
import { ValidatorErrors } from '@shared/components/validation-errors/validator-errors.component';
import { Project, Scene } from '@modules/projects/projects/interfaces';

/**
 * Entry gate: blocks the studio until the user has selected a project,
 * episode (chapter), and scene. The user must also provide a name for
 * the new shot, which is created on submit.
 *
 * Admins (role level <= 1) may close the dialog without configuring a
 * session; regular users must complete the form to proceed.
 */
@Component({
  selector: 'app-session-gate-dialog',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    DecimalPipe,
    DialogModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    ToastModule,
    ValidatorErrors,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="onVisibleChange($event)"
      [modal]="true"
      [closable]="adminClosable()"
      [closeOnEscape]="adminClosable()"
      [draggable]="false"
      [dismissableMask]="false"
      [style]="{ width: '32rem' }"
      [header]="'STUDIO.SESSION_GATE.TITLE' | translate"
    >
      <p class="mb-4 text-[12px] italic text-fg-muted">
        {{ 'STUDIO.SESSION_GATE.HINT' | translate }}
      </p>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
        <!-- Nickname — read-only display -->
        <div class="flex flex-col gap-1">
          <span class="text-[12px] font-bold uppercase tracking-[0.12em]">
            {{ 'STUDIO.SESSION_GATE.HANDLE' | translate }}
          </span>
          <span
            class="rounded px-3 py-2 text-[14px]"
            style="background: var(--surface-ground); border: 1px solid var(--border-color);"
          >
            {{ user()?.handle || user()?.email || '—' }}
          </span>
        </div>

        <div class="flex flex-col gap-1">
          <label
            for="session-gate-project"
            class="text-[12px] font-bold uppercase tracking-[0.12em]"
          >
            Project
          </label>
          @if (loadingProjects()) {
            <p class="text-[12px] italic text-fg-muted">Loading projects…</p>
          } @else {
            <p-select
              inputId="session-gate-project"
              formControlName="projectId"
              [options]="projects()"
              appendTo="body"
              optionLabel="name"
              optionValue="id"
              [placeholder]="'Select a project'"
              [showClear]="true"
              styleClass="w-full"
              data-testid="session-gate-project"
              (onChange)="onProjectChange($event.value)"
            />
          }
          <validator-errors [control]="form.get('projectId')" [label]="'Project'" />
        </div>

        <div class="flex flex-col gap-1">
          <label for="session-gate-episode" class="text-[12px] font-bold uppercase tracking-[0.12em]">
            Episode
          </label>
          @if (!form.get('projectId')?.value) {
            <p class="text-[12px] italic text-fg-muted">Select a project first.</p>
          } @else if (loadingChapters()) {
            <p class="text-[12px] italic text-fg-muted">Loading episodes…</p>
          } @else {
            <p-select
              inputId="session-gate-episode"
              formControlName="chapterId"
              appendTo="body"
              [options]="chapters()"
              optionLabel="label"
              optionValue="id"
              [placeholder]="'Select an episode'"
              [showClear]="true"
              styleClass="w-full"
              data-testid="session-gate-episode"
              (onChange)="onChapterChange($event.value)"
            />
          }
          <validator-errors [control]="form.get('chapterId')" [label]="'Episode'" />
        </div>

        <div class="flex flex-col gap-1">
          <label for="session-gate-scene" class="text-[12px] font-bold uppercase tracking-[0.12em]">
            Scene
          </label>
          @if (!form.get('chapterId')?.value) {
            <p class="text-[12px] italic text-fg-muted">Select an episode first.</p>
          } @else if (loadingScenes()) {
            <p class="text-[12px] italic text-fg-muted">Loading scenes…</p>
          } @else {
            <p-select
              inputId="session-gate-scene"
              formControlName="sceneId"
              appendTo="body"
              [options]="scenes()"
              optionLabel="label"
              optionValue="id"
              [placeholder]="'Select a scene'"
              [showClear]="true"
              styleClass="w-full"
              data-testid="session-gate-scene"
              (onChange)="onSceneChange($event.value)"
            />
          }
          <validator-errors [control]="form.get('sceneId')" [label]="'Scene'" />
        </div>

        <div class="flex flex-col gap-1">
          <label for="session-gate-shot-name" class="text-[12px] font-bold uppercase tracking-[0.12em]">
            Shot name
          </label>
          <input
            id="session-gate-shot-name"
            pInputText
            formControlName="shotName"
            placeholder="e.g. Master wide, Close-up, …
"
            class="w-full"
            data-testid="session-gate-shot-name"
          />
          <p class="text-[10px] italic text-fg-muted">
            Give your shot a descriptive name. A new shot will be created for this scene.
          </p>
          <validator-errors [control]="form.get('shotName')" [label]="'Shot name'" />
        </div>

        @if (selectedScene()) {
          <div class="rounded border p-3 text-[12px]" style="border-color: var(--border-color);">
            <span class="font-semibold">Scene:</span>
            SC{{ selectedScene()!.number | number: '2.0' }} — {{ selectedScene()!.name }}
          </div>
        }
      </form>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          @if (adminClosable()) {
            <p-button severity="secondary" [text]="true" label="Cancel" (onClick)="close()" />
          }
          <p-button
            [icon]="'pi pi-play'"
            [label]="'STUDIO.SESSION_GATE.SUBMIT' | translate"
            [disabled]="form.invalid || submitting()"
            [loading]="submitting()"
            data-testid="session-gate-submit"
            (onClick)="onSubmit()"
          />
        </div>
      </ng-template>
    </p-dialog>

    <p-toast position="top-right" />
  `,
})
export class SessionGateDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly sessionStore = inject(SessionStore);
  private readonly studio = inject(StudioStore);
  private readonly http = inject(HttpClient);
  private readonly environment = environment;
  private readonly projectsApi = inject(ProjectsApiService);

  readonly visible = input(false);
  readonly visibleChange = output<boolean>();

  /**
   * Cuando es true (admin/super-admin), la modal es closable y muestra un
   * botón Cancel. Los usuarios regulares deben completar el formulario.
   */
  readonly adminClosable = input(false);

  private readonly toast = inject(MessageService);

  // Local state for pickers
  protected readonly projects = signal<Project[]>([]);
  protected readonly chapters = signal<{ id: string; number: number; name: string; label: string }[]>([]);
  protected readonly scenes = signal<{ id: string; number: number; name: string; label: string }[]>([]);
  protected readonly loadingProjects = signal(false);
  protected readonly loadingChapters = signal(false);
  protected readonly loadingScenes = signal(false);
  protected readonly submitting = signal(false);
  protected readonly user = this.sessionStore.user;

  /** Derived scene object for the info panel. */
  protected readonly selectedScene = signal<{ id: string; number: number; name: string } | null>(null);

  protected readonly form: FormGroup = this.fb.group({
    projectId: [null, [Validators.required]],
    chapterId: [null, [Validators.required]],
    sceneId: [null, [Validators.required]],
    shotName: ['', [Validators.required, Validators.minLength(2)]],
  });

  /**
   * Reset pickers every time the dialog opens.
   */
  private readonly resetOnOpen = effect(() => {
    if (!this.visible()) return;
    this.form.reset({
      projectId: null,
      chapterId: null,
      sceneId: null,
      shotName: '',
    });
    this.selectedScene.set(null);
    this.scenes.set([]);
    this.chapters.set([]);
    this.loadProjects();
  });

  /** Called when the user picks a project. */
  protected onProjectChange(projectId: string | null): void {
    this.chapters.set([]);
    this.scenes.set([]);
    this.selectedScene.set(null);
    this.form.patchValue({ chapterId: null, sceneId: null }, { emitEvent: false });
    if (projectId) {
      this.loadChapters(projectId);
    }
  }

  /** Called when the user picks an episode. */
  protected onChapterChange(chapterId: string | null): void {
    const projectId: string | null = this.form.get('projectId')?.value;
    this.scenes.set([]);
    this.selectedScene.set(null);
    this.form.patchValue({ sceneId: null }, { emitEvent: false });
    if (chapterId && projectId) {
      this.loadScenes(projectId, chapterId);
    }
  }

  /** Called when the user picks a scene. */
  protected onSceneChange(sceneId: string | null): void {
    const projectId: string | null = this.form.get('projectId')?.value;
    const chapterId: string | null = this.form.get('chapterId')?.value;
    this.form.patchValue({ shotName: '' }, { emitEvent: false });
    if (!sceneId || !projectId || !chapterId) {
      this.selectedScene.set(null);
      return;
    }
    const scene = this.scenes().find((s) => s.id === sceneId);
    if (scene) {
      this.selectedScene.set({ id: scene.id, number: scene.number, name: scene.name });
    }
  }

  protected loadProjects(): void {
    this.loadingProjects.set(true);
    this.projectsApi.listProjects().subscribe((res) => {
      this.loadingProjects.set(false);
      if (!res.error && res.data) {
        this.projects.set(res.data);
      }
    });
  }

  protected loadChapters(projectId: string): void {
    this.loadingChapters.set(true);
    this.projectsApi.listChapters(projectId).subscribe((res) => {
      this.loadingChapters.set(false);
      if (!res.error && res.data) {
        this.chapters.set(
          res.data.map((c) => ({
            id: c.id,
            number: c.number,
            name: c.name,
            label: `EP${String(c.number).padStart(2, '0')} — ${c.name}`,
          })),
        );
      }
    });
  }

  protected loadScenes(projectId: string, chapterId: string): void {
    this.loadingScenes.set(true);
    this.form.patchValue({ sceneId: null }, { emitEvent: false });
    this.projectsApi.listScenes(projectId, chapterId).subscribe((res) => {
      this.loadingScenes.set(false);
      if (!res.error && res.data) {
        this.scenes.set(
          res.data.map((s) => ({
            id: s.id,
            number: s.number,
            name: s.name,
            label: `SC${String(s.number).padStart(2, '0')} — ${s.name}`,
          })),
        );
      }
    });
  }

  protected close(): void {
    this.visibleChange.emit(false);
  }

  /** Sólo admins pueden cerrar la modal con X / ESC. */
  protected onVisibleChange(v: boolean): void {
    if (this.adminClosable()) {
      this.visibleChange.emit(v);
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue() as {
      projectId: string;
      chapterId: string;
      sceneId: string;
      shotName: string;
    };

    const scene = this.selectedScene();
    if (!scene) return;

    const currentUser = this.sessionStore.user();
    const handle = currentUser?.handle || currentUser?.email || 'anonymous';

    const project = this.projects().find((p) => p.id === raw.projectId);
    const chapter = this.chapters().find((c) => c.id === raw.chapterId);

    const sceneCode = `SC${String(scene.number).padStart(2, '0')}`;

    this.submitting.set(true);

    // 1. First, load existing shots to determine the next shot number
    this.projectsApi.listShots(raw.projectId, raw.chapterId, raw.sceneId).subscribe((shotsRes) => {
      const existingShots = (shotsRes.error || !shotsRes.data) ? [] : shotsRes.data;
      const nextShotNumber = existingShots.length > 0
        ? Math.max(...existingShots.map((s) => s.number)) + 1
        : 1;

      // 2. Create the new shot
      this.projectsApi.createShot(raw.projectId, raw.chapterId, raw.sceneId, {
        number: nextShotNumber,
        name: raw.shotName.trim(),
      }).subscribe((shotRes) => {
        if (shotRes.error || !shotRes.data) {
          this.toast?.add({
            severity: 'error',
            summary: 'Error',
            detail: shotRes.msg || 'Failed to create shot',
          });
          this.submitting.set(false);
          return;
        }

        const newShot = shotRes.data;

        // 3. Init studio session with the newly created shot
        this.studio.initStudioSession({
          projectId: raw.projectId,
          chapterId: raw.chapterId,
          shotId: newShot.id,
          sceneId: raw.sceneId,
          sceneCode,
          projectName: project?.name,
          chapterName: chapter?.name,
          sceneName: scene.name,
          shotName: newShot.name,
          userHandle: handle,
          totalTakes: 5,
          backendTakes: [],
        });

        this.sessionStore.initSession({
          email: currentUser?.email ?? '',
          handle,
        });

        // 4. Load scene assignments
        this.http
          .get<{ data: any }>(
            `${this.environment.API_URL}/projects/${raw.projectId}/chapters/${raw.chapterId}/scenes/${raw.sceneId}/assignments`,
          )
          .subscribe({
            next: (res) => {
              if (res.data) this.studio.setSceneAssignments(res.data);
            },
            error: () => {
              /* assignments not critical */
            },
          });

        this.submitting.set(false);
        this.visibleChange.emit(false);
      });
    });
  }
}
