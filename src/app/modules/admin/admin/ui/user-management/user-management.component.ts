import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
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
    DatePipe,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    PasswordModule,
    SelectModule,
    ToastModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  template: `
    <section class="px-6 py-6">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-[18px] font-bold uppercase tracking-[0.12em]">User Management</h1>
          <p class="mt-1 text-[12px] text-fg-muted">Manage registered users and roles.</p>
        </div>
        <p-button label="Create User" icon="pi pi-plus" (onClick)="openCreate()" />
      </div>

      @if (loading()) {
        <p class="py-8 text-center text-[13px] italic text-fg-muted">Loading users…</p>
      } @else {
        <div class="overflow-x-auto rounded border" style="border-color: var(--border-color);">
          <table class="w-full text-[12px]">
            <thead>
              <tr class="text-left text-[10px] uppercase tracking-[0.12em] text-fg-muted">
                <th class="px-3 py-2 font-medium">ID</th>
                <th class="px-3 py-2 font-medium">Username</th>
                <th class="px-3 py-2 font-medium">Name</th>
                <th class="px-3 py-2 font-medium">Email</th>
                <th class="px-3 py-2 font-medium">Role</th>
                <th class="px-3 py-2 font-medium">Status</th>
                <th class="px-3 py-2 font-medium">Created</th>
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
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]"
                      [class.bg-purple-900/40]="u.role.level <= 1"
                      [class.text-purple-400]="u.role.level <= 1"
                      [class.bg-blue-900/40]="u.role.level === 2"
                      [class.text-blue-400]="u.role.level === 2"
                      [class.bg-ink-700]="u.role.level >= 3"
                      [class.text-fg-muted]="u.role.level >= 3"
                    >
                      {{ u.role.name }}
                    </span>
                  </td>
                  <td class="px-3 py-2">
                    <span
                      class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]"
                      [class.bg-green-900/40]="u.active"
                      [class.text-green-400]="u.active"
                      [class.bg-red-900/40]="!u.active"
                      [class.text-red-400]="!u.active"
                    >
                      {{ u.active ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td class="whitespace-nowrap px-3 py-2 font-mono text-fg-muted">
                    {{ u.created_at | date: 'dd/MM/yy' }}
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
      header="Create User"
    >
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-3">
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase tracking-[0.12em]">Username</label>
          <input pInputText formControlName="username" placeholder="username" autocomplete="off" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase tracking-[0.12em]">Password</label>
          <p-password formControlName="password" placeholder="min 6 characters" [feedback]="false" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase tracking-[0.12em]">Name</label>
          <input pInputText formControlName="name" placeholder="First name" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase tracking-[0.12em]">Surname</label>
          <input pInputText formControlName="surname" placeholder="Last name" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase tracking-[0.12em]">Email</label>
          <input pInputText formControlName="email" type="email" placeholder="user@example.com" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase tracking-[0.12em]">Display name</label>
          <input pInputText formControlName="user_name" placeholder="Optional nickname" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-[11px] font-bold uppercase tracking-[0.12em]">Role</label>
          <p-select
            formControlName="role_id"
            [options]="roles()"
            optionLabel="label"
            optionValue="value"
            placeholder="Select role"
            styleClass="w-full"
          />
        </div>
      </form>

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button severity="secondary" [text]="true" label="Cancel" (onClick)="dialogVisible.set(false)" />
          <p-button label="Create" [disabled]="form.invalid || submitting()" [loading]="submitting()" (onClick)="onSubmit()" />
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
    this.form.reset({ username: '', password: '', name: '', surname: '', email: '', user_name: '', role_id: null });
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
        catchError((err) => [{ error: true, msg: err.error?.message || err.message, data: undefined }]),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.submitting.set(false);
        if (res.error) {
          this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg, life: 4000 });
          return;
        }
        this.toast.add({ severity: 'success', summary: 'OK', detail: 'User created', life: 3000 });
        this.dialogVisible.set(false);
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
          this.toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load users', life: 3000 });
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
        catchError(() => [{ error: true, data: undefined }]),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        if (!res.error && res.data) {
          this.roles.set(res.data.map((r) => ({ label: `${r.name} (level ${r.level})`, value: r.id })));
        }
      });
  }
}
