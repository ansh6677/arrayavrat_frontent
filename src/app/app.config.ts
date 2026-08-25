import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { loadingInterceptor } from './core/loading.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideHttpClient(withInterceptors([authInterceptor, loadingInterceptor])),
    // The PWA heart: caches the app shell so it opens instantly and installs
    // like a native app. Off during ng serve, on in the deployed build.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      // The home hero's slideshow keeps the zone busy forever, so
      // "when stable" would always wait its full timeout — register up front.
      registrationStrategy: 'registerImmediately'
    })
  ]
};
