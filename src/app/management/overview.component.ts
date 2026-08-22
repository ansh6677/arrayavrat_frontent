import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { productPhoto } from '../core/farm';
import { DailyEntry, DayDetail, DayPoint, Stats } from '../core/models';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent],
  template: `
    <div class="dash-head">
      <div>
        <h2>Dashboard</h2>
        <p class="mgmt-sub">Today's sales, product-wise performance, expenses and outstanding — all at a glance.</p>
      </div>
      <label class="month-filter">
        <span>Showing</span>
        <select [(ngModel)]="month" (ngModelChange)="applyMonth()" aria-label="Select month">
          @for (m of monthOptions(); track m.value) {
            <option [value]="m.value">{{ m.label }}</option>
          }
        </select>
      </label>
    </div>

    @if (loading) {
      <div class="stat-grid mb">
        @for (i of [1, 2, 3, 4, 5, 6]; track i) { <div class="skeleton" style="height: 96px;"></div> }
      </div>
      <div class="skeleton" style="height: 220px;"></div>
    } @else if (error) {
      <div class="alert alert-error">{{ error }}</div>
    } @else if (stats) {
      <!-- ============ top stat cards ============ -->
      <div class="stat-grid mb">
        <div class="stat stat-gold">
          <div class="stat-label">Today's sales</div>
          <div class="stat-value">₹{{ stats.todaySales | number: '1.0-0' }}</div>
          <div class="muted stat-note">{{ stats.todayEntryCount }} {{ stats.todayEntryCount === 1 ? 'entry' : 'entries' }} today</div>
        </div>
        <div class="stat">
          <div class="stat-label">{{ stats.monthLabel }} sales</div>
          <div class="stat-value">₹{{ stats.monthSales | number: '1.0-0' }}</div>
        </div>
        <div class="stat">
          <div class="stat-label">{{ stats.monthLabel }} expenses</div>
          <div class="stat-value">₹{{ stats.monthExpenses | number: '1.0-0' }}</div>
        </div>
        <div class="stat" [class.stat-green]="stats.monthProfit >= 0" [class.stat-red]="stats.monthProfit < 0">
          <div class="stat-label">{{ stats.monthLabel }} profit (sales − expenses)</div>
          <div class="stat-value">₹{{ stats.monthProfit | number: '1.0-0' }}</div>
        </div>
        <div class="stat stat-red">
          <div class="stat-label">Total outstanding</div>
          <div class="stat-value">₹{{ stats.totalOutstanding | number: '1.0-0' }}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Customers</div>
          <div class="stat-value">{{ stats.customerCount }}</div>
          <div class="muted stat-note">{{ stats.productCount }} {{ stats.productCount === 1 ? 'product' : 'products' }} live</div>
        </div>
      </div>

      <!-- ============ product-wise sales cards ============ -->
      <div class="panel">
        <h3>Product-wise sales</h3>
        @if (stats.productSales.length === 0) {
          <p class="muted">No entries for {{ stats.monthLabel }}. Open a customer's page to add one.</p>
        } @else {
          <div class="psale-grid">
            @for (ps of stats.productSales; track ps.productId) {
              <div class="psale">
                <img class="ps-thumb" [src]="photo(ps.productName)" alt="" loading="lazy" width="96" height="96" />
                <div class="ps-body">
                  <div class="ps-name">{{ ps.productName }}</div>
                  <div class="ps-month">₹{{ ps.monthAmount | number: '1.0-0' }}</div>
                  <div class="ps-meta">This month · {{ ps.monthQty | number: '1.0-2' }} {{ ps.unit }}</div>
                  <div class="ps-meta ps-today">
                    Today: <b>{{ ps.todayQty | number: '1.0-2' }} {{ ps.unit }}</b>
                    · ₹{{ ps.todayAmount | number: '1.0-0' }}
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- ============ daily chart (click a day for the breakdown) ============ -->
      <div class="panel">
        <div class="panel-head">
          <h3>{{ stats.monthLabel }} — sales vs expenses</h3>
          <div class="legend">
            <span><i class="sw sw-sale"></i> Sales</span>
            <span><i class="sw sw-exp"></i> Expenses</span>
          </div>
        </div>

        @if (stats.days.length === 0) {
          <p class="muted">Nothing recorded for this month yet.</p>
        } @else {
          <div class="day-chart">
            @for (d of stats.days; track d.date) {
              <button type="button" class="day-col" (click)="openDay(d)"
                      [title]="d.label + ' — sales ₹' + d.sales + ', expenses ₹' + d.expenses"
                      [attr.aria-label]="'View breakdown for ' + d.label">
                <span class="stack">
                  <i class="b b-sale" [style.height.%]="barHeight(d.sales)"></i>
                  <i class="b b-exp" [style.height.%]="barHeight(d.expenses)"></i>
                </span>
                <span class="day-num">{{ d.label.slice(0, 2) }}</span>
              </button>
            }
          </div>
          <p class="muted chart-hint">Click any day to see every sale and expense recorded on it.</p>
        }
      </div>

      <div class="grid-2">
        <!-- ============ today's entries ============ -->
        <div class="panel">
          <h3>Today's entries</h3>
          @if (todayEntries.length === 0) {
            <p class="muted">No entries yet today. Open <a routerLink="/management/panel/customers">Customers</a> to add one.</p>
          } @else {
            <div class="tbl-wrap">
              <table class="tbl" style="min-width: 380px;">
                <thead>
                  <tr><th>Customer</th><th>Product</th><th class="num">Total (₹)</th></tr>
                </thead>
                <tbody>
                  @for (e of todayEntries; track e.id) {
                    <tr>
                      <td>{{ e.customerName }}</td>
                      <td>{{ e.productName }} <span class="muted">({{ e.quantity | number: '1.0-2' }} {{ e.unit }})</span></td>
                      <td class="num">{{ e.total | number: '1.0-2' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <!-- ============ monthly + actions ============ -->
        <div class="panel">
          <h3>Monthly sales (last 12 months)</h3>
          <div class="tbl-wrap mb">
            <table class="tbl" style="min-width: 300px;">
              <thead>
                <tr><th>Month</th><th class="num">Sales (₹)</th></tr>
              </thead>
              <tbody>
                @for (m of stats.monthly; track m.label) {
                  <tr>
                    <td>{{ m.label }}</td>
                    <td class="num">{{ m.total | number: '1.0-0' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (auth.isFullAdmin()) {
            <div class="qa">
              <a routerLink="/management/panel/customers" class="btn btn-primary btn-sm">
                <app-icon name="plus" [size]="15" [stroke]="2.4" /> Daily entry
              </a>
              <a routerLink="/management/panel/expenses" class="btn btn-outline btn-sm">
                <app-icon name="wallet" [size]="15" /> Add expense
              </a>
            </div>
          }
          <div class="mt muted" style="font-size: 0.88rem;">
            All-time: sales <b>₹{{ stats.totalSales | number: '1.0-0' }}</b> ·
            received <b>₹{{ stats.totalPaymentsReceived | number: '1.0-0' }}</b> ·
            expenses <b>₹{{ stats.totalExpenses | number: '1.0-0' }}</b>
          </div>
        </div>
      </div>
    }

    <!-- ============ day breakdown popup ============ -->
    @if (dayOpen) {
      <div class="modal-back" (click)="closeDay()">
        <div class="modal day-modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <div class="modal-head">
            <h3>
              {{ day?.label || 'Day details' }}
              <span class="m-sub">Sales and expenses recorded on this date</span>
            </h3>
            <button type="button" class="modal-close" (click)="closeDay()" aria-label="Close">
              <app-icon name="close" [size]="18" [stroke]="2" />
            </button>
          </div>

          @if (dayLoading) {
            <div class="skeleton" style="height: 180px;"></div>
          } @else if (dayError) {
            <div class="alert alert-error">{{ dayError }}</div>
          } @else if (day) {
            <div class="day-tot">
              <div class="dt dt-sale">
                <span>Sales</span>
                <b>₹{{ day.sales | number: '1.0-2' }}</b>
                <small>{{ day.entryCount }} {{ day.entryCount === 1 ? 'entry' : 'entries' }}</small>
              </div>
              <div class="dt dt-exp">
                <span>Expenses</span>
                <b>₹{{ day.expenses | number: '1.0-2' }}</b>
                <small>{{ day.expenseCount }} {{ day.expenseCount === 1 ? 'item' : 'items' }}</small>
              </div>
              <div class="dt" [class.dt-plus]="day.profit >= 0" [class.dt-minus]="day.profit < 0">
                <span>Profit</span>
                <b>₹{{ day.profit | number: '1.0-2' }}</b>
                <small>sales − expenses</small>
              </div>
            </div>

            <h4 class="day-h">Sales</h4>
            @if (day.entries.length === 0) {
              <p class="muted">No sales recorded on this day.</p>
            } @else {
              <div class="tbl-wrap">
                <table class="tbl" style="min-width: 460px;">
                  <thead>
                    <tr><th>Customer</th><th>Product</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Total (₹)</th></tr>
                  </thead>
                  <tbody>
                    @for (r of day.entries; track $index) {
                      <tr>
                        <td>{{ r.customerName }}</td>
                        <td>
                          {{ r.productName }}
                          @if (r.paid) { <span class="pill-paid">Paid</span> }
                        </td>
                        <td class="num">{{ r.quantity | number: '1.0-2' }} {{ r.unit }}</td>
                        <td class="num">{{ r.rate | number: '1.0-2' }}</td>
                        <td class="num">{{ r.total | number: '1.0-2' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            <h4 class="day-h">Expenses</h4>
            @if (day.expenseRows.length === 0) {
              <p class="muted">No expenses recorded on this day.</p>
            } @else {
              <div class="tbl-wrap">
                <table class="tbl" style="min-width: 460px;">
                  <thead>
                    <tr><th>Category</th><th>Note</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount (₹)</th></tr>
                  </thead>
                  <tbody>
                    @for (x of day.expenseRows; track $index) {
                      <tr>
                        <td>{{ x.category }}</td>
                        <td class="muted">{{ x.note || '—' }}</td>
                        <td class="num">{{ x.quantity | number: '1.0-2' }} {{ x.unit }}</td>
                        <td class="num">{{ x.unitAmount | number: '1.0-2' }}</td>
                        <td class="num">{{ x.amount | number: '1.0-2' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          }

          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" (click)="closeDay()">Close</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .dash-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .month-filter { display: flex; align-items: center; gap: 10px; font-size: 0.84rem; color: var(--muted); }
    .month-filter select { width: auto; min-width: 172px; padding: 9px 14px; border-radius: 999px; font-weight: 600; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
    .panel-head h3 { margin: 0; }
    .legend { display: flex; gap: 14px; font-size: 0.8rem; color: var(--muted); }
    .legend span { display: inline-flex; align-items: center; gap: 6px; }
    .sw { width: 11px; height: 11px; border-radius: 3px; display: inline-block; }
    .sw-sale { background: var(--gold-grad); }
    .sw-exp { background: #B4553F; }

    /* Two thin bars per day: sales and expenses, side by side and clickable. */
    .day-chart { display: flex; align-items: flex-end; gap: 3px; overflow-x: auto; padding-bottom: 4px; }
    .day-col {
      flex: 1 0 20px; background: none; border: none; cursor: pointer; padding: 0;
      display: flex; flex-direction: column; align-items: center; gap: 5px;
      border-radius: 8px; transition: background 0.15s ease;
    }
    .day-col:hover { background: rgba(201, 162, 39, 0.1); }
    .day-col:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
    .stack { display: flex; align-items: flex-end; gap: 2px; height: 150px; width: 100%; justify-content: center; }
    .b { width: 7px; border-radius: 3px 3px 0 0; min-height: 2px; transition: opacity 0.15s ease; }
    .b-sale { background: var(--gold-grad); }
    .b-exp { background: #B4553F; }
    .day-col:hover .b { opacity: 0.85; }
    .day-num { font-size: 0.62rem; color: var(--muted); }

    .day-modal { width: min(720px, 100%); }
    .day-tot { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
    .dt {
      background: var(--surface); border: 1px solid var(--line-soft); border-radius: 12px;
      padding: 12px 14px; display: flex; flex-direction: column; gap: 2px;
    }
    .dt span { font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
    .dt b { font-family: var(--font-display); font-size: 1.24rem; color: var(--ivory); }
    .dt small { font-size: 0.74rem; color: var(--muted); }
    .dt-sale b { color: var(--gold-2); }
    .dt-exp b { color: #E4907A; }
    .dt-plus b { color: #9ACE84; }
    .dt-minus b { color: #E4907A; }
    .day-h { margin: 18px 0 10px; color: var(--gold-2); font-size: 0.96rem; }
    .pill-paid {
      display: inline-block; margin-left: 6px; font-size: 0.64rem; font-weight: 700;
      letter-spacing: 0.08em; text-transform: uppercase; color: #9ACE84;
      border: 1px solid rgba(154, 206, 132, 0.4); border-radius: 999px; padding: 1px 7px;
    }
    @media (max-width: 560px) { .day-tot { grid-template-columns: 1fr; } }

    .qa { display: flex; flex-wrap: wrap; gap: 10px; }
    .chart-hint { font-size: 0.82rem; margin-top: 8px; }
    .stat-note { font-size: 0.8rem; }
    .ps-thumb {
      width: 56px; height: 56px; border-radius: 12px; object-fit: contain;
      border: 1px solid var(--line-soft); flex-shrink: 0;
    }
    .ps-body { min-width: 0; }
    .ps-today { margin-top: 6px; }
    .ps-today b { color: var(--ivory); }
  `]
})
export class OverviewComponent implements OnInit {
  private api = inject(ApiService);
  auth = inject(AuthService);

  stats: Stats | null = null;
  photo = (name: string) => productPhoto({ name });
  todayEntries: DailyEntry[] = [];
  loading = true;
  error = '';

  /** Selected month (YYYY-MM); empty means the current month. */
  month = '';

  dayOpen = false;
  dayLoading = false;
  dayError = '';
  day: DayDetail | null = null;

  /** Highest single value in the chart — both series share one scale. */
  private max = 1;

  ngOnInit() {
    this.load();
    this.api.getEntries({}).subscribe({
      next: list => (this.todayEntries = list.slice(0, 8))
    });
  }

  private load() {
    this.loading = true;
    this.error = '';
    this.api.getStats(this.month || undefined).subscribe({
      next: s => {
        this.stats = s;
        this.month = s.month;
        this.max = Math.max(1, ...s.days.map(d => Math.max(d.sales, d.expenses)));
        this.loading = false;
      },
      error: err => {
        this.error = err?.error?.error || 'Could not load dashboard stats.';
        this.loading = false;
      }
    });
  }

  applyMonth() {
    this.load();
  }

  /** Dropdown options stay available while a reload is in flight. */
  monthOptions() {
    return this.stats?.months ?? [];
  }

  barHeight(value: number): number {
    if (value <= 0) return 1;
    return Math.max(3, Math.round((value / this.max) * 100));
  }

  openDay(d: DayPoint) {
    this.dayOpen = true;
    this.dayLoading = true;
    this.dayError = '';
    this.day = null;
    this.api.getDayDetail(d.date).subscribe({
      next: detail => {
        this.day = detail;
        this.dayLoading = false;
      },
      error: err => {
        this.dayError = err?.error?.error || 'Could not load details for this day.';
        this.dayLoading = false;
      }
    });
  }

  closeDay() {
    this.dayOpen = false;
    this.day = null;
  }
}
