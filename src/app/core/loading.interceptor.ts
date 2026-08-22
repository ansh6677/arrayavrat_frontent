import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';

import { API_URL } from './farm';
import { LoaderService } from './loader.service';

/** Shows the global loading bar while any API request is in flight. */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_URL)) return next(req);
  const loader = inject(LoaderService);
  loader.show();
  return next(req).pipe(finalize(() => loader.hide()));
};
