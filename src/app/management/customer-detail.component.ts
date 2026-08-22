import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ApiService } from '../core/api.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { AuthService } from '../core/auth.service';
import { isoDate, monthStart } from '../core/farm';
import { Bill, DailyEntry, Payment, Product, UserInfo } from '../core/models';
import { BillViewComponent } from '../shared/bill-view.component';
import { IconComponent } from '../shared/icon.component';

/**
 * A customer's complete page:
 * - "+ Daily Entry" popup (pick from the product list → rate auto-fills → live total)
 * - "+ Payment" popup
 * - Date-range bill + Download PDF + Print
 * - Edit customer (full admin)
 */
@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BillViewComponent, IconComponent],
  template: `
    <div class="no-print">
      <a routerLink="/management/panel/customers" class="muted">← All customers</a>

      @if (customer) {
        <div class="cd-head">
          <div>
            <h2>{{ customer.name }}</h2>
            <p class="mgmt-sub cd-meta">
              📞 {{ customer.phone }}
              @if (customer.address) { · 📍 {{ customer.address }} }
            </p>
            @if (bill) {
              <span class="badge" [class.badge-due]="bill.outstanding > 0" [class.badge-clear]="bill.outstanding <= 0">
                Outstanding: ₹{{ bill.outstanding | number: '1.0-2' }}
              </span>
            }
            @if (!customer.active) { <span class="badge badge-off cd-off">Inactive</span> }
          </div>
          <div class="cd-actions">
            @if (auth.isFullAdmin()) {
              <button class="btn btn-primary" (click)="openEntry()">
                <app-icon name="plus" [size]="15" [stroke]="2.4" /> Daily Entry
              </button>
              <button class="btn btn-gold" (click)="openPayment()">
                <app-icon name="wallet" [size]="15" /> Payment
              </button>
              <button class="btn btn-outline" (click)="openEdit()">
                <app-icon name="edit" [size]="15" /> Edit customer
              </button>
            }
          </div>
        </div>
      }

      @if (error) { <div class="alert alert-error">{{ error }}</div> }

      <div class="panel">
        <div class="toolbar">
          <div class="field">
            <label for="from">From date</label>
            <input id="from" type="date" name="from" [(ngModel)]="from" />
          </div>
          <div class="field">
            <label for="to">To date</label>
            <input id="to" type="date" name="to" [(ngModel)]="to" />
          </div>
          <button class="btn btn-outline" (click)="loadBill()" [disabled]="loading">
            @if (loading) { <span class="spinner"></span> } View bill
          </button>
        </div>
      </div>
    </div>

    @if (bill) {
      <app-bill-view
        [bill]="bill"
        [canManage]="auth.isFullAdmin()"
        (removeEntry)="deleteEntry($event)"
        (removePayment)="deletePayment($event)" />
    }

    <!-- ================= Daily Entry popup ================= -->
    @if (entryOpen) {
      <div class="modal-back" (click)="entryOpen = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>Daily entry — {{ customer?.name }}</h3>
            <button type="button" class="modal-close" (click)="entryOpen = false" aria-label="Close">
              <app-icon name="close" [size]="16" [stroke]="2.2" />
            </button>
          </div>
          @if (modalError) { <div class="alert alert-error">{{ modalError }}</div> }
          <div class="form-grid">
            <div class="field">
              <label>From date <span class="req">*</span></label>
              <input type="date" name="efrom" [(ngModel)]="entryForm.from" (ngModelChange)="syncRange()" />
            </div>
            <div class="field">
              <label>To date <span class="req">*</span></label>
              <input type="date" name="eto" [(ngModel)]="entryForm.to" />
              <span class="hint">
                {{ dayCount() }} {{ dayCount() === 1 ? 'day' : 'days' }} — each selected product is
                added once per day at the quantity you set.
              </span>
            </div>

            <div class="field field-wide">
              <label>Products <span class="req">*</span></label>
              <div class="sheet">
                @for (p of products; track p.id) {
                  <div class="sheet-row" [class.on]="isPicked(p)">
                    <label class="pick">
                      <input type="checkbox" [checked]="isPicked(p)" (change)="togglePick(p)"
                             [attr.aria-label]="'Select ' + p.name" />
                      <span class="pick-body">
                        <span class="pick-name">{{ p.name }}</span>
                        <span class="pick-rate">₹{{ p.price | number: '1.0-2' }} / {{ p.unit }}</span>
                      </span>
                    </label>

                    <div class="pick-qty">
                      @for (q of quickQty; track q) {
                        <button type="button" class="qchip" [class.on]="isPicked(p) && qtyOf(p) === q"
                                (click)="setQty(p, q)">{{ q }}</button>
                      }
                      <input type="number" class="qbox" min="0" step="0.5"
                             [ngModel]="qtyOf(p)" [ngModelOptions]="{ standalone: true }"
                             (ngModelChange)="setQty(p, $event)"
                             [attr.aria-label]="'Quantity for ' + p.name" />
                      <span class="qunit">{{ p.unit }}</span>
                    </div>

                    <div class="pick-line">
                      @if (isPicked(p)) { ₹{{ lineTotal(p) | number: '1.0-2' }} } @else { — }
                    </div>
                  </div>
                }
              </div>
            </div>

            <div class="field field-wide">
              <label>Note (optional)</label>
              <input name="enote" [(ngModel)]="entryForm.note" placeholder="e.g. evening delivery" />
            </div>
            <div class="field field-wide">
              <label>Payment status</label>
              <div class="seg">
                <button type="button" [class.on]="!entryForm.paid" (click)="entryForm.paid = false">
                  Unpaid <span class="seg-sub">added to balance</span>
                </button>
                <button type="button" class="paid" [class.on]="entryForm.paid" (click)="entryForm.paid = true">
                  Paid <span class="seg-sub">received now</span>
                </button>
              </div>
              @if (entryForm.paid) {
                <div class="paid-row">
                  <span>Received via</span>
                  <select name="epmode" [(ngModel)]="entryForm.paymentMode">
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Other</option>
                  </select>
                  <span class="hint">
                    A payment will be recorded automatically for every entry created
                    (₹{{ entryTotal() | number: '1.0-2' }} in total).
                  </span>
                </div>
              } @else {
                <span class="hint">Amount will be added to the customer's outstanding balance.</span>
              }
            </div>
          </div>
          <div class="modal-actions">
            <div class="m-total m-aside">
              {{ pickedCount() }} product{{ pickedCount() === 1 ? '' : 's' }} × {{ dayCount() }}
              {{ dayCount() === 1 ? 'day' : 'days' }} · Total: ₹{{ entryTotal() | number: '1.0-2' }}
            </div>
            <button class="btn btn-ghost" (click)="entryOpen = false">Cancel</button>
            <button class="btn btn-primary" (click)="saveEntry()" [disabled]="saving">
              @if (saving) { <span class="spinner"></span> } Save entry
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ================= Payment popup ================= -->
    @if (paymentOpen) {
      <div class="modal-back" (click)="paymentOpen = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>Record payment — {{ customer?.name }}</h3>
            <button type="button" class="modal-close" (click)="paymentOpen = false" aria-label="Close">
              <app-icon name="close" [size]="16" [stroke]="2.2" />
            </button>
          </div>
          @if (modalError) { <div class="alert alert-error">{{ modalError }}</div> }
          @if (bill) {
            <p class="m-note">Current outstanding: <b>₹{{ bill.outstanding | number: '1.0-2' }}</b></p>
          }
          <div class="form-grid">
            <div class="field">
              <label>Amount (₹) <span class="req">*</span></label>
              <input type="number" name="pamt" [(ngModel)]="paymentForm.amount" min="1" step="1" placeholder="e.g. 1500" />
            </div>
            <div class="field">
              <label>Payment date</label>
              <input type="date" name="pdate" [(ngModel)]="paymentForm.paymentDate" />
            </div>
            <div class="field">
              <label>Mode</label>
              <select name="pmode" [(ngModel)]="paymentForm.mode">
                <option>Cash</option>
                <option>UPI</option>
                <option>Bank</option>
                <option>Other</option>
              </select>
            </div>
            <div class="field">
              <label>Note</label>
              <input name="pnote" [(ngModel)]="paymentForm.note" placeholder="Optional" />
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" (click)="paymentOpen = false">Cancel</button>
            <button class="btn btn-gold" (click)="savePayment()" [disabled]="saving">
              @if (saving) { <span class="spinner"></span> } Save payment
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ================= Edit customer popup ================= -->
    @if (editOpen) {
      <div class="modal-back" (click)="editOpen = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>Edit customer</h3>
            <button type="button" class="modal-close" (click)="editOpen = false" aria-label="Close">
              <app-icon name="close" [size]="16" [stroke]="2.2" />
            </button>
          </div>
          @if (modalError) { <div class="alert alert-error">{{ modalError }}</div> }
          <div class="form-grid">
            <div class="field">
              <label>Name <span class="req">*</span></label>
              <input name="cname" [(ngModel)]="editForm.name" />
            </div>
            <div class="field">
              <label>Phone (login id) <span class="req">*</span></label>
              <input name="cphone" [(ngModel)]="editForm.phone" />
            </div>
            <div class="field">
              <label>Email</label>
              <input name="cemail" [(ngModel)]="editForm.email" />
            </div>
            <div class="field">
              <label>Address</label>
              <input name="caddress" [(ngModel)]="editForm.address" />
            </div>
            <div class="field">
              <label>New password</label>
              <input name="cpass" [(ngModel)]="editForm.password" placeholder="Blank = no change" />
            </div>
            <div class="field">
              <label>Status</label>
              <select name="cactive" [(ngModel)]="editForm.active">
                <option [ngValue]="true">Active</option>
                <option [ngValue]="false">Inactive (login blocked)</option>
              </select>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" (click)="editOpen = false">Cancel</button>
            <button class="btn btn-primary" (click)="saveEdit()" [disabled]="saving">
              @if (saving) { <span class="spinner"></span> } Update
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* Entry sheet: every product on screen at once, with a checkbox and the
       quantities that actually get used day to day. */
    .sheet { border: 1px solid var(--line-soft); border-radius: 12px; overflow: hidden; }
    .sheet-row {
      display: grid; grid-template-columns: minmax(150px, 1.5fr) auto 78px;
      gap: 12px; align-items: center;
      padding: 10px 14px; border-bottom: 1px solid var(--line-soft);
      transition: background 0.15s ease;
    }
    .sheet-row:last-child { border-bottom: none; }
    .sheet-row.on { background: rgba(201, 162, 39, 0.08); }
    .pick { display: flex; align-items: center; gap: 10px; cursor: pointer; min-width: 0; }
    .pick input { width: 17px; height: 17px; accent-color: #C9A227; cursor: pointer; flex-shrink: 0; }
    .pick-body { min-width: 0; }
    .pick-name { display: block; font-weight: 600; color: var(--ivory); font-size: 0.92rem; }
    .pick-rate { display: block; font-size: 0.76rem; color: var(--muted); }
    .pick-qty { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
    .qchip {
      min-width: 34px; padding: 5px 8px; border-radius: 999px; cursor: pointer;
      border: 1px solid var(--line-soft); background: #100E08; color: var(--muted);
      font-size: 0.78rem; font-weight: 700;
    }
    .qchip:hover { border-color: var(--gold); color: var(--gold-2); }
    .qchip.on { background: var(--gold-grad); border-color: transparent; color: #171307; }
    .qbox { width: 62px; padding: 6px 8px; text-align: center; font-size: 0.84rem; }
    .qunit { font-size: 0.74rem; color: var(--muted); min-width: 34px; }
    .pick-line { text-align: right; font-weight: 700; color: var(--gold-2); font-size: 0.88rem; }
    @media (max-width: 620px) {
      .sheet-row { grid-template-columns: 1fr auto; }
      .pick-qty { grid-column: 1 / -1; }
      .pick-line { grid-column: 2; }
    }
    .cd-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin: 12px 0 18px; }
    .cd-actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .cd-meta { margin-bottom: 6px; }
    .cd-off { margin-left: 8px; }

    .seg { display: flex; gap: 8px; }
    .seg button {
      flex: 1; padding: 10px 12px; border-radius: 12px; cursor: pointer;
      background: #100E08; border: 1.5px solid var(--line-soft);
      color: var(--muted); font-weight: 700; font-size: 0.9rem;
      display: flex; flex-direction: column; align-items: center; gap: 2px;
      transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
    }
    .seg .seg-sub { font-size: 0.68rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.7; }
    .seg button.on { border-color: var(--gold); color: var(--gold-2); background: rgba(228, 199, 102, 0.09); }
    .seg button.paid.on { border-color: #6FAE58; color: #9ACE84; background: rgba(122, 186, 96, 0.1); }
    .paid-row { display: flex; align-items: center; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
    .paid-row select { width: auto; height: 40px; padding: 8px 34px 8px 12px; }
    .paid-row > span:first-child { font-size: 0.85rem; color: var(--muted); font-weight: 600; }
  `]
})
export class CustomerDetailComponent implements OnInit {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  auth = inject(AuthService);

  customerId = '';
  customer: UserInfo | null = null;
  products: Product[] = [];
  bill: Bill | null = null;

  from = monthStart();
  to = isoDate();

  loading = false;
  saving = false;
  msg = '';
  error = '';
  modalError = '';

  entryOpen = false;
  paymentOpen = false;
  editOpen = false;
  unit = '';

  entryForm = { from: isoDate(), to: isoDate(), note: '', paid: false, paymentMode: 'Cash' };

  /** productId -> quantity for the current basket (only picked products appear). */
  picked: Record<string, number> = {};
  quickQty = [0.5, 1, 1.5, 2];
  paymentForm = { amount: null as number | null, paymentDate: isoDate(), mode: 'Cash', note: '' };
  editForm: any = {};

  ngOnInit() {
    this.customerId = this.route.snapshot.paramMap.get('id') || '';
    this.api.getAdminProducts().subscribe({ next: p => (this.products = p.filter(x => x.available)) });
    this.loadCustomer();
    this.loadBill();
  }

  private loadCustomer() {
    this.api.getCustomers().subscribe({
      next: list => (this.customer = list.find(c => c.id === this.customerId) || null)
    });
  }

  loadBill() {
    if (!this.customerId || !this.from || !this.to) return;
    this.loading = true;
    this.error = '';
    this.api.getCustomerBill(this.customerId, this.from, this.to).subscribe({
      next: bill => {
        this.bill = bill;
        this.loading = false;
      },
      error: err => {
        this.error = err?.error?.error || 'Could not load the bill.';
        this.loading = false;
      }
    });
  }

  // ---------------- Daily entry ----------------

  openEntry() {
    this.entryForm = { from: isoDate(), to: isoDate(), note: '', paid: false, paymentMode: 'Cash' };
    this.picked = {};
    this.modalError = '';
    this.entryOpen = true;
  }

  /** Keeps the range valid when the start date is moved past the end date. */
  syncRange() {
    if (this.entryForm.to < this.entryForm.from) {
      this.entryForm.to = this.entryForm.from;
    }
  }

  isPicked(p: Product): boolean {
    return this.picked[p.id!] !== undefined;
  }

  qtyOf(p: Product): number {
    return this.picked[p.id!] ?? 1;
  }

  togglePick(p: Product) {
    if (this.isPicked(p)) {
      delete this.picked[p.id!];
    } else {
      this.picked[p.id!] = 1;
    }
  }

  /** Tapping a quantity chip also selects the product. */
  setQty(p: Product, qty: number) {
    const value = Math.round((Number(qty) || 0) * 100) / 100;
    if (value <= 0) {
      delete this.picked[p.id!];
      return;
    }
    this.picked[p.id!] = value;
  }

  pickedCount(): number {
    return Object.keys(this.picked).length;
  }

  /** One product's cost for a single day. */
  lineTotal(p: Product): number {
    return Math.round(this.qtyOf(p) * p.price * 100) / 100;
  }

  /** Inclusive number of days in the selected range. */
  dayCount(): number {
    const from = new Date(this.entryForm.from);
    const to = new Date(this.entryForm.to);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || to < from) return 0;
    return Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
  }

  /** Grand total: every picked product, once per day in the range. */
  entryTotal(): number {
    const perDay = this.products
      .filter(p => this.isPicked(p))
      .reduce((sum, p) => sum + this.lineTotal(p), 0);
    return Math.round(perDay * this.dayCount() * 100) / 100;
  }

  saveEntry() {
    this.modalError = '';
    const items = this.products
      .filter(p => this.isPicked(p))
      .map(p => ({ productId: p.id!, quantity: this.qtyOf(p) }));

    if (items.length === 0) { this.modalError = 'Select at least one product.'; return; }
    if (!this.entryForm.from || !this.entryForm.to) { this.modalError = 'Choose both a From and a To date.'; return; }
    if (this.dayCount() <= 0) { this.modalError = 'The To date cannot be before the From date.'; return; }
    if (this.dayCount() > 92) { this.modalError = 'Please choose a range of 92 days or less.'; return; }

    this.saving = true;
    this.api.addEntriesBulk({
      customerId: this.customerId,
      from: this.entryForm.from,
      to: this.entryForm.to,
      note: this.entryForm.note || undefined,
      paid: this.entryForm.paid,
      paymentMode: this.entryForm.paid ? this.entryForm.paymentMode : undefined,
      items
    }).subscribe({
      next: res => {
        this.saving = false;
        this.entryOpen = false;
        const label = `${res.created} ${res.created === 1 ? 'entry' : 'entries'} across ${res.days} ${res.days === 1 ? 'day' : 'days'} — ₹${res.totalAmount}`;
        if (this.entryForm.paid) {
          this.toast.success(`Saved & marked paid: ${label}.`);
        } else {
          this.toast.info(`Saved on credit: ${label} added to outstanding.`);
        }
        this.loadBill();
      },
      error: err => {
        this.saving = false;
        this.modalError = err?.error?.error || 'Could not save the entries.';
      }
    });
  }

  async deleteEntry(e: DailyEntry) {
    const ok = await this.confirm.ask({
      title: 'Delete this entry?',
      message: `${e.productName} — ₹${e.total}. The customer's balance will be recalculated without it.`,
      confirmLabel: 'Delete entry'
    });
    if (!ok) return;
    this.api.deleteEntry(e.id!).subscribe({
      next: () => {
        this.toast.success('Entry deleted — totals updated.');
        this.loadBill();
      },
      error: err => this.toast.error(err?.error?.error || 'Delete failed.')
    });
  }

  // ---------------- Payment ----------------

  openPayment() {
    this.paymentForm = { amount: null, paymentDate: isoDate(), mode: 'Cash', note: '' };
    this.modalError = '';
    this.paymentOpen = true;
  }

  savePayment() {
    this.modalError = '';
    if (!this.paymentForm.amount || this.paymentForm.amount <= 0) { this.modalError = 'Please enter a valid amount.'; return; }

    this.saving = true;
    this.api.addPayment({
      customerId: this.customerId,
      amount: this.paymentForm.amount,
      paymentDate: this.paymentForm.paymentDate,
      mode: this.paymentForm.mode,
      note: this.paymentForm.note || undefined
    }).subscribe({
      next: p => {
        this.saving = false;
        this.paymentOpen = false;
        this.toast.success(`Payment saved: ₹${p.amount}. Outstanding updated.`);
        this.loadBill();
      },
      error: err => {
        this.saving = false;
        this.modalError = err?.error?.error || 'Could not save the payment.';
      }
    });
  }

  async deletePayment(p: Payment) {
    const ok = await this.confirm.ask({
      title: 'Delete this payment?',
      message: `₹${p.amount} will be removed, and the outstanding balance will go back up by that much.`,
      confirmLabel: 'Delete payment'
    });
    if (!ok) return;
    this.api.deletePayment(p.id!).subscribe({
      next: () => {
        this.toast.success('Payment deleted — totals updated.');
        this.loadBill();
      },
      error: err => this.toast.error(err?.error?.error || 'Delete failed.')
    });
  }

  // ---------------- Edit customer ----------------

  openEdit() {
    if (!this.customer) return;
    this.editForm = {
      name: this.customer.name,
      phone: this.customer.phone,
      email: this.customer.email || '',
      address: this.customer.address || '',
      password: '',
      active: this.customer.active
    };
    this.modalError = '';
    this.editOpen = true;
  }

  saveEdit() {
    this.modalError = '';
    if (!this.editForm.name?.trim() || !this.editForm.phone?.trim()) {
      this.modalError = 'Name and phone are required.';
      return;
    }
    this.saving = true;
    this.api.updateCustomer(this.customerId, this.editForm).subscribe({
      next: updated => {
        this.saving = false;
        this.editOpen = false;
        this.customer = updated;
        this.msg = 'Customer updated.';
        this.loadBill();
      },
      error: err => {
        this.saving = false;
        this.modalError = err?.error?.error || 'Could not update. Please try again.';
      }
    });
  }
}
