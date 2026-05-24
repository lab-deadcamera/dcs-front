import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Component({
  selector: 'app-scene-assignment',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="p-6">
      <h1 class="mb-1 text-[18px] font-bold uppercase tracking-[0.12em]">Scene Resources</h1>
      <p class="mb-6 text-[12px] text-fg-muted">
        Assign characters, assets, and presets to scene {{ sceneId() }}
      </p>

      <div class="rounded border border-ink-700 bg-ink-800 p-8 text-center">
        <p class="text-[13px] text-fg-muted">
          Scene resource assignment coming soon.
        </p>
      </div>
    </section>
  `,
})
export class SceneAssignmentComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly sceneId = toSignal(
    this.route.params.pipe(map((p) => p['sceneId'])),
    { initialValue: '' },
  );
}
