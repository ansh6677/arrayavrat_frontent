import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { AuthService } from '../core/auth.service';
import { UserInfo } from '../core/models';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <h2>Customers</h2>
    <p class="mgmt-sub">Click any customer to open their page — daily entries, payments and bills all live there.</p>

    <div class="panel">
      <div class="toolbar">
        <div class="field field-grow">
          <label for="q">Search</label>
          <input id="q" name="q" [(ngModel)]="q" placeholder="Search by name or phone…" />
        </div>
        @if (auth.isFullAdmin()) {
          <button class="btn btn-primary" (click)="openAdd()">
            <app-icon name="plus" [size]="15" [stroke]="2.4" /> Add customer
          </button>
        }
      </div>


      @if (loading) {
        <div class="skeleton" style="height: 240px;"></div>
      } @else if (filtered().length === 0) {
        <p class="muted">No customers found@if (q) { for “{{ q }}” }.</p>
      } @else {
        <p class="muted list-count">{{ filtered().length }} of {{ customers.length }} customers</p>
        <div class="tbl-wrap">
          <table class="tbl">
            <thead>
              <tr><th>Customer</th><th>Phone</th><th>Address</th><th>Status</th><th class="right">Open</th></tr>
            </thead>
            <tbody>
              @for (c of filtered(); track c.id) {
                <tr class="row-click" (click)="open(c)">
                  <td>
                    <span class="cust">
                      <span class="cust-av">{{ initials(c.name) }}</span>
                      <b>{{ c.name }}</b>
                    </span>
                  </td>
                  <td>{{ c.phone }}</td>
                  <td>{{ c.address || '—' }}</td>
                  <td>
                    @if (c.active) { <span class="badge badge-ok">Active</span> }
                    @else { <span class="badge badge-off">Inactive</span> }
                  </td>
                  <td class="right">
                    <span class="btn btn-outline btn-sm">Open <app-icon name="arrow-right" [size]="14" /></span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <!-- ============ Add customer modal ============ -->
    @if (addOpen) {
      <div class="modal-back" (click)="addOpen = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>New customer</h3>
            <button type="button" class="modal-close" (click)="addOpen = false" aria-label="Close">
              <app-icon name="close" [size]="16" [stroke]="2.2" />
            </button>
          </div>
          @if (error) { <div class="alert alert-error">{{ error }}</div> }
          <div class="form-grid">
            <div class="field">
              <label>Name <span class="req">*</span></label>
              <input name="fname" [(ngModel)]="form.name" placeholder="Full name" />
            </div>
            <div class="field">
              <label>Phone <span class="req">*</span></label>
              <input name="fphone" [(ngModel)]="form.phone" placeholder="10-digit mobile (login id)" />
            </div>
            <div class="field">
              <label>Email</label>
              <input name="femail" [(ngModel)]="form.email" placeholder="Optional" />
            </div>
            <div class="field">
              <label>Address</label>
              <input name="faddress" [(ngModel)]="form.address" placeholder="Delivery address" />
            </div>
            <div class="field">
              <label>Password</label>
              <input name="fpass" [(ngModel)]="form.password" placeholder="Leave blank to use phone number as password" />
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" (click)="addOpen = false">Cancel</button>
            <button class="btn btn-primary" (click)="save()" [disabled]="saving">
              @if (saving) { <span class="spinner"></span> } Save customer
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .list-count { font-size: 0.84rem; margin-bottom: 10px; }
    .cust { display: inline-flex; align-items: center; gap: 11px; }
    .cust-av {
      width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
      display: grid; place-items: center;
      font-family: var(--font-display); font-size: 0.85rem; color: #171307;
      background: var(--gold-grad);
    }
  `]
})
export class CustomersComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private router = inject(Router);
  auth = inject(AuthService);

  customers: UserInfo[] = [];
  q = '';
  loading = true;
  addOpen = false;
  saving = false;
  msg = '';
  error = '';

  form = { name: '', phone: '', email: '', address: '', password: '' };

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.api.getCustomers().subscribe({
      next: list => {
        this.customers = list;
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  filtered(): UserInfo[] {
    const q = this.q.trim().toLowerCase();
    if (!q) return this.customers;
    return this.customers.filter(c => (c.name + ' ' + c.phone).toLowerCase().includes(q));
  }

  /** Up to two initials for the row avatar. */
  initials(name: string): string {
    return (name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('');
  }

  open(c: UserInfo) {
    this.router.navigate(['/management/panel/customers', c.id]);
  }

  openAdd() {
    this.form = { name: '', phone: '', email: '', address: '', password: '' };
    this.error = '';
    this.addOpen = true;
  }

  save() {
    this.error = '';
    this.msg = '';
    if (!this.form.name.trim() || !this.form.phone.trim()) {
      this.error = 'Name and phone are required.';
      return;
    }
    this.saving = true;
    this.api.addCustomer(this.form).subscribe({
      next: created => {
        this.saving = false;
        this.addOpen = false;
        this.toast.success('Customer added. (If the password was left blank, the phone number is the password.)');
        this.load();
        this.router.navigate(['/management/panel/customers', created.id]);
      },
      error: err => {
        this.saving = false;
        this.error = err?.error?.error || 'Could not save. Please try again.';
      }
    });
  }
}
