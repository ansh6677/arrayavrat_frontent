import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

import { API_URL } from './farm';
import { AuthResponse } from './models';

const USER_KEY = 'adf_user';
const TOKEN_KEY = 'adf_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  /** Current logged-in user (null = guest). */
  user = signal<AuthResponse | null>(this.restore());

  private restore(): AuthResponse | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      const token = localStorage.getItem(TOKEN_KEY);
      // No stale "logged in" state: if the token is missing, unreadable or expired,
      // clear the saved session instead of showing the user as logged in.
      if (!raw || !token || this.isExpired(token)) {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
        return null;
      }
      return JSON.parse(raw) as AuthResponse;
    } catch {
      return null;
    }
  }

  /** Decodes the JWT payload and checks exp (unreadable tokens count as expired). */
  private isExpired(token: string): boolean {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  login(phone: string, password: string) {
    return this.http
      .post<AuthResponse>(`${API_URL}/auth/login`, { phone, password })
      .pipe(tap(res => this.store(res)));
  }

  register(data: { name: string; phone: string; email?: string; address?: string; password: string }) {
    return this.http
      .post<AuthResponse>(`${API_URL}/auth/register`, data)
      .pipe(tap(res => this.store(res)));
  }

  private store(res: AuthResponse) {
    localStorage.setItem(USER_KEY, JSON.stringify(res));
    localStorage.setItem(TOKEN_KEY, res.token);
    this.user.set(res);
  }

  logout(goHome = true) {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    this.user.set(null);
    if (goHome) this.router.navigate(['/']);
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return this.user() !== null;
  }

  /** Full-access admin (add/edit/delete sab kuch). */
  isFullAdmin(): boolean {
    return this.user()?.role === 'ADMIN';
  }

  /** Management panel access — full admin or view-only. */
  isStaff(): boolean {
    const role = this.user()?.role;
    return role === 'ADMIN' || role === 'VIEWER';
  }

  isViewer(): boolean {
    return this.user()?.role === 'VIEWER';
  }

  isCustomer(): boolean {
    return this.user()?.role === 'CUSTOMER';
  }
}
