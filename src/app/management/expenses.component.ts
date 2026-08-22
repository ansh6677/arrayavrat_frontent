import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../core/api.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { AuthService } from '../core/auth.service';
import { isoDate, monthStart } from '../core/farm';
import { Expense } from '../core/models';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <h2>Expenses</h2>
    <p class="mgmt-sub">Track daily farm spending — feed, labour, transport and more. It all counts into the dashboard profit.</p>

    <div class="stat-grid mb">
      <div class="stat stat-gold">
        <div class="stat-label">Total expense (selected period)</div>
        <div class="stat-value">₹{{ sum() | number: '1.0-2' }}</div>
        <div class="hint">{{ expenses.length }} records</div>
      </div>
    </div>

    <div class="panel">
      <div class="toolbar">
        <div class="field">
          <label for="from">From</label>
          <input id="from" type="date" name="from" [(ngModel)]="from" />
        </div>
        <div class="field">
          <label for="to">To</label>
          <input id="to" type="date" name="to" [(ngModel)]="to" />
        </div>
        <button class="btn btn-outline" (click)="load()" [disabled]="loading">
          @if (loading) { <span class="spinner"></span> } Apply
        </button>
        @if (auth.isFullAdmin()) {
          <button class="btn btn-primary push" (click)="openAdd()">
            <app-icon name="plus" [size]="15" [stroke]="2.4" /> Add expense
          </button>
        }
      </div>

      @if (error) { <div class="alert alert-error">{{ error }}</div> }

      @if (expenses.length === 0 && !loading) {
        <p class="muted">No expenses recorded for this period.</p>
      } @else if (expenses.length > 0) {
        <div class="tbl-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>Date</th><th>Category</th><th>Note</th>
                <th class="num">Qty</th><th class="num">Rate (₹)</th><th class="num">Amount (₹)</th>
                @if (auth.isFullAdmin()) { <th></th> }
              </tr>
            </thead>
            <tbody>
              @for (x of expenses; track x.id) {
                <tr>
                  <td>{{ x.expenseDate | date: 'dd MMM yyyy' }}</td>
                  <td><span class="badge badge-gold">{{ x.category }}</span></td>
                  <td>{{ x.note || '—' }}</td>
                  <td class="num">{{ (x.quantity || 1) | number: '1.0-2' }} {{ x.unit }}</td>
                  <td class="num">{{ (x.unitAmount || x.amount) | number: '1.0-2' }}</td>
                  <td class="num">{{ x.amount | number: '1.0-2' }}</td>
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
            <tfoot>
              <tr>
                <td colspan="5">Total</td>
                <td class="num">₹{{ sum() | number: '1.0-2' }}</td>
                @if (auth.isFullAdmin()) { <td></td> }
              </tr>
            </tfoot>
          </table>
        </div>
      }
    </div>

    <!-- ============ Add expense modal ============ -->
    @if (addOpen) {
      <div class="modal-back" (click)="addOpen = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>Add expense</h3>
            <button type="button" class="modal-close" (click)="addOpen = false" aria-label="Close">
              <app-icon name="close" [size]="16" [stroke]="2.2" />
            </button>
          </div>
          @if (modalError) { <div class="alert alert-error">{{ modalError }}</div> }
          <div class="form-grid">
            <div class="field">
              <label>Category <span class="req">*</span></label>
              <select name="xcat" [(ngModel)]="form.category">
                @for (c of categories; track c) { <option [value]="c">{{ c }}</option> }
              </select>
            </div>
            <div class="field">
              <label>Quantity <span class="req">*</span></label>
              <input type="number" name="xqty" [(ngModel)]="form.quantity" min="0.5" step="0.5" placeholder="e.g. 5" />
            </div>
            <div class="field">
              <label>Unit</label>
              <input name="xunit" [(ngModel)]="form.unit" placeholder="e.g. sack, litre, hour" />
            </div>
            <div class="field">
              <label>Rate per unit (₹) <span class="req">*</span></label>
              <input type="number" name="xrate" [(ngModel)]="form.unitAmount" min="1" step="1" placeholder="e.g. 500" />
            </div>
            <div class="field">
              <label>Total amount</label>
              <div class="calc-total">
                ₹{{ lineTotal() | number: '1.0-2' }}
                <span class="muted">{{ form.quantity || 0 }} × ₹{{ form.unitAmount || 0 }}</span>
              </div>
            </div>
            <div class="field">
              <label>Date</label>
              <input type="date" name="xdate" [(ngModel)]="form.expenseDate" />
            </div>
            <div class="field field-wide">
              <label>Note</label>
              <input name="xnote" [(ngModel)]="form.note" placeholder="e.g. 5 sacks of fodder" />
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" (click)="addOpen = false">Cancel</button>
            <button class="btn btn-primary" (click)="save()" [disabled]="saving">
              @if (saving) { <span class="spinner"></span> } Save expense
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class ExpensesComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  auth = inject(AuthService);

  expenses: Expense[] = [];
  from = monthStart();
  to = isoDate();

  categories = [
    'Cattle Feed',
    'Labour / Salary',
    'Medicine & Vet',
    'Transport / Fuel',
    'Electricity',
    'Equipment',
    'Rent',
    'Other'
  ];

  loading = false;
  saving = false;
  addOpen = false;
  msg = '';
  error = '';
  modalError = '';

  form = {
    category: 'Cattle Feed',
    quantity: 1 as number | null,
    unit: '',
    unitAmount: null as number | null,
    expenseDate: isoDate(),
    note: ''
  };

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this.api.getExpenses({ from: this.from, to: this.to }).subscribe({
      next: list => {
        this.expenses = list;
        this.loading = false;
      },
      error: err => {
        this.error = err?.error?.error || 'Could not load expenses.';
        this.loading = false;
      }
    });
  }

  sum(): number {
    return Math.round(this.expenses.reduce((s, x) => s + x.amount, 0) * 100) / 100;
  }

  openAdd() {
    this.form = { category: 'Cattle Feed', quantity: 1, unit: '', unitAmount: null, expenseDate: isoDate(), note: '' };
    this.modalError = '';
    this.addOpen = true;
  }

  /** Live quantity x rate shown in the form and sent as the total. */
  lineTotal(): number {
    const qty = this.form.quantity || 0;
    const rate = this.form.unitAmount || 0;
    return Math.round(qty * rate * 100) / 100;
  }

  save() {
    this.modalError = '';
    if (!this.form.quantity || this.form.quantity <= 0) {
      this.modalError = 'Enter a quantity greater than 0.';
      return;
    }
    if (!this.form.unitAmount || this.form.unitAmount <= 0) {
      this.modalError = 'Enter a rate greater than 0.';
      return;
    }
    this.saving = true;
    this.api.addExpense({
      category: this.form.category,
      quantity: this.form.quantity,
      unit: this.form.unit?.trim() || undefined,
      unitAmount: this.form.unitAmount,
      amount: this.lineTotal(),
      expenseDate: this.form.expenseDate,
      note: this.form.note || undefined
    }).subscribe({
      next: x => {
        this.saving = false;
        this.addOpen = false;
        this.toast.success(`Expense saved: ${x.category} — ₹${x.amount}`);
        this.load();
      },
      error: err => {
        this.saving = false;
        this.modalError = err?.error?.error || 'Could not save the expense.';
      }
    });
  }

  async remove(x: Expense) {
    const ok = await this.confirm.ask({
      title: 'Delete this expense?',
      message: `${x.category} — ₹${x.amount}. It will stop counting towards the dashboard profit.`,
      confirmLabel: 'Delete expense'
    });
    if (!ok) return;
    this.api.deleteExpense(x.id!).subscribe({
      next: () => {
        this.toast.success('Expense deleted.');
        this.load();
      },
      error: err => this.toast.error(err?.error?.error || 'Delete failed.')
    });
  }
}
