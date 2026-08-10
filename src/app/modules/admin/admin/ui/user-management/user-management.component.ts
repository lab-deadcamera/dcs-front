import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { environment } from '@environment/environment';
import { map, catchError } from 'rxjs';

interface AdminUser {
  id: number;
  username: string;
  name: string;
  surname: string;
  user_name: string;
  email: string;
  role_id: number;
  role: { id: number; name: string; level: number };
  active: boolean;
  created_at: string;
}

interface AdminRole {
  id: number;
  name: string;
  level: number;
}

@Component({
  selector: 'app-user-management',
  imports: [
    TranslatePipe,
    DatePipe,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    PasswordModule,
    SelectModule,
    ToastModule,
    TooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  template: `
    <section class="px-6 py-6">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-[18px] font-bold uppercase tracking-[0.12em]">{{ 'ADMIN.USERS.TITLE' | translate }}</h1>
          <p class="mt-1 text-[12px] text-fg-muted">{{ 'ADMIN.USERS.SUBTITLE' | translate }}</p>
        </div>
        <p-button [label]="'ADMIN.USERS.CREATE_USER' | translate" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      @if (loading()) {
        <p class="py-8 text-center text-[13px] italic text-fg-muted">{{ 'ADMIN.USERS.LOADING' | translate }}</p>
      } @else {
        <div class="overflow-x-auto rounded border" style="border-color: var(--border-color);">
          <table class="w-full text-[12px]">
            <thead>
              <tr class="text-left text-[10px] uppercase tracking-[0.12em] text-fg-muted">
                <th class="px-3 py-2 font-medium">{{ 'ADMIN.USERS.COL_ID' | translate }}</th>
                <th class="px-3 py-2 font-medium">{{ 'ADMIN.USERS.COL_USERNAME' | translate }}</th>
                <th class="px-3 py-2 font-medium">{{ 'ADMIN.USERS.COL_NAME' | translate }}</th>
                <th class="px-3 py-2 font-medium">{{ 'ADMIN.USERS.COL_EMAIL' | translate }}</th>
                <th class="px-3 py-2 font-medium">{{ 'ADMIN.USERS.COL_ROLE' | translate }}</th>
                <th class="px-3 py-2 font-medium">{{ 'ADMIN.USERS.COL_STATUS' | translate }}</th>
                <th class="px-3 py-2 font-medium">{{ 'ADMIN.USERS.COL_CREATED' | translate }}</th>
                <th class="px-3 py-2 font-medium">{{ 'ADMIN.USERS.COL_ACTIONS' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (u of users(); track u.id) {
                <tr class="border-t" style="border-color: var(--border-color);">
                  <td class="px-3 py-2 font-mono">{{ u.id }}</td>
                  <td class="px-3 py-2 font-mono">{{ u.username }}</td>
                  <td class="px-3 py-2">{{ u.name }} {{ u.surname }}</td>
                  <td class="px-3 py-2 font-mono">{{ u.email }}</td>
                  <td class="px-3 py-2">
                    <span
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                      [class.bg-purple-900]="u.role.level <= 1"
                      [class.text-purple-400]="u.role.level <= 1"
                      [class.bg-blue-900]="u.role.level === 2"
                      [class.text-blue-400]="u.role.level === 2"
                      [class.bg-ink-700]="u.role.level >= 3"
                      [class.text-fg-muted]="u.role.level >= 3"
                    >
                      {{ u.role.name }}
                    </span>
                  </td>
                  <td class="px-3 py-2">
                    <span
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                      [class.bg-green-900]="u.active"
                      [class.text-green-400]="u.active"
                      [class.bg-red-900]="!u.active"
                      [class.text-red-400]="!u.active"
                    >
                      {{ u.active ? ('ADMIN.USERS.ACTIVE' | translate) : ('ADMIN.USERS.INACTIVE' | translate) }}
                    </span>
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 font-mono text-fg-muted">
                    {{ u.created_at | date: 'dd/MM/yy' }}
                  </td>
                  <td class="px-3 py-2">
                    @if (u.role.level > 0) {
                      <p-button
                        [icon]="u.active ? 'pi pi-ban' : 'pi pi-check-circle'"
                        [severity]="u.active ? 'danger' : 'success'"
                        [text]="true"
                        [rounded]="true"
                        [pTooltip]="u.active ? ('ADMIN.USERS.DEACTIVATE' | translate) : ('ADMIN.USERS.ACTIVATE' | translate)"
                        (onClick)="toggleActive(u)"
                      />
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>

    <!-- Create User dialog -->
    <p-dialog
      [visible]="dialogVisible()"
      (visibleChange)="dialogVisible.set($event)"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [style]="{ width: '28rem' }"
      [header]="'ADMIN.USERS.DIALOG_TITLE' | translate"
    >
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase tracking-[0.12em]">{{ 'ADMIN.USERS.USERNAME' | translate }}</label>
          <input pInputText formControlName="username" [placeholder]="'ADMIN.USERS.USERNAME_PLACEHOLDER' | translate" autocomplete="off" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase tracking-[0.12em]">{{ 'ADMIN.USERS.PASSWORD' | translate }}</label>
          <p-password
            formControlName="password"
            [placeholder]="'ADMIN.USERS.PASSWORD_PLACEHOLDER' | translate"
            [feedback]="false"
            [toggleMask]="true"
            styleClass="w-full"
            inputStyleClass="w-full"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase tracking-[0.12em]">{{ 'ADMIN.USERS.NAME' | translate }}</label>
          <input pInputText formControlName="name" [placeholder]="'ADMIN.USERS.NAME_PLACEHOLDER' | translate" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase tracking-[0.12em]">{{ 'ADMIN.USERS.SURNAME' | translate }}</label>
          <input pInputText formControlName="surname" [placeholder]="'ADMIN.USERS.SURNAME_PLACEHOLDER' | translate" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase tracking-[0.12em]">{{ 'ADMIN.USERS.EMAIL' | translate }}</label>
          <input pInputText formControlName="email" type="email" [placeholder]="'ADMIN.USERS.EMAIL_PLACEHOLDER' | translate" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase tracking-[0.12em]">{{ 'ADMIN.USERS.DISPLAY_NAME' | translate }}</label>
          <input pInputText formControlName="user_name" [placeholder]="'ADMIN.USERS.DISPLAY_NAME_PLACEHOLDER' | translate" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase tracking-[0.12em]">{{ 'ADMIN.USERS.ROLE' | translate }}</label>
          <p-select
            formControlName="role_id"
            [options]="roles()"
            optionLabel="label"
            optionValue="value"
            [placeholder]="'ADMIN.USERS.SELECT_ROLE' | translate"
            styleClass="w-full"
            appendTo="body"
          />
        </div>
      </form>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            severity="secondary"
            [text]="true"
            [label]="'COMMON.CANCEL' | translate"
            (onClick)="dialogVisible.set(false)"
          />
          <p-button
            [label]="'COMMON.CREATE' | translate"
            [disabled]="form.invalid || submitting()"
            [loading]="submitting()"
            (onClick)="onSubmit()"
          />
        </div>
      </ng-template>
    </p-dialog>

    <p-toast position="top-right" />
  `,
})
export class UserManagementComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(MessageService);
  private readonly i18n = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly users = signal<AdminUser[]>([]);
  protected readonly roles = signal<{ label: string; value: number }[]>([]);
  protected readonly loading = signal(false);
  protected readonly dialogVisible = signal(false);
  protected readonly submitting = signal(false);

  protected readonly form: FormGroup = this.fb.group({
    username: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    name: ['', Validators.required],
    surname: ['', Validators.required],
    email: [''],
    user_name: [''],
    role_id: [null, Validators.required],
  });

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
  }

  protected openCreate(): void {
    this.form.reset({
      username: '',
      password: '',
      name: '',
      surname: '',
      email: '',
      user_name: '',
      role_id: null,
    });
    this.dialogVisible.set(true);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.http
      .post<{ success: boolean; message: string; data?: AdminUser }>(
        `${environment.API_URL}/admin/users`,
        this.form.value,
      )
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message, data: r.data })),
        catchError((err) => [
          { error: true, msg: err.error?.message || err.message, data: undefined },
        ]),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.submitting.set(false);
        if (res.error) {
          this.toast.add({
            severity: 'error',
            summary: this.i18n.instant('COMMON.ERROR'),
            detail: res.msg,
            life: 4000,
          });
          return;
        }
        this.toast.add({
          severity: 'success',
          summary: this.i18n.instant('COMMON.OK'),
          detail: this.i18n.instant('ADMIN.USERS.TOAST_CREATED'),
          life: 3000,
        });
        this.dialogVisible.set(false);
        this.loadUsers();
      });
  }

  protected toggleActive(u: AdminUser): void {
    const newState = !u.active;
    this.http
      .patch<{ success: boolean; message: string; data?: { active: boolean } }>(
        `${environment.API_URL}/admin/users/${u.id}/active`,
        { active: newState },
      )
      .pipe(
        map((r) => ({ error: !r.success, msg: r.message })),
        catchError((err) => [{ error: true, msg: err.error?.message || err.message }]),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (res.error) {
          this.toast.add({
            severity: 'error',
            summary: this.i18n.instant('COMMON.ERROR'),
            detail: res.msg,
            life: 4000,
          });
          return;
        }
        this.toast.add({
          severity: 'success',
          summary: this.i18n.instant('COMMON.OK'),
          detail: this.i18n.instant(
            newState ? 'ADMIN.USERS.TOAST_ACTIVATED' : 'ADMIN.USERS.TOAST_DEACTIVATED',
            { name: u.username },
          ),
          life: 3000,
        });
        this.loadUsers();
      });
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.http
      .get<{ success: boolean; data?: AdminUser[] }>(`${environment.API_URL}/admin/users`)
      .pipe(
        map((r) => ({ error: !r.success, data: r.data })),
        catchError(() => [{ error: true, data: undefined }]),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.loading.set(false);
        if (res.error || !res.data) {
          this.toast.add({
            severity: 'error',
            summary: this.i18n.instant('COMMON.ERROR'),
            detail: this.i18n.instant('ADMIN.USERS.LOAD_USERS_FAILED'),
            life: 3000,
          });
          return;
        }
        this.users.set(res.data);
      });
  }

  private loadRoles(): void {
    this.http
      .get<{ success: boolean; data?: AdminRole[] }>(`${environment.API_URL}/admin/roles`)
      .pipe(
        map((r) => ({ error: !r.success, data: r.data })),
        catchError((err) => [{ error: true, data: undefined, msg: err.message }]),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res: any) => {
        if (res.error) {
          this.toast.add({
            severity: 'error',
            summary: this.i18n.instant('COMMON.ERROR'),
            detail: this.i18n.instant('ADMIN.USERS.LOAD_ROLES_FAILED', {
              msg: res.msg || 'unknown',
            }),
            life: 5000,
          });
          return;
        }
        if (!res.data || res.data.length === 0) {
          this.toast.add({
            severity: 'warn',
            summary: this.i18n.instant('ADMIN.USERS.NO_ROLES'),
            detail: this.i18n.instant('ADMIN.USERS.NO_ROLES'),
            life: 5000,
          });
          return;
        }
        // SUPER_ADMIN (level 0) no se muestra — es único, creado desde .env
        this.roles.set(
          res.data
            .filter((r: AdminRole) => r.level > 0)
            .map((r: AdminRole) => ({
              label: this.i18n.instant('ADMIN.USERS.ROLE_LEVEL', {
                name: r.name,
                level: r.level,
              }),
              value: r.id,
            })),
        );
      });
  }
}
