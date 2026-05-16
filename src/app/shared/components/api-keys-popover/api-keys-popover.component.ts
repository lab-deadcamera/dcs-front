import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Popover } from 'primeng/popover';
import { GlobalStore } from '@app/core/stores/global.store';
import {
  DEFAULT_ENDPOINT_ID,
  maskKey,
} from '@core/interfaces/api-keys.interface';

type DraftField = 'name' | 'value' | 'endpoint' | 'ak' | 'sk';

/**
 * Header dropdown for managing the BytePlus / Volcengine API key vault.
 *
 * Trigger: red/green dot + "ADD API KEY →" label.
 * Content: list of saved keys (radio activate, rename inline, delete) +
 * a form to add a new key, with optional AK/SK for the Assets API.
 *
 * All state lives in ApiKeysStateService (persisted to IndexedDB).
 */
@Component({
  selector: 'app-api-keys-popover',
  imports: [Popover, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './api-keys-popover.html',
})
export class ApiKeysPopoverComponent {
  protected readonly keys = inject(GlobalStore);

  @ViewChild('popover') protected readonly popover!: Popover;

  protected readonly nameDraft = signal('');
  protected readonly valueDraft = signal('');
  protected readonly endpointDraft = signal<string>(DEFAULT_ENDPOINT_ID);
  protected readonly akDraft = signal('');
  protected readonly skDraft = signal('');
  protected readonly errorKey = signal<string | null>(null);

  protected readonly mask = maskKey;

  protected endpointShort(id: string): string {
    return id === 'byteplus_ap'
      ? 'BytePlus'
      : id === 'volcengine_cn'
        ? 'Volcengine CN'
        : id;
  }

  protected onDraft(event: Event, field: DraftField): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    const value = target.value;
    switch (field) {
      case 'name':
        this.nameDraft.set(value);
        break;
      case 'value':
        this.valueDraft.set(value);
        break;
      case 'endpoint':
        this.endpointDraft.set(value);
        break;
      case 'ak':
        this.akDraft.set(value);
        break;
      case 'sk':
        this.skDraft.set(value);
        break;
    }
    this.errorKey.set(null);
  }

  protected onAdd(event: Event): void {
    event.preventDefault();
    const value = this.valueDraft().trim();
    if (!value) return;

    const ak = this.akDraft().trim();
    const sk = this.skDraft().trim();
    if ((ak && !sk) || (sk && !ak)) {
      this.errorKey.set('STUDIO.API.AK_SK_MISMATCH');
      return;
    }

    this.keys.add({
      name: this.nameDraft().trim() || undefined,
      value,
      endpoint: this.endpointDraft(),
      ak: ak || undefined,
      sk: sk || undefined,
    });

    this.resetForm();
  }

  protected onActivate(id: string): void {
    this.keys.activate(id);
  }

  protected onRename(id: string, event: FocusEvent): void {
    const target = event.target as HTMLInputElement;
    this.keys.rename(id, target.value);
  }

  protected onRenameEnter(event: Event): void {
    event.preventDefault();
    (event.target as HTMLInputElement).blur();
  }

  protected onDelete(id: string): void {
    if (typeof confirm === 'function' && !confirm('Delete this API key?')) {
      return;
    }
    this.keys.remove(id);
  }

  private resetForm(): void {
    this.nameDraft.set('');
    this.valueDraft.set('');
    this.endpointDraft.set(DEFAULT_ENDPOINT_ID);
    this.akDraft.set('');
    this.skDraft.set('');
    this.errorKey.set(null);
  }
}
