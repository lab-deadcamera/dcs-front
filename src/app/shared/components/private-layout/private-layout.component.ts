import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '@shared/components/header/header.component';

@Component({
  selector: 'app-private-layout',
  imports: [RouterOutlet, HeaderComponent],
  template: `
    <!--
      Lateral chrome: the app body is condensed by ~200px on each side
      on xl, with progressively smaller gutters on md/lg. The whole shell
      uses the same true-black ink-950 so the gutter and the content
      blend into a single seamless surface.
    -->
    <div
      class="min-h-dvh flex flex-col bg-ink-950 text-fg md:px-8 lg:px-16 xl:px-[200px]"
    >
      <app-header />

      <main class="flex-1 flex flex-col">
        <router-outlet />
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivateLayout {}
