import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { isoDate, monthStart } from '../core/farm';
import { Bill } from '../core/models';
import { BillViewComponent } from '../shared/bill-view.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, BillViewComponent],
  template: `
    <div class="container page-head no-print">
      <span class="eyebrow">Customer dashboard</span>
      <h1>Welcome back, {{ auth.user()?.name }}</h1>
      <p>Pick a date range and see your complete account — purchases, payments and outstanding balance — in one place.</p>
    </div>

    <section class="section" style="padding-top: 24px;">
      <div class="container">
        @if (bill) {
          <div class="stat-grid mb no-print">
            <div class="stat" [class.stat-red]="bill.outstanding > 0" [class.stat-green]="bill.outstanding <= 0">
              <div class="stat-label">Outstanding (total due)</div>
              <div class="stat-value">₹{{ bill.outstanding | number: '1.0-2' }}</div>
            </div>
            <div class="stat">
              <div class="stat-label">This period purchases</div>
              <div class="stat-value">₹{{ bill.periodTotal | number: '1.0-2' }}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Total paid (all time)</div>
              <div class="stat-value">₹{{ bill.lifetimePaid | number: '1.0-2' }}</div>
            </div>
          </div>
        }

        <div class="panel no-print">
          <div class="toolbar">
            <div class="field">
              <label for="from">From date</label>
              <input id="from" type="date" name="from" [(ngModel)]="from" />
            </div>
            <div class="field">
              <label for="to">To date</label>
              <input id="to" type="date" name="to" [(ngModel)]="to" />
            </div>
            <button class="btn btn-primary" (click)="load()" [disabled]="loading">
              @if (loading) { <span class="spinner"></span> } View bill
            </button>
          </div>
          @if (error) { <div class="alert alert-error" style="margin-bottom: 0;">{{ error }}</div> }
        </div>

        @if (bill) {
          <app-bill-view [bill]="bill" />
        } @else if (!loading && !error) {
          <p class="muted">Select a date range above and press <b>View bill</b>.</p>
        }
      </div>
    </section>
  `
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);

  from = monthStart();
  to = isoDate();
  bill: Bill | null = null;
  loading = false;
  error = '';

  ngOnInit() {
    this.load();
  }

  load() {
    if (!this.from || !this.to) {
      this.error = 'Please choose both From and To dates.';
      return;
    }
    this.loading = true;
    this.error = '';
    this.api.getMyBill(this.from, this.to).subscribe({
      next: bill => {
        this.bill = bill;
        this.loading = false;
      },
      error: err => {
        this.error = err?.error?.error || 'Could not load your bill. Please try again.';
        this.loading = false;
      }
    });
  }
}
