import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, ArcElement, DoughnutController } from 'chart.js';
import { ProjectsApiService } from '@modules/projects/projects/services';
import {
  ProjectWithChapters,
  ChapterWithScenes,
  SceneWithShots,
  ShotWithTakes,
} from '@modules/projects/projects/interfaces';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend, ArcElement, DoughnutController);

interface ProjectOption {
  label: string;
  value: string;
}

interface ChapterRow {
  id: string;
  number: number;
  name: string;
  scenes: number;
  shots: number;
  takes: number;
  shotsWithTakes: number;
}

interface DashboardStats {
  chapters: number;
  scenes: number;
  shots: number;
  takes: number;
  shotsWithTakes: number;
  takesCompleted: number;
  takesPending: number;
  takesFailed: number;
}

@Component({
  selector: 'app-home',
  imports: [FormsModule, DecimalPipe, SelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements AfterViewInit {
  private readonly api = inject(ProjectsApiService);

  @ViewChild('barCanvas') barCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('doughnutCanvas') doughnutCanvas!: ElementRef<HTMLCanvasElement>;

  // ── State ──────────────────────────────────────────────

  protected readonly loading = signal(false);
  protected readonly projects = signal<ProjectWithChapters[]>([]);
  protected readonly selectedProjectId = signal<string | null>(null);
  protected readonly projectHierarchy = signal<ProjectWithChapters | null>(null);

  private barChart: Chart | null = null;
  private doughnutChart: Chart | null = null;

  // ── Derived ─────────────────────────────────────────────

  protected readonly projectOptions = computed<ProjectOption[]>(() =>
    this.projects().map((p) => ({
      label: p.project.name || p.project.id.slice(0, 8),
      value: p.project.id,
    })),
  );

  protected readonly stats = computed<DashboardStats>(() => {
    const h = this.projectHierarchy();
    if (!h) return { chapters: 0, scenes: 0, shots: 0, takes: 0, shotsWithTakes: 0, takesCompleted: 0, takesPending: 0, takesFailed: 0 };

    let totalScenes = 0;
    let totalShots = 0;
    let totalTakes = 0;
    let shotsWithTakes = 0;
    let takesCompleted = 0;
    let takesPending = 0;
    let takesFailed = 0;

    for (const c of h.chapters) {
      totalScenes += c.scenes.length;
      for (const s of c.scenes) {
        totalShots += s.shots.length;
        for (const sh of s.shots) {
          const takeCount = sh.takes.length;
          totalTakes += takeCount;
          if (takeCount > 0) shotsWithTakes++;
          for (const t of sh.takes) {
            if (t.status === 'completed') takesCompleted++;
            else if (t.status === 'failed') takesFailed++;
            else takesPending++;
          }
        }
      }
    }

    return {
      chapters: h.chapters.length,
      scenes: totalScenes,
      shots: totalShots,
      takes: totalTakes,
      shotsWithTakes,
      takesCompleted,
      takesPending,
      takesFailed,
    };
  });

  protected readonly chapterRows = computed<ChapterRow[]>(() => {
    const h = this.projectHierarchy();
    if (!h) return [];

    return h.chapters.map((c) => {
      let scenes = 0;
      let shots = 0;
      let takes = 0;
      let shotsWithTakes = 0;

      scenes = c.scenes.length;
      for (const s of c.scenes) {
        shots += s.shots.length;
        for (const sh of s.shots) {
          takes += sh.takes.length;
          if (sh.takes.length > 0) shotsWithTakes++;
        }
      }

      return {
        id: c.chapter.id,
        number: c.chapter.number,
        name: c.chapter.name,
        scenes,
        shots,
        takes,
        shotsWithTakes,
      };
    });
  });

  // ── Lifecycle ────────────────────────────────────────────

  constructor() {
    effect(() => {
      const id = this.selectedProjectId();
      if (!id) return;
      this.loadHierarchy(id);
    });
  }

  ngOnInit(): void {
    this.loading.set(true);
    this.api.listProjects().subscribe((res) => {
      this.loading.set(false);
      if (!res.error && res.data) {
        const loaded = res.data.map((p) => ({ project: p, chapters: [] }));
        this.projects.set(loaded);
        // Auto-select first project
        if (loaded.length > 0) {
          this.selectedProjectId.set(loaded[0].project.id);
        }
      }
    });
  }

  ngAfterViewInit(): void {
    // Charts are rendered by the effect when hierarchy changes
    effect(() => {
      this.projectHierarchy(); // read to subscribe
      // Wait a tick for the DOM to update
      setTimeout(() => this.renderCharts(), 50);
    });
  }

  // ── Data loading ──────────────────────────────────────────

  private loadHierarchy(id: string): void {
    this.loading.set(true);
    this.projectHierarchy.set(null);
    this.api.getProjectHierarchy(id).subscribe((res) => {
      this.loading.set(false);
      if (!res.error && res.data) {
        this.projectHierarchy.set(res.data);
      }
    });
  }

  // ── Charts ────────────────────────────────────────────────

  private renderCharts(): void {
    const s = this.stats();

    if (this.barChart) { this.barChart.destroy(); this.barChart = null; }
    if (this.doughnutChart) { this.doughnutChart.destroy(); this.doughnutChart = null; }

    // ── Bar chart: scenes + shots per chapter ──
    const barEl = this.barCanvas?.nativeElement;
    if (barEl) {
      const rows = this.chapterRows();
      this.barChart = new Chart(barEl, {
        type: 'bar',
        data: {
          labels: rows.map((r) => `CH${r.number}`),
          datasets: [
            {
              label: 'Scenes',
              data: rows.map((r) => r.scenes),
              backgroundColor: '#818cf8',
              borderRadius: 3,
            },
            {
              label: 'Shots',
              data: rows.map((r) => r.shots),
              backgroundColor: '#34d399',
              borderRadius: 3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true, position: 'top', labels: { boxWidth: 10, padding: 12, font: { size: 11 } } },
            tooltip: { enabled: true },
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { font: { size: 10 }, stepSize: 1 } },
          },
        },
      });
    }

    // ── Doughnut: shots with takes vs without ──
    const doEl = this.doughnutCanvas?.nativeElement;
    if (doEl && s.shots > 0) {
      this.doughnutChart = new Chart(doEl, {
        type: 'doughnut',
        data: {
          labels: ['With takes', 'No takes yet'],
          datasets: [{
            data: [s.shotsWithTakes, s.shots - s.shotsWithTakes],
            backgroundColor: ['#34d399', '#555'],
            borderWidth: 0,
            hoverOffset: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '60%',
          plugins: {
            legend: { display: true, position: 'bottom', labels: { boxWidth: 10, padding: 12, font: { size: 11 } } },
            tooltip: { enabled: true },
          },
        },
      });
    }
  }
}
