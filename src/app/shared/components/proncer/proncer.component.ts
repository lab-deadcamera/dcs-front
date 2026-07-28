import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SectionHeaderComponent } from '@shared/components/section-header/section-header.component';
import { StudioStore } from '@app/core/stores/studio.store';
import { SessionStore } from '@app/core/stores/session.store';
import { ShotBuilderService, ShotBuilderResult } from '@app/services/shot-builder.service';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
};

@Component({
  selector: 'app-proncer',
  imports: [CommonModule, FormsModule, ButtonModule, SectionHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="border-t border-ink-600 px-6 py-6">
      <ui-section-header
        number="02"
        labelKey="STUDIO.PRONCER.TITLE"
        hintKey="STUDIO.PRONCER.HINT"
        [collapsible]="true"
        [expanded]="expanded()"
        (toggle)="toggleExpanded()"
      />

      @if (expanded()) {
        <div class="mt-4 flex flex-col gap-3">
          <!-- Current prompt input -->
          <label class="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
            Current Prompt
          </label>
          <textarea
            rows="7"
            class="w-full rounded-lg border border-ink-700 bg-ink-900 p-2 text-[13px] text-fg"
            [ngModel]="currentPrompt()"
            (ngModelChange)="onPromptChange($event)"
            placeholder="Paste or edit the prompt to refine..."
            [disabled]="loading()"
          ></textarea>

          <!-- User instructions -->
          <label class="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
            Instructions for Claude
          </label>
          <textarea
            rows="2"
            class="w-full rounded-lg border border-ink-700 bg-ink-900 p-2 text-[13px] text-fg"
            [(ngModel)]="userInstructions"
            placeholder="e.g. Make it more cinematic, add camera angles..."
            [disabled]="loading()"
          ></textarea>

          <!-- Action buttons -->
          <div class="flex items-center justify-between">
            <p-button
              label="Optimize"
              icon="pi pi-arrow-right"
              severity="primary"
              size="small"
              (onClick)="optimize()"
              [disabled]="!canOptimize()"
              [loading]="loading()"
            />
            <p-button
              label="Apply"
              icon="pi pi-check"
              severity="success"
              size="small"
              [text]="true"
              (onClick)="applyOptimized()"
              [disabled]="!optimizedPrompt()"
            />
          </div>

          <!-- Chat messages -->
          @if (chatMessages().length > 0) {
            <div class="mt-2 flex flex-col gap-2">
              @for (msg of chatMessages(); track msg.id) {
                <div
                  class="rounded-lg px-3 py-2 text-[12px]"
                  [class.bg-ink-800]="msg.role === 'assistant'"
                  [class.bg-ink-700]="msg.role === 'user'"
                >
                  <span
                    class="text-[10px] font-semibold uppercase tracking-wide"
                    [class.text-primary-400]="msg.role === 'assistant'"
                    [class.text-fg-muted]="msg.role === 'user'"
                  >
                    {{ msg.role === 'assistant' ? 'Claude' : 'You' }}
                  </span>
                  <pre class="mt-0.5 whitespace-pre-wrap text-fg">{{ msg.content }}</pre>
                </div>
              }
            </div>
          }

          <!-- Optimized prompt preview -->
          @if (optimizedPrompt()) {
            <div class="mt-2 rounded-lg border border-primary-500/30 bg-primary-900/10 p-3">
              <div class="mb-1 flex items-center justify-between">
                <span class="text-[11px] font-semibold uppercase tracking-wide text-primary-400">
                  Optimized Prompt
                </span>
              </div>
              <pre class="whitespace-pre-wrap text-[12px] leading-relaxed text-fg">{{
                optimizedPrompt()
              }}</pre>
            </div>
          }

          <!-- Suggestions -->
          @if (suggestions().length > 0) {
            <div class="mt-1">
              <span class="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">
                Suggestions
              </span>
              <ul class="mt-1 list-inside list-disc text-[11px] text-fg-muted">
                @for (s of suggestions(); track s) {
                  <li>{{ s }}</li>
                }
              </ul>
            </div>
          }

          @if (error()) {
            <div class="rounded-lg bg-red-900/30 px-3 py-2 text-[12px] text-red-400">
              {{ error() }}
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class ProncerComponent {
  private readonly studio = inject(StudioStore);
  private readonly sessionStore = inject(SessionStore);
  private readonly shotBuilderService = inject(ShotBuilderService);

  protected readonly expanded = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly userInstructions = signal('');

  /** The prompt being edited — synced with StudioStore.rawDescription. */
  protected readonly editablePrompt = signal('');

  /** Read the current prompt from StudioStore to display. */
  protected readonly currentPrompt = computed(() => {
    return this.studio.rawDescription() || this.editablePrompt();
  });

  protected readonly optimizedPrompt = signal<string | null>(null);
  protected readonly suggestions = signal<string[]>([]);
  protected readonly chatMessages = signal<ChatMessage[]>([]);

  protected readonly canOptimize = computed(
    () => !this.loading() && this.currentPrompt().trim().length > 0,
  );

  protected toggleExpanded(): void {
    this.expanded.update((v) => !v);
  }

  /** Sync back to StudioStore when user edits the prompt textarea. */
  protected onPromptChange(value: string): void {
    this.editablePrompt.set(value);
  }

  protected optimize(): void {
    const prompt = this.currentPrompt().trim();
    if (!prompt) return;

    this.loading.set(true);
    this.error.set(null);
    this.optimizedPrompt.set(null);
    this.suggestions.set([]);

    // Add user message to chat
    const instructions = this.userInstructions().trim() || 'Refine this prompt';
    this.addChatMessage('user', `Optimize: "${prompt.slice(0, 80)}..."`);

    const projectId = this.studio.projectId();
    const sceneId = this.studio.sceneId();
    const userName = this.sessionStore.user()?.handle || '';

    this.shotBuilderService
      .optimizePrompt({
        projectId: projectId || '',
        sceneId: sceneId || '',
        currentPrompt: prompt,
        userInstructions: instructions,
        userName,
      })
      .subscribe({
        next: (result) => {
          if (result.optimizedPrompt) {
            this.optimizedPrompt.set(result.optimizedPrompt);
            this.addChatMessage(
              'assistant',
              `Optimized prompt ready. ${result.changesMade?.length ? 'Changes: ' + result.changesMade.join(', ') : ''}`,
            );
          }
          if (result.suggestions) {
            this.suggestions.set(result.suggestions);
          }
        },
        error: (err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Failed to optimize prompt';
          this.error.set(msg);
          this.addChatMessage('assistant', `Error: ${msg}`);
        },
        complete: () => {
          this.loading.set(false);
        },
      });
  }

  protected applyOptimized(): void {
    const opt = this.optimizedPrompt();
    if (!opt) return;

    this.studio.setRawDescription(opt);
    this.optimizedPrompt.set(null);
    this.suggestions.set([]);
    this.addChatMessage('assistant', 'Prompt applied to the studio.');
  }

  private addChatMessage(role: 'user' | 'assistant', content: string): void {
    this.chatMessages.update((items) => [
      ...items,
      {
        id: `proncer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        role,
        content,
        timestamp: Date.now(),
      },
    ]);
  }
}
