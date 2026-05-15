import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SessionStateService } from '@app/core/stores/session.state';
import { StudioStateService } from '@app/core/stores/studio.state';
import { ValidatorErrors } from '@shared/components/validation-errors/validator-errors.component';

/**
 * Entry gate: blocks the studio until the user has identified themselves
 * and declared which scene they're working on (with how many takes).
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
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
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

      <form
        [formGroup]="form"
        (ngSubmit)="onSubmit()"
        class="flex flex-col gap-4"
      >
        <div class="flex flex-col gap-1">
          <label
            for="session-gate-email"
            class="text-[12px] font-bold uppercase tracking-[0.12em]"
          >
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
            for="session-gate-scene"
            class="text-[12px] font-bold uppercase tracking-[0.12em]"
          >
            {{ 'STUDIO.SESSION_GATE.SCENE' | translate }}
          </label>
          <input
            id="session-gate-scene"
            type="text"
            pInputText
            formControlName="sceneCode"
            data-testid="session-gate-scene"
            [placeholder]="'STUDIO.SESSION_GATE.SCENE_PLACEHOLDER' | translate"
          />
          <validator-errors
            [control]="form.get('sceneCode')"
            [label]="'STUDIO.SESSION_GATE.SCENE' | translate"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label
            for="session-gate-takes"
            class="text-[12px] font-bold uppercase tracking-[0.12em]"
          >
            {{ 'STUDIO.SESSION_GATE.TAKES' | translate }}
          </label>
          <p-inputNumber
            inputId="session-gate-takes"
            formControlName="totalTakes"
            [min]="1"
            [max]="99"
            [showButtons]="true"
            buttonLayout="horizontal"
            decrementButtonClass="p-button-secondary"
            incrementButtonClass="p-button-secondary"
            data-testid="session-gate-takes"
          />
          <validator-errors
            [control]="form.get('totalTakes')"
            [label]="'STUDIO.SESSION_GATE.TAKES' | translate"
          />
          <p
            class="font-mono text-[10px]"
            style="color: var(--text-muted);"
          >
            {{ 'STUDIO.SESSION_GATE.TAKES_HINT' | translate }}
          </p>
        </div>
      </form>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            [icon]="'pi pi-play'"
            [label]="'STUDIO.SESSION_GATE.SUBMIT' | translate"
            [disabled]="form.invalid"
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
  private readonly session = inject(SessionStateService);
  private readonly studio = inject(StudioStateService);

  readonly visible = input(false);
  readonly visibleChange = output<boolean>();

  /**
   * `email` only uses `required` on purpose — see the class doc. Replace
   * with `Validators.email` once auth is wired and permissions are real.
   */
  protected readonly form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.minLength(3)]],
    handle: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40)]],
    sceneCode: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(40)]],
    totalTakes: [3, [Validators.required, Validators.min(1), Validators.max(99)]],
  });

  /**
   * Prefill the form from the persisted session every time the dialog
   * opens so a returning user doesn't have to re-type the same metadata.
   */
  private readonly resetOnOpen = effect(() => {
    if (!this.visible()) return;
    const user = this.session.user();
    const scene = this.session.scene();
    this.form.reset({
      email: user?.email ?? '',
      handle: user?.handle ?? '',
      sceneCode: scene?.code ?? '',
      totalTakes: scene?.totalTakes ?? 3,
    });
  });

  protected onVisibleChange(v: boolean): void {
    this.visibleChange.emit(v);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, handle, sceneCode, totalTakes } = this.form.getRawValue() as {
      email: string;
      handle: string;
      sceneCode: string;
      totalTakes: number;
    };
    this.session.initSession({ email, handle, sceneCode, totalTakes });
    // Mirror the handle into the global studio state so the header's
    // user chip (and anywhere else reading `studio.user()`) reflects it.
    this.studio.setUser({ handle });
    this.visibleChange.emit(false);
  }
}
