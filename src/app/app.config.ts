import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { provideIcons } from '@ng-icons/core';
import { heroSunMicro, heroMoonMicro, heroCheckMicro } from '@ng-icons/heroicons/micro';
import Aura from '@primeuix/themes/aura';

import { routes } from '@app/app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimationsAsync(),
    providePrimeNG({
      ripple: true,
      inputVariant: 'outlined',
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.p-dark',
        },
      },
    }),
    provideIcons({ heroSunMicro, heroMoonMicro, heroCheckMicro }),
  ],
};
