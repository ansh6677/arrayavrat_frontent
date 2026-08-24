import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { saveBlob } from '../core/download';
import { isoDate, monthStart } from '../core/farm';
import { ExtraSale, ExtraSummary, Product } from '../core/models';
import { ToastService } from '../core/toast.service';
import { IconComponent } from '../shared/icon.component';

/**
 * Walk-in / counter sales — the occasional offline customer who is not in the
 * register. Every sale here is paid on the spot, so it adds straight to the
 * day's sales without touching anyone's outstanding.
 */
@Component({
  selector: 'app-extra-sales',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <h2>Extra Sells</h2>
    <p class="mgmt-sub">
      Counter sales to walk-in customers. Paid on the spot — these join the
      dashboard's sales and profit automatically.
    </p>

    <!-- ============ mini dashboard ============ -->
    <div class="stat-grid mb">
      <div class="stat stat-gold">
        <div class="stat-label">Today's walk-in sales</div>
        <div class="stat-value">₹{{ summary?.todayTotal ?? 0 | number: '1.0-2' }}</div>
      </div>
      <div class="stat">
        <div class="stat-label">This month</div>
        <div class="stat-value">₹{{ summary?.monthTotal ?? 0 | number: '1.0-2' }}</div>
        <div class="stat-sub">{{ summary?.monthCount ?? 0 }} sales</div>
      </div>
      <div class="stat">
        <div class="stat-label">All time</div>
        <div class="stat-value">₹{{ summary?.allTimeTotal ?? 0 | number: '1.0-2' }}</div>
        <div class="stat-sub">{{ summary?.allCount ?? 0 }} sales</div>
      </div>
    </div>

    <div class="panel">
      <div class="toolbar">
        <div class="field">
          <label>From date</label>
          <input type="date" name="xfrom" [(ngModel)]="from" />
        </div>
        <div class="field">
          <label>To date</label>
          <input type="date" name="xto" [(ngModel)]="to" />
        </div>
        <button class="btn btn-outline" (click)="load()" [disabled]="loading">
          @if (loading) { <span class="spinner"></span> } Apply
        </button>
        <span class="toolbar-spacer"></span>
        <button class="btn btn-outline" (click)="exportCsv()" [disabled]="exporting"
                title="Download this range as a CSV file">
          @if (exporting) { <span class="spinner"></span> } @else { <app-icon name="download" [size]="15" /> }
          Export CSV
        </button>
        @if (auth.isFullAdmin()) {
          <button class="btn btn-primary" (click)="openAdd()">
            <app-icon name="plus" [size]="15" [stroke]="2.4" /> Add sale
          </button>
        }
      </div>

      <div class="range-total">
        Selected range: <b>₹{{ rangeTotal() | number: '1.0-2' }}</b>
        <span class="muted">· {{ list.length }} {{ list.length === 1 ? 'sale' : 'sales' }}</span>
      </div>

      @if (error) { <div class="alert alert-error">{{ error }}</div> }

      @if (loading) {
        <div class="skeleton" style="height: 150px;"></div>
      } @else if (list.length === 0) {
        <p class="muted">No walk-in sales in this range yet.</p>
      } @else {
        <div class="tbl-wrap">
          <table class="tbl" style="min-width: 700px;">
            <thead>
              <tr>
                <th>Date</th><th>Customer</th><th>Item</th>
                <th class="num">Qty</th><th class="num">Rate (₹)</th><th class="num">Total (₹)</th>
                <th>Mode</th><th>Note</th>
                @if (auth.isFullAdmin()) { <th></th> }
              </tr>
            </thead>
            <tbody>
              @for (x of list; track x.id) {
                <tr>
                  <td class="nowrap">{{ x.saleDate }}</td>
                  <td>{{ x.customerName }}</td>
                  <td>{{ x.productName }}</td>
                  <td class="num">{{ x.quantity | number: '1.0-2' }} {{ x.unit }}</td>
                  <td class="num">{{ x.rate | number: '1.0-2' }}</td>
                  <td class="num"><b>{{ x.total | number: '1.0-2' }}</b></td>
                  <td><span class="badge badge-ok">{{ x.paymentMode }}</span></td>
                  <td class="muted">{{ x.note || '—' }}</td>
                  @if (auth.isFullAdmin()) {
                    <td class="right">
                      <button class="btn btn-danger btn-sm" (click)="remove(x)">
                        <app-icon name="trash" [size]="14" /> Delete
                      </button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <!-- ============ add-sale modal ============ -->
    @if (addOpen) {
      <div class="modal-back" (click)="addOpen = false">
        <div class="modal" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
          <div class="modal-head">
            <h3>New walk-in sale</h3>
            <button type="button" class="modal-close" (click)="addOpen = false" aria-label="Close">
              <app-icon name="close" [size]="18" [stroke]="2" />
            </button>
          </div>

          @if (modalError) { <div class="alert alert-error">{{ modalError }}</div> }

          <div class="form-grid">
            <div class="field">
              <label>Item <span class="req">*</span></label>
              <select name="xsprod" [(ngModel)]="form.productId" (ngModelChange)="onProductChange()">
                <option value="">— Custom item —</option>
                @for (p of products; track p.id) {
                  <option [value]="p.id">{{ p.name }} — ₹{{ p.price }}/{{ p.unit }}</option>
                }
              </select>
            </div>
            @if (!form.productId) {
              <div class="field">
                <label>Item name <span class="req">*</span></label>
                <input name="xsname" [(ngModel)]="form.productName" placeholder="e.g. Kulhad Chai" />
              </div>
              <div class="field">
                <label>Unit</label>
                <input name="xsunit" [(ngModel)]="form.unit" placeholder="e.g. Cup, Kg, Litre" />
              </div>
            }
            <div class="field">
              <label>Quantity <span class="req">*</span></label>
              <div class="qty-row">
                @for (q of quickQty; track q) {
                  <button type="button" class="qchip" [class.on]="form.quantity === q"
                          (click)="form.quantity = q">{{ q }}</button>
                }
                <input type="number" name="xsqty" [(ngModel)]="form.quantity" min="0.5" step="0.5" />
              </div>
            </div>
            <div class="field">
              <label>Rate (₹ / {{ form.unit || 'unit' }}) <span class="req">*</span></label>
              <input type="number" name="xsrate" [(ngModel)]="form.rate" min="0" step="0.5" />
            </div>
            <div class="field">
              <label>Total</label>
              <div class="calc-total">
                ₹{{ lineTotal() | number: '1.0-2' }}
                <span class="muted">{{ form.quantity || 0 }} × ₹{{ form.rate || 0 }}</span>
              </div>
            </div>
            <div class="field">
              <label>Customer name</label>
              <input name="xscust" [(ngModel)]="form.customerName" placeholder="Walk-in customer" />
            </div>
            <div class="field">
              <label>Payment mode</label>
              <select name="xsmode" [(ngModel)]="form.paymentMode">
                <option>Cash</option>
                <option>UPI</option>
              </select>
            </div>
            <div class="field">
              <label>Sale date</label>
              <input type="date" name="xsdate" [(ngModel)]="form.saleDate" />
            </div>
            <div class="field field-wide">
              <label>Note</label>
              <input name="xsnote" [(ngModel)]="form.note" placeholder="Optional" />
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn btn-ghost" (click)="addOpen = false">Cancel</button>
            <button class="btn btn-primary" (click)="save()" [disabled]="saving">
              @if (saving) { <span class="spinner"></span> } Save sale
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .toolbar-spacer { flex: 1; }
    .range-total {
      margin-bottom: 14px; font-size: 0.92rem; color: var(--ivory);
      background: rgba(201, 162, 39, 0.07); border: 1px solid var(--line-soft);
      border-radius: 10px; padding: 9px 14px; width: fit-content;
    }
    .range-total b { color: var(--gold-2); font-family: var(--font-display); font-size: 1.05rem; }
    .nowrap { white-space: nowrap; }
    .qty-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .qty-row input { width: 78px; text-align: center; }
    .qchip {
      min-width: 36px; padding: 7px 9px; border-radius: 999px; cursor: pointer;
      border: 1px solid var(--line-soft); background: #100E08; color: var(--muted);
      font-size: 0.8rem; font-weight: 700;
    }
    .qchip:hover { border-color: var(--gold); color: var(--gold-2); }
    .qchip.on { background: var(--gold-grad); border-color: transparent; color: #171307; }
    .stat-sub { font-size: 0.76rem; color: var(--muted); margin-top: 2px; }
  `]
})
export class ExtraSalesComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  summary: ExtraSummary | null = null;
  list: ExtraSale[] = [];
  products: Product[] = [];
  from = monthStart();
  to = isoDate();
  loading = true;
  error = '';

  addOpen = false;
  saving = false;
  modalError = '';
  quickQty = [0.5, 1, 1.5, 2];
  form = this.blank();

  ngOnInit() {
    this.load();
    this.loadSummary();
    this.api.getAdminProducts().subscribe({ next: p => (this.products = p.filter(x => x.available)) });
  }

  private blank() {
    return {
      productId: '', productName: '', unit: '', quantity: 1, rate: 0,
      customerName: '', paymentMode: 'Cash', saleDate: isoDate(), note: ''
    };
  }

  load() {
    this.loading = true;
    this.error = '';
    this.api.getExtraSales(this.from, this.to).subscribe({
      next: list => { this.list = list; this.loading = false; },
      error: err => { this.error = err?.error?.error || 'Could not load walk-in sales.'; this.loading = false; }
    });
  }

  loadSummary() {
    this.api.getExtraSummary().subscribe({ next: s => (this.summary = s) });
  }

  rangeTotal(): number {
    return Math.round(this.list.reduce((sum, x) => sum + x.total, 0) * 100) / 100;
  }

  onProductChange() {
    const p = this.products.find(x => x.id === this.form.productId);
    if (p) {
      this.form.productName = p.name;
      this.form.unit = p.unit;
      this.form.rate = p.price;
    } else {
      this.form.productName = '';
      this.form.unit = '';
      this.form.rate = 0;
    }
  }

  lineTotal(): number {
    return Math.round((this.form.quantity || 0) * (this.form.rate || 0) * 100) / 100;
  }

  openAdd() {
    this.form = this.blank();
    this.modalError = '';
    this.addOpen = true;
  }

  save() {
    this.modalError = '';
    if (!this.form.productId && !this.form.productName.trim()) {
      this.modalError = 'Pick a product or type the item name.';
      return;
    }
    if (!this.form.quantity || this.form.quantity <= 0) { this.modalError = 'Quantity must be greater than 0.'; return; }
    if (!this.form.rate || this.form.rate <= 0) { this.modalError = 'Rate must be greater than 0.'; return; }

    this.saving = true;
    this.api.addExtraSale({
      productId: this.form.productId || undefined,
      productName: this.form.productName.trim() || undefined,
      unit: this.form.unit?.trim() || undefined,
      quantity: this.form.quantity,
      rate: this.form.rate,
      customerName: this.form.customerName?.trim() || undefined,
      paymentMode: this.form.paymentMode,
      saleDate: this.form.saleDate,
      note: this.form.note?.trim() || undefined
    } as any).subscribe({
      next: x => {
        this.saving = false;
        this.addOpen = false;
        this.toast.success(`Sale saved: ${x.productName} — ₹${x.total} (${x.paymentMode}).`);
        this.load();
        this.loadSummary();
      },
      error: err => {
        this.saving = false;
        this.modalError = err?.error?.error || 'Could not save the sale.';
      }
    });
  }

  remove(x: ExtraSale) {
    if (!confirm(`Delete this sale — ${x.productName} ₹${x.total}?`)) return;
    this.api.deleteExtraSale(x.id!).subscribe({
      next: () => {
        this.toast.info('Sale deleted.');
        this.load();
        this.loadSummary();
      },
      error: err => this.toast.error(err?.error?.error || 'Delete failed.')
    });
  }

  exporting = false;

  exportCsv() {
    if (this.exporting) return;
    this.exporting = true;
    this.api.downloadCsv('extra-sales.csv', { from: this.from, to: this.to }).subscribe({
      next: blob => { saveBlob(blob, `extra-sales_${this.from}_to_${this.to}.csv`); this.exporting = false; },
      error: () => {
        this.exporting = false;
        this.toast.error('Could not export the CSV.');
      }
    });
  }
}
