import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { FARM } from '../core/farm';

/** /management — staff login (Full-access ADMIN or View-only VIEWER). */
@Component({
  selector: 'app-mgmt-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="mlogin">
      <div class="mlogin-card">
        <div class="mlogin-brand">
          <img [src]="farm.logo" alt="" />
          <div>
            <b>{{ farm.name }}</b>
            <span>Management panel</span>
          </div>
        </div>

        @if (error) { <div class="alert alert-error">{{ error }}</div> }

        <form (ngSubmit)="submit()">
          <div class="field">
            <label for="adminId">Login ID</label>
            <input id="adminId" name="adminId" autocomplete="username" [(ngModel)]="adminId" placeholder="Admin / staff login id" required />
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input id="password" name="password" type="password" autocomplete="current-password" [(ngModel)]="password" placeholder="Password" required />
          </div>
          <button class="btn btn-primary btn-block" [disabled]="busy">
            @if (busy) { <span class="spinner"></span> } Login to management
          </button>
        </form>

        <p class="mlogin-hint">
          Authorised staff only. Don't have access? Please contact your administrator.
        </p>
      </div>
    </section>
  `,
  styles: [`
    .mlogin {
      min-height: 100vh;
      display: grid;
      place-items: center;
      background:
        radial-gradient(700px 340px at 80% 8%, rgba(201, 162, 39, 0.16), transparent 65%),
        radial-gradient(500px 300px at 10% 90%, rgba(201, 162, 39, 0.08), transparent 60%),
        #0A0906;
      padding: 24px;
    }
    .mlogin-card {
      position: relative;
      width: min(430px, 100%);
      padding: 34px;
      background: var(--surface-2);
      border: 1px solid var(--line);
      border-radius: 18px;
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    .mlogin-card::before {
      content: ''; position: absolute; inset: 0 0 auto 0; height: 2px;
      background: var(--gold-grad);
    }
    .mlogin-brand { display: flex; align-items: center; gap: 13px; margin-bottom: 24px; }
    .mlogin-brand img { width: 58px; height: 58px; border-radius: 50%; filter: drop-shadow(0 0 16px rgba(201, 162, 39, 0.36)); }
    .mlogin-brand b { font-family: var(--font-display); font-size: 1.15rem; display: block; color: var(--gold-2); }
    .mlogin-brand span { font-size: 0.72rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted); font-weight: 700; }
    .mlogin-hint { margin-top: 16px; font-size: 0.8rem; color: var(--muted); }
    .mlogin-hint code { color: var(--gold-2); }
  `]
})
export class MgmtLoginComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);

  farm = FARM;
  adminId = '';
  password = '';
  busy = false;
  error = '';

  constructor() {
    if (sessionStorage.getItem('adf_session_expired')) {
      sessionStorage.removeItem('adf_session_expired');
      this.error = 'Your session has expired — please log in again.';
    }
  }

  ngOnInit() {
    if (this.auth.isStaff()) {
      this.router.navigate(['/management/panel']);
    }
  }

  submit() {
    if (!this.adminId.trim() || !this.password) {
      this.error = 'Please enter both login ID and password.';
      return;
    }
    this.busy = true;
    this.error = '';
    this.auth.login(this.adminId.trim(), this.password).subscribe({
      next: res => {
        this.busy = false;
        if (res.role === 'ADMIN' || res.role === 'VIEWER') {
          this.router.navigate(['/management/panel']);
        } else {
          this.error = 'This is a customer account — customers sign in from the website /login page.';
          this.auth.logout(false);
        }
      },
      error: err => {
        this.busy = false;
        this.error = err?.error?.error || 'Login failed. Please check your credentials.';
      }
    });
  }
}
