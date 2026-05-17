import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from '@core/interceptors/auth.interceptor';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { provideIcons } from '@ng-icons/core';
import {
  heroSunMicro,
  heroMoonMicro,
  heroCheckMicro,
  heroChevronDownMicro,
  heroXMarkMicro,
  heroAdjustmentsHorizontalMicro,
} from '@ng-icons/heroicons/micro';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import Aura from '@primeuix/themes/aura';

import { routes } from '@app/app.routes';
import { CustomTranslateLoader } from './services';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
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
    provideIcons({
      heroSunMicro,
      heroMoonMicro,
      heroCheckMicro,
      heroChevronDownMicro,
      heroXMarkMicro,
      heroAdjustmentsHorizontalMicro,
    }),
    provideTranslateService({
      loader: {
        provide: TranslateLoader,
        useClass: CustomTranslateLoader,
      },
      fallbackLang: 'en',
    }),
  ],
};
