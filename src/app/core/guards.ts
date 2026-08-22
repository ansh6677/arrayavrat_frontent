import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

/** /dashboard is customers-only — staff are redirected to their panel. */
export const customerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isCustomer()) return true;
  if (auth.isStaff()) {
    router.navigate(['/management/panel']);
    return false;
  }
  router.navigate(['/login']);
  return false;
};

/** Management panel: both full admins and view-only staff. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isStaff()) return true;
  router.navigate(['/management']);
  return false;
};

/** Full-access admins only (e.g. Staff management). */
export const fullAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isFullAdmin()) return true;
  router.navigate(['/management/panel']);
  return false;
};
