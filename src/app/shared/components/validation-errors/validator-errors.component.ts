import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

/**
 * Standardized validation-error message for any reactive form control.
 *
 *   <validator-errors
 *     [control]="form.get('email')"
 *     [label]="'AUTH.LOGIN.EMAIL' | translate" />
 *
 * Renders nothing while the control is pristine / untouched / valid.
 * Resolves the first error and produces a human-readable message keyed by
 * the project's translation bundle (`VALIDATION.*`) so locales stay in sync.
 */
@Component({
  selector: 'validator-errors',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (message(); as m) {
      <p
        class="mt-1 text-[11px] text-primary-500"
        role="alert"
        aria-live="polite"
      >
        {{ m }}
      </p>
    }
  `,
})
export class ValidatorErrors {
  private readonly i18n = inject(TranslateService);

  readonly control = input<AbstractControl | null>(null);
  readonly label = input<string>('');

  protected readonly message = computed<string | null>(() => {
    const c = this.control();
    if (!c || !c.errors || (!c.dirty && !c.touched)) return null;

    const errors = c.errors;
    const label = this.label() || 'Field';

    if (errors['required']) {
      return this.i18n.instant('VALIDATION.REQUIRED', { label });
    }
    if (errors['email']) {
      return this.i18n.instant('VALIDATION.EMAIL', { label });
    }
    if (errors['minlength']) {
      return this.i18n.instant('VALIDATION.MIN_LENGTH', {
        label,
        n: errors['minlength'].requiredLength,
      });
    }
    if (errors['maxlength']) {
      return this.i18n.instant('VALIDATION.MAX_LENGTH', {
        label,
        n: errors['maxlength'].requiredLength,
      });
    }
    if (errors['pattern']) {
      return this.i18n.instant('VALIDATION.PATTERN', { label });
    }
    if (errors['min']) {
      return this.i18n.instant('VALIDATION.MIN', {
        label,
        n: errors['min'].min,
      });
    }
    if (errors['max']) {
      return this.i18n.instant('VALIDATION.MAX', {
        label,
        n: errors['max'].max,
      });
    }

    // Fallback for custom / unknown error keys.
    return this.i18n.instant('VALIDATION.INVALID', { label });
  });
}
