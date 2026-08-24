import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { FARM } from '../core/farm';

/** Customer-only login — staff/admin use /management instead. */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="section auth-shell">
      <div class="container" style="display: grid; place-items: center;">
        <div class="card auth-card">
          <div class="auth-head">
            <img class="auth-mark" [src]="farm.logo" alt="" width="72" height="72" />
            <span class="eyebrow">Customer login</span>
            <h1>View your account</h1>
            <p>Sign in to see your bills, payments and outstanding balance.</p>
          </div>

          @if (error) { <div class="alert alert-error">{{ error }}</div> }

          <form (ngSubmit)="submit()">
            <div class="field">
              <label for="phone">Phone number</label>
              <input id="phone" name="phone" type="tel" inputmode="numeric" autocomplete="username"
                     [(ngModel)]="phone" placeholder="Your 10-digit mobile number" required />
            </div>
            <div class="field">
              <label for="password">Password</label>
              <input id="password" name="password" type="password" autocomplete="current-password"
                     [(ngModel)]="password" placeholder="Your password" required />
            </div>
            <button class="btn btn-primary btn-block" [disabled]="busy">
              @if (busy) { <span class="spinner"></span> } Login
            </button>
          </form>

          <p class="auth-foot">
            New customer? <a routerLink="/register"><b>Create an account</b></a>
          </p>
          <p class="auth-foot">
            Farm staff or admin? Use the
            <a routerLink="/management"><b>management login</b></a>
          </p>
        </div>
      </div>
    </section>
  `,
  styles: []
})
export class LoginComponent {
  private auth = inject(AuthService);
  farm = FARM;
  private router = inject(Router);

  phone = '';
  password = '';
  busy = false;
  error = '';

  constructor() {
    if (sessionStorage.getItem('adf_session_expired')) {
      sessionStorage.removeItem('adf_session_expired');
      this.error = 'Your session has expired — please log in again.';
    }
  }

  submit() {
    if (!this.phone.trim() || !this.password) {
      this.error = 'Please enter both your phone number and password.';
      return;
    }
    this.busy = true;
    this.error = '';
    this.auth.login(this.phone.trim(), this.password).subscribe({
      next: res => {
        this.busy = false;
        // Customer portal, customers only. A staff or admin account signing in
        // here is refused and the session dropped immediately — management has
        // its own separate entrance.
        if (res.role !== 'CUSTOMER') {
          this.auth.logout(false);
          this.error = 'This is a staff account. Please use the management login.';
          return;
        }
        this.router.navigate(['/dashboard']);
      },
      error: err => {
        this.busy = false;
        this.error = err?.error?.error || 'Login failed. Please check your details and try again.';
      }
    });
  }
}
