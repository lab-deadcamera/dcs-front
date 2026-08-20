import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { SkillService, Skill } from '@app/services/skill.service';
import { marked } from 'marked';

@Component({
  selector: 'app-skill-form-dialog',
  imports: [DialogModule, ButtonModule, InputTextModule, TextareaModule, FormsModule, ToastModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  styles: [
    `
      .skill-md-preview :is(h1, h2, h3, h4, h5, h6) {
        margin: 0.6em 0 0.3em;
        font-weight: 700;
        line-height: 1.25;
      }
      .skill-md-preview h1 {
        font-size: 1.35em;
      }
      .skill-md-preview h2 {
        font-size: 1.2em;
      }
      .skill-md-preview h3 {
        font-size: 1.1em;
      }
      .skill-md-preview p {
        margin: 0.5em 0;
      }
      .skill-md-preview ul,
      .skill-md-preview ol {
        margin: 0.5em 0;
        padding-left: 1.4em;
      }
      .skill-md-preview li {
        margin: 0.15em 0;
      }
      .skill-md-preview code {
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.92em;
        padding: 0.1em 0.3em;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.08);
      }
      .skill-md-preview pre {
        margin: 0.6em 0;
        padding: 0.6em;
        overflow-x: auto;
        border-radius: 4px;
        background: rgba(0, 0, 0, 0.35);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      .skill-md-preview pre code {
        padding: 0;
        background: none;
      }
      .skill-md-preview blockquote {
        margin: 0.6em 0;
        padding-left: 0.8em;
        border-left: 3px solid rgba(255, 255, 255, 0.25);
        color: rgba(255, 255, 255, 0.65);
      }
      .skill-md-preview a {
        text-decoration: underline;
      }
      .skill-md-preview hr {
        margin: 0.8em 0;
        border: 0;
        border-top: 1px solid rgba(255, 255, 255, 0.12);
      }
      .skill-md-preview table {
        border-collapse: collapse;
        margin: 0.6em 0;
        width: 100%;
      }
      .skill-md-preview th,
      .skill-md-preview td {
        border: 1px solid rgba(255, 255, 255, 0.14);
        padding: 0.3em 0.5em;
        text-align: left;
      }
    `,
  ],
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="visibleChange.emit($event)"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [style]="{ width: '45rem' }"
      [header]="skill() ? 'Edit Skill' : 'Create Skill'"
    >
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-[12px] font-bold uppercase tracking-[0.12em]">Name *</label>
          <input pInputText [(ngModel)]="name" placeholder="My Custom Skill" class="w-full" />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-[12px] font-bold uppercase tracking-[0.12em]">Description</label>
          <input
            pInputText
            [(ngModel)]="description"
            placeholder="Brief description of when to use this skill"
            class="w-full"
          />
        </div>

        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between">
            <label class="text-[12px] font-bold uppercase tracking-[0.12em]">System Prompt *</label>
            <div class="flex gap-1" role="group" [attr.aria-label]="'System prompt view'">
              <button
                type="button"
                (click)="togglePreview(false)"
                [attr.aria-pressed]="!previewMode()"
                [class]="previewTabClass(!previewMode())"
              >
                Edit
              </button>
              <button
                type="button"
                (click)="togglePreview(true)"
                [attr.aria-pressed]="previewMode()"
                [class]="previewTabClass(previewMode())"
              >
                Preview
              </button>
            </div>
          </div>

          @if (previewMode()) {
            <div
              class="skill-md-preview max-h-[16rem] w-full overflow-y-auto rounded-sm border border-ink-600 bg-ink-900 p-3 text-[12px] text-fg-strong"
              [innerHTML]="previewHtml()"
            ></div>
          } @else {
            <textarea
              pInputTextarea
              [(ngModel)]="systemPrompt"
              placeholder="Eres un director de fotografía..."
              [rows]="10"
              class="w-full font-mono text-[12px]"
            ></textarea>
          }
        </div>
      </div>

      <ng-template pTemplate="footer">
        <div class="flex w-full justify-between gap-2 mt-4">
          <p-button
            icon="pi pi-upload"
            label="Import"
            severity="secondary"
            [outlined]="true"
            [loading]="readingFile()"
            (onClick)="fileInput.click()"
          />
          <input
            #fileInput
            type="file"
            accept=".md,.skill,.txt"
            class="hidden"
            (change)="onFilePick($event)"
          />

          <div class="flex justify-end gap-2">
            <p-button
              severity="secondary"
              [text]="true"
              label="Cancel"
              (onClick)="visibleChange.emit(false)"
            />
            <p-button
              label="Save"
              [disabled]="!canSave() || submitting()"
              [loading]="submitting()"
              (onClick)="save()"
            />
          </div>
        </div>
      </ng-template>
    </p-dialog>

    <p-toast />
  `,
})
export class SkillFormDialogComponent {
  private readonly skillService = inject(SkillService);
  private readonly toast = inject(MessageService);

  readonly visible = input(false);
  readonly skill = input<Skill | null>(null);
  readonly visibleChange = output<boolean>();
  readonly saved = output<void>();

  protected name = '';
  protected description = '';
  protected systemPrompt = '';
  protected submitting = signal(false);
  protected readingFile = signal(false);
  protected previewMode = signal(false);
  protected previewHtml = signal('');

  /** Populate form fields when editing an existing skill. */
  private readonly populateOnEdit = effect(() => {
    const s = this.skill();
    if (s && this.visible()) {
      this.name = s.name;
      this.description = s.description;
      this.systemPrompt = s.system_prompt;
    }
    if (!s && this.visible()) {
      this.name = '';
      this.description = '';
      this.systemPrompt = '';
    }
  });

  protected onFilePick(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['md', 'skill', 'txt'].includes(ext)) {
      this.toast.add({
        severity: 'error',
        summary: 'Invalid file',
        detail: 'Only .md, .skill or .txt files are allowed.',
      });
      input.value = '';
      return;
    }

    this.readingFile.set(true);
    const reader = new FileReader();
    reader.onload = () => {
      this.importFileContent(String(reader.result ?? ''), file.name);
      this.readingFile.set(false);
      this.toast.add({
        severity: 'success',
        summary: 'Imported',
        detail: `${file.name} imported — review the fields below.`,
      });
    };
    reader.onerror = () => {
      this.readingFile.set(false);
      this.toast.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Could not read the selected file.',
      });
    };
    reader.readAsText(file);
    input.value = '';
  }

  private importFileContent(content: string, fileName: string): void {
    const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    let name = '';
    let description = '';
    let body = content.trim();

    if (frontmatter) {
      const meta = frontmatter[1];
      body = frontmatter[2].trim();
      const nameMatch = meta.match(/^name\s*:\s*(.+)$/m);
      const descMatch = meta.match(/^description\s*:\s*(.+)$/m);
      if (nameMatch) name = this._stripQuotes(nameMatch[1]);
      if (descMatch) description = this._stripQuotes(descMatch[1]);
    }

    if (!name) {
      name = fileName.replace(/\.(md|skill|txt)$/i, '');
    }

    if (!this.name.trim()) this.name = name;
    if (!this.description.trim() && description) this.description = description;
    this.systemPrompt = body || content.trim();
    if (this.previewMode()) {
      this.previewHtml.set(this._renderMarkdown(this.systemPrompt));
    }
  }

  protected togglePreview(preview: boolean): void {
    this.previewMode.set(preview);
    if (preview) {
      this.previewHtml.set(this._renderMarkdown(this.systemPrompt));
    }
  }

  protected previewTabClass(active: boolean): string {
    return (
      'rounded-sm border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] transition-colors ' +
      (active
        ? 'border-ink-600 bg-ink-600 text-fg-strong'
        : 'border-ink-600 text-fg-muted hover:text-fg-strong')
    );
  }

  private _renderMarkdown(md: string): string {
    if (!md.trim()) {
      return '<p class="text-fg-muted italic">No content to preview.</p>';
    }
    return marked.parse(md, { gfm: true, breaks: true }) as string;
  }

  private _stripQuotes(value: string): string {
    return value.trim().replace(/^["']|["']$/g, '');
  }

  protected canSave(): boolean {
    return this.name.trim().length > 0 && this.systemPrompt.trim().length > 0;
  }

  protected save(): void {
    if (!this.canSave()) return;

    this.submitting.set(true);
    const existing = this.skill();

    if (existing) {
      this.skillService
        .update(existing.id, {
          name: this.name.trim() || undefined,
          description: this.description.trim() || undefined,
          system_prompt: this.systemPrompt.trim() || undefined,
        })
        .subscribe((res) => {
          this.submitting.set(false);
          if (res.error) {
            this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
            return;
          }
          this.saved.emit();
        });
    } else {
      this.skillService
        .create({
          name: this.name.trim(),
          description: this.description.trim(),
          system_prompt: this.systemPrompt.trim(),
        })
        .subscribe((res) => {
          this.submitting.set(false);
          if (res.error) {
            this.toast.add({ severity: 'error', summary: 'Error', detail: res.msg });
            return;
          }
          this.saved.emit();
        });
    }
  }
}
