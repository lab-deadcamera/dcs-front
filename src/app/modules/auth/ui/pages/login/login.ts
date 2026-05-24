import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environment/environment';
import { SessionStore } from '@app/core/stores/session.store';
import { LoginResponse } from '@core/interfaces/session.models';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, TranslatePipe, InputTextModule, ButtonModule, PasswordModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-md px-4 py-12">
      <h2 class="mb-2 text-center text-2xl font-bold uppercase tracking-[0.12em]">
        {{ 'STUDIO.BRAND.PRIMARY' | translate }}
      </h2>
      <p class="mb-8 text-center text-[13px] text-fg-muted">Sign in to your account</p>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-[12px] font-bold uppercase tracking-[0.12em]">Username</label>
          <input
            pInputText
            formControlName="username"
            placeholder="your username"
            autocomplete="username"
            data-testid="login-username"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-[12px] font-bold uppercase tracking-[0.12em]">Password</label>
          <p-password
            formControlName="password"
            placeholder="your password"
            [feedback]="false"
            [toggleMask]="true"
            styleClass="w-full"
            inputStyleClass="w-full"
            data-testid="login-password"
          />
        </div>

        @if (error()) {
          <p class="text-[12px] text-red-500">{{ error() }}</p>
        }

        <p-button
          type="submit"
          [label]="'Sign in'"
          [disabled]="form.invalid || loading()"
          [loading]="loading()"
          styleClass="w-full"
          data-testid="login-submit"
        />
      </form>
    </div>
  `,
})
export default class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form: FormGroup = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  protected onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    this.http
      .post<{
        data: LoginResponse;
        success: boolean;
        message: string;
      }>(`${environment.API_URL}/auth/login`, this.form.getRawValue())
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (!res.success || !res.data) {
            this.error.set(res.message || 'Login failed');
            return;
          }
          this.session.login(res.data);
          if (res.data.user.role.level <= 1) {
            this.router.navigateByUrl('/');
          } else {
            this.router.navigateByUrl('/studio');
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err.error?.error || 'Login failed');
        },
      });
  }
}
