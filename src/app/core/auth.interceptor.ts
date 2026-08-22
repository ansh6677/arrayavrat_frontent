import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { API_URL } from './farm';
import { AuthService } from './auth.service';

/**
 * Attaches the JWT to every API call, and on 401 (expired/invalid session)
 * clears the stored session and sends the user to the right login page.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  const token = localStorage.getItem('adf_token');
  if (token && req.url.startsWith(API_URL)) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && auth.isLoggedIn()) {
        sessionStorage.setItem('adf_session_expired', '1');
        const target = router.url.startsWith('/management') ? '/management' : '/login';
        auth.logout(false);
        router.navigate([target]);
      }
      return throwError(() => err);
    })
  );
};
