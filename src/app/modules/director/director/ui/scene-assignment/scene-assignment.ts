import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap, catchError, of } from 'rxjs';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { environment } from '@environment/environment';
import { SceneAssignments } from '@core/interfaces/seedance.interface';

@Component({
  selector: 'app-scene-assignment',
  standalone: true,
  imports: [DatePipe, ButtonModule, SelectModule, ToastModule],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="p-6">
      <h1 class="mb-1 text-[18px] font-bold uppercase tracking-[0.12em]">
        Scene Resources
      </h1>
      <p class="mb-6 text-[12px] text-fg-muted">
        Assign presets, characters and assets to this scene
      </p>

      <div class="mb-6 grid grid-cols-3 gap-3 text-[12px]">
        <div>
          <span class="block font-bold uppercase text-fg-muted">Project ID</span>
          <span class="font-mono">{{ projectId() }}</span>
        </div>
        <div>
          <span class="block font-bold uppercase text-fg-muted">Scene ID</span>
          <span class="font-mono">{{ sceneId() }}</span>
        </div>
      </div>

      <!-- Tabs -->
      <div class="mb-4 flex gap-2 border-b border-ink-600">
        @for (tab of tabs; track tab.key) {
          <button
            type="button"
            class="border-b-2 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors"
            [class.border-primary-500 !text-fg-strong]="activeTab() === tab.key"
            [class.border-transparent text-fg-muted]="activeTab() !== tab.key"
            (click)="activeTab.set(tab.key)"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- Presets tab -->
      @if (activeTab() === 'presets') {
        <div class="rounded border border-ink-700 bg-ink-800 p-6 text-center">
          <p class="text-[13px] text-fg-muted">
            Preset assignment coming soon.
          </p>
        </div>
      }

      <!-- Characters tab -->
      @if (activeTab() === 'characters') {
        <div class="rounded border border-ink-700 bg-ink-800 p-6 text-center">
          <p class="text-[13px] text-fg-muted">
            Character assignment coming soon.
          </p>
        </div>
      }

      <!-- Assets tab -->
      @if (activeTab() === 'assets') {
        <div class="rounded border border-ink-700 bg-ink-800 p-6 text-center">
          <p class="text-[13px] text-fg-muted">
            Asset assignment coming soon.
          </p>
        </div>
      }
    </section>
  `,
})
export class SceneAssignmentComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(MessageService);
  private readonly apiUrl = environment.API_URL;

  protected readonly projectId = toSignal(
    this.route.params.pipe(map((p) => p['projectId'])),
    { initialValue: '' },
  );
  protected readonly sceneId = toSignal(
    this.route.params.pipe(map((p) => p['sceneId'])),
    { initialValue: '' },
  );

  protected readonly tabs = [
    { key: 'presets', label: 'Presets' },
    { key: 'characters', label: 'Characters' },
    { key: 'assets', label: 'Assets' },
  ];
  protected readonly activeTab = signal<string>('presets');
  protected readonly loading = signal(false);

  ngOnInit(): void {
    // Load assignments when route params are available
  }
}
