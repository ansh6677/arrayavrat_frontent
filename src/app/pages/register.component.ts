import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { FARM } from '../core/farm';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="section auth-shell">
      <div class="container" style="display: grid; place-items: center;">
        <div class="card auth-card wide">
          <div class="auth-head">
            <img class="auth-mark" [src]="farm.logo" alt="" width="72" height="72" />
            <span class="eyebrow">New customer</span>
            <h1>Create your account</h1>
            <p>Register once — then view all your bills online, anytime.</p>
          </div>

          @if (error) { <div class="alert alert-error">{{ error }}</div> }

          <form (ngSubmit)="submit()">
            <div class="field">
              <label for="name">Full name *</label>
              <input id="name" name="name" autocomplete="name" [(ngModel)]="form.name" placeholder="e.g. Ramesh Kumar" required />
            </div>
            <div class="field">
              <label for="phone">Phone number *</label>
              <input id="phone" name="phone" type="tel" inputmode="numeric" autocomplete="tel" [(ngModel)]="form.phone" placeholder="10-digit mobile number" required />
              <span class="hint">This will be your login ID.</span>
            </div>
            <div class="field">
              <label for="email">Email (optional)</label>
              <input id="email" name="email" type="email" autocomplete="email" [(ngModel)]="form.email" placeholder="you@example.com" />
            </div>
            <div class="field">
              <label for="address">Delivery address (optional)</label>
              <textarea id="address" name="address" [(ngModel)]="form.address" placeholder="House, street, area…"></textarea>
            </div>
            <div class="field">
              <label for="password">Password *</label>
              <input id="password" name="password" type="password" autocomplete="new-password" [(ngModel)]="form.password" placeholder="Minimum 4 characters" required />
            </div>
            <button class="btn btn-primary btn-block" [disabled]="busy">
              @if (busy) { <span class="spinner"></span> } Create account
            </button>
          </form>

          <p class="auth-foot">
            Already have an account? <a routerLink="/login"><b>Sign in</b></a>
          </p>
        </div>
      </div>
    </section>
  `,
  styles: []
})
export class RegisterComponent {
  private auth = inject(AuthService);
  farm = FARM;
  private router = inject(Router);

  form = { name: '', phone: '', email: '', address: '', password: '' };
  busy = false;
  error = '';

  submit() {
    if (!this.form.name.trim() || !this.form.phone.trim()) {
      this.error = 'Name and phone number are required.';
      return;
    }
    if ((this.form.password || '').length < 4) {
      this.error = 'Password must be at least 4 characters.';
      return;
    }
    this.busy = true;
    this.error = '';
    this.auth.register({ ...this.form, name: this.form.name.trim(), phone: this.form.phone.trim() }).subscribe({
      next: () => {
        this.busy = false;
        this.router.navigate(['/dashboard']);
      },
      error: err => {
        this.busy = false;
        this.error = err?.error?.error || 'Registration failed. Please try again in a moment.';
      }
    });
  }
}
