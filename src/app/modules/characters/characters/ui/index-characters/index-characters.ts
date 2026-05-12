import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { ConfirmationService, MessageService } from 'primeng/api';

import { CharactersService } from '../../services';
import {
  Character,
  CreateCharacterRequest,
  UpdateCharacterRequest,
} from '../../interfaces';
import { CharacterFormDialogComponent } from '../components/character-form-dialog/character-form-dialog.component';
import { CharacterFilesDialogComponent } from '../components/character-files-dialog/character-files-dialog.component';

/**
 * Characters — entry component for the Characters feature.
 *
 * Lists every character in a PrimeNG `p-table` and provides the standard
 * CRUD affordances (create, edit, soft-delete with confirmation). All
 * theming flows through the project's --primary-* / --secondary-* /
 * --contrast-* tokens so the module retints automatically with the
 * active palette.
 */
@Component({
  selector: 'app-index-characters',
  imports: [
    DatePipe,
    TranslatePipe,
    TableModule,
    ButtonModule,
    ConfirmDialogModule,
    ToastModule,
    TagModule,
    CharacterFormDialogComponent,
    CharacterFilesDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ConfirmationService, MessageService],
  templateUrl: './index-characters.html',
  styleUrl: './index-characters.css',
})
export class IndexCharacters implements OnInit {
  protected readonly characters = inject(CharactersService);
  private readonly confirm = inject(ConfirmationService);
  private readonly toast = inject(MessageService);

  protected readonly dialogVisible = signal(false);
  protected readonly dialogTarget = signal<Character | null>(null);
  protected readonly submitting = signal(false);
  protected readonly filesDialogVisible = signal(false);
  protected readonly filesDialogTarget = signal<Character | null>(null);

  protected readonly isEmpty = computed(
    () => !this.characters.loading() && this.characters.count() === 0,
  );

  ngOnInit(): void {
    this.characters.load().subscribe();
  }

  protected openCreate(): void {
    this.dialogTarget.set(null);
    this.dialogVisible.set(true);
  }

  protected openEdit(character: Character): void {
    this.dialogTarget.set(character);
    this.dialogVisible.set(true);
  }

  protected openFiles(character: Character): void {
    this.filesDialogTarget.set(character);
    this.filesDialogVisible.set(true);
  }

  protected onCreate(payload: CreateCharacterRequest): void {
    this.submitting.set(true);
    this.characters.create(payload).subscribe((res) => {
      this.submitting.set(false);
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({
        severity: 'success',
        summary: 'OK',
        detail: 'Character created',
      });
      this.dialogVisible.set(false);
    });
  }

  protected onUpdate(evt: { id: string; patch: UpdateCharacterRequest }): void {
    if (Object.keys(evt.patch).length === 0) {
      this.dialogVisible.set(false);
      return;
    }
    this.submitting.set(true);
    this.characters.update(evt.id, evt.patch).subscribe((res) => {
      this.submitting.set(false);
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({
        severity: 'success',
        summary: 'OK',
        detail: 'Character updated',
      });
      this.dialogVisible.set(false);
    });
  }

  protected confirmDelete(character: Character): void {
    this.confirm.confirm({
      header: 'Delete character',
      message: `Delete "${character.name}"? This is a soft delete.`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.doDelete(character.id),
    });
  }

  private doDelete(id: string): void {
    this.characters.delete(id).subscribe((res) => {
      if (res.error) {
        this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
        return;
      }
      this.toast.add({
        severity: 'success',
        summary: 'OK',
        detail: 'Character deleted',
      });
    });
  }

  protected metadataPreview(c: Character): string {
    const entries = Object.entries(c.metadata);
    if (entries.length === 0) return '—';
    return entries
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(' · ');
  }
}
