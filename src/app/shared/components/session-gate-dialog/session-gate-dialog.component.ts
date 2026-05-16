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
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { SessionStore } from '@app/core/stores/session.store';
import { StudioStore } from '@app/core/stores/studio.store';
import { ProjectsApiService } from '@modules/projects/projects/services';
import { ValidatorErrors } from '@shared/components/validation-errors/validator-errors.component';
import { Project, Scene, Take } from '@modules/projects/projects/interfaces';

/**
 * Entry gate: blocks the studio until the user has identified themselves
 * and selected a project + scene with pre-defined takes.
 *
 * The email field is intentionally lax — `required` only, no format check —
 * because authentication / permissions are not wired yet. Once the auth
 * layer lands, swap the validator for `Validators.email` and gate the
 * submit on a real lookup.
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
    ValidatorErrors,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="onVisibleChange($event)"
      [modal]="true"
      [closable]="false"
      [closeOnEscape]="false"
      [draggable]="false"
      [dismissableMask]="false"
      [style]="{ width: '32rem' }"
      [header]="'STUDIO.SESSION_GATE.TITLE' | translate"
    >
      <p class="mb-4 text-[12px] italic text-fg-muted">
        {{ 'STUDIO.SESSION_GATE.HINT' | translate }}
      </p>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label for="session-gate-email" class="text-[12px] font-bold uppercase tracking-[0.12em]">
            {{ 'STUDIO.SESSION_GATE.EMAIL' | translate }}
          </label>
          <input
            id="session-gate-email"
            type="text"
            pInputText
            formControlName="email"
            autocomplete="email"
            data-testid="session-gate-email"
            [placeholder]="'STUDIO.SESSION_GATE.EMAIL_PLACEHOLDER' | translate"
          />
          <validator-errors
            [control]="form.get('email')"
            [label]="'STUDIO.SESSION_GATE.EMAIL' | translate"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label
            for="session-gate-handle"
            class="text-[12px] font-bold uppercase tracking-[0.12em]"
          >
            {{ 'STUDIO.SESSION_GATE.HANDLE' | translate }}
          </label>
          <input
            id="session-gate-handle"
            type="text"
            pInputText
            formControlName="handle"
            autocomplete="username"
            data-testid="session-gate-handle"
            [placeholder]="'STUDIO.SESSION_GATE.HANDLE_PLACEHOLDER' | translate"
          />
          <validator-errors
            [control]="form.get('handle')"
            [label]="'STUDIO.SESSION_GATE.HANDLE' | translate"
          />
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
          <label for="session-gate-scene" class="text-[12px] font-bold uppercase tracking-[0.12em]">
            Scene
          </label>
          @if (!form.get('projectId')?.value) {
            <p class="text-[12px] italic text-fg-muted">Select a project first.</p>
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

        @if (selectedScene()) {
          <div class="rounded border p-3 text-[12px]" style="border-color: var(--border-color);">
            <span class="font-semibold">Scene:</span>
            SC{{ selectedScene()!.number | number: '2.0' }} — {{ selectedScene()!.name }}
            <br />
            <span class="font-semibold">Takes:</span>
            {{ takes().length }} take{{ takes().length !== 1 ? 's' : '' }}
          </div>
        }
      </form>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
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
  `,
})
export class SessionGateDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly sessionStore = inject(SessionStore);
  private readonly studio = inject(StudioStore);
  private readonly projectsApi = inject(ProjectsApiService);

  readonly visible = input(false);
  readonly visibleChange = output<boolean>();

  // Local state for pickers
  protected readonly projects = signal<Project[]>([]);
  protected readonly scenes = signal<{ id: string; number: number; name: string; label: string }[]>(
    [],
  );
  protected readonly takes = signal<Take[]>([]);
  protected readonly loadingProjects = signal(false);
  protected readonly loadingScenes = signal(false);
  protected readonly submitting = signal(false);

  /** Derived scene object for the info panel. */
  protected readonly selectedScene = signal<{ id: string; number: number; name: string } | null>(
    null,
  );

  protected readonly form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.minLength(3)]],
    handle: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40)]],
    projectId: [null, [Validators.required]],
    sceneId: [null, [Validators.required]],
  });

  /**
   * Prefill the form from the persisted session every time the dialog
   * opens so a returning user doesn't have to re-type the same metadata.
   */
  private readonly resetOnOpen = effect(() => {
    if (!this.visible()) return;
    const user = this.sessionStore.user();
    this.form.reset({
      email: user?.email ?? '',
      handle: user?.handle ?? '',
      projectId: null,
      sceneId: null,
    });
    this.selectedScene.set(null);
    this.takes.set([]);
    this.scenes.set([]);
    this.loadProjects();
  });

  /** Called when the user picks a project. */
  protected onProjectChange(projectId: string | null): void {
    this.scenes.set([]);
    this.takes.set([]);
    this.selectedScene.set(null);
    this.form.patchValue({ sceneId: null }, { emitEvent: false });
    if (projectId) {
      this.loadScenes(projectId);
    }
  }

  /** Called when the user picks a scene. */
  protected onSceneChange(sceneId: string | null): void {
    const projectId: string | null = this.form.get('projectId')?.value;
    if (!sceneId || !projectId) {
      this.selectedScene.set(null);
      this.takes.set([]);
      return;
    }
    const scene = this.scenes().find((s) => s.id === sceneId);
    if (scene) {
      this.selectedScene.set({ id: scene.id, number: scene.number, name: scene.name });
    }
    this.loadTakes(projectId, sceneId);
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

  protected loadScenes(projectId: string): void {
    this.loadingScenes.set(true);
    this.form.patchValue({ sceneId: null }, { emitEvent: false });
    this.projectsApi.listScenes(projectId).subscribe((res) => {
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

  protected loadTakes(projectId: string, sceneId: string): void {
    this.projectsApi.listTakes(projectId, sceneId).subscribe((res) => {
      if (!res.error && res.data) {
        this.takes.set(res.data);
      } else {
        this.takes.set([]);
      }
    });
  }

  protected onVisibleChange(v: boolean): void {
    this.visibleChange.emit(v);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue() as {
      email: string;
      handle: string;
      projectId: string;
      sceneId: string;
    };

    const scene = this.selectedScene();
    if (!scene) return;

    const sceneCode = `SC${String(scene.number).padStart(2, '0')}`;
    const totalTakes = Math.max(1, this.takes().length);

    this.submitting.set(true);
    this.sessionStore.initSession({
      email: raw.email,
      handle: raw.handle,
    });
    this.studio.initStudioSession({
      projectId: raw.projectId,
      sceneId: raw.sceneId,
      sceneCode,
      userHandle: raw.handle,
      totalTakes,
      backendTakes: this.takes(),
    });
    this.submitting.set(false);
    this.visibleChange.emit(false);
  }
}
