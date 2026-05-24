import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap, catchError, of } from 'rxjs';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { environment } from '@environment/environment';
import { SceneAssignments } from '@core/interfaces/seedance.interface';

@Component({
  selector: 'app-scene-assignment',
  standalone: true,
  imports: [DatePipe, ButtonModule, TableModule, SelectModule, ToastModule],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="p-6">
      <h1 class="mb-1 text-[18px] font-bold uppercase tracking-[0.12em]">
        Scene Resources
      </h1>
      <p class="mb-6 text-[12px] text-fg-muted">
        Assign presets, characters and assets to scene {{ sceneId() }}
      </p>

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

      <!-- Content -->
      @switch (activeTab()) {
        @case ('presets') {
          <p class="mb-4 text-[12px] text-fg-muted">
            Presets assigned to this scene appear in the Studio.
          </p>
          <div class="rounded border border-ink-700 bg-ink-800 p-8 text-center">
            <p class="text-[13px] text-fg-muted">
              Preset assignment coming soon. Use the Studio to manage presets.
            </p>
          </div>
        }
        @case ('characters') {
          <p class="mb-4 text-[12px] text-fg-muted">
            Characters assigned to this scene appear in the Studio asset selector.
          </p>
          <div class="rounded border border-ink-700 bg-ink-800 p-8 text-center">
            <p class="text-[13px] text-fg-muted">
              Character assignment coming soon.
            </p>
          </div>
        }
        @case ('assets') {
          <p class="mb-4 text-[12px] text-fg-muted">
            Files assigned to this scene appear in the Studio asset selector.
          </p>
          <div class="rounded border border-ink-700 bg-ink-800 p-8 text-center">
            <p class="text-[13px] text-fg-muted">
              Asset assignment coming soon.
            </p>
          </div>
        }
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

  protected readonly assignments = signal<SceneAssignments | null>(null);
  protected readonly loading = signal(false);

  ngOnInit(): void {
    this.route.params.pipe(
      map((p) => p['sceneId']),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((sceneId) => {
      if (sceneId) this.loadAssignments(sceneId);
    });
  }

  private loadAssignments(sceneId: string): void {
    this.loading.set(true);
    this.http.get<{ data: SceneAssignments }>(
      `${this.apiUrl}/projects/null/scenes/${sceneId}/assignments`,
    ).pipe(
      catchError(() => of({ data: { presets: [], characters: [], assets: [] } })),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((res) => {
      this.assignments.set(res.data);
      this.loading.set(false);
    });
  }
}
