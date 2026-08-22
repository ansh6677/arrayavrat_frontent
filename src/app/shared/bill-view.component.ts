import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Bill, DailyEntry, Payment } from '../core/models';
import { FARM, niceDate } from '../core/farm';
import { downloadBillPdf } from '../core/pdf';
import { IconComponent } from './icon.component';

/**
 * Ledger-style bill card.
 * - Customer dashboard: view + PDF/print only
 * - Admin customer page: canManage=true → delete actions too
 */
@Component({
  selector: 'app-bill-view',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="khata print-area">
      <div class="khata-head">
        <div class="brand">
          <img [src]="farm.logo" alt="" />
          <div>
            <h3>{{ farm.name }}</h3>
            <div class="sub">{{ farm.tagline2 }}</div>
            <div class="sub">{{ farm.address }}</div>
            <div class="sub">📞 {{ farm.phone }}</div>
          </div>
        </div>
        <div class="khata-meta">
          <b>{{ bill.customerName }}</b>
          <span>{{ bill.phone }}</span><br />
          @if (bill.address) { <span>{{ bill.address }}</span><br /> }
          <span class="muted">Bill period: {{ bill.from | date: 'dd MMM yyyy' }} — {{ bill.to | date: 'dd MMM yyyy' }}</span>
        </div>
      </div>

      <div class="khata-section-title">Purchases</div>
      @if (bill.entries.length > 0) {
        <div class="tbl-wrap" style="border: none; border-radius: 0; background: transparent;">
          <table class="tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th class="num">Qty</th>
                <th class="num">Rate (₹)</th>
                <th class="num">Total (₹)</th>
                @if (canManage) { <th class="no-print"></th> }
              </tr>
            </thead>
            <tbody>
              @for (e of bill.entries; track e.id) {
                <tr>
                  <td>{{ e.entryDate | date: 'dd MMM yyyy' }}</td>
                  <td>
                    {{ e.productName }}
                    @if (e.paid) { <span class="chip-paid">✓ Paid</span> } @else { <span class="chip-udhaar">Credit</span> }
                    @if (e.note) { <span class="muted">· {{ e.note }}</span> }
                  </td>
                  <td class="num">{{ e.quantity | number: '1.0-2' }} {{ e.unit }}</td>
                  <td class="num">{{ e.rate | number: '1.0-2' }}</td>
                  <td class="num">{{ e.total | number: '1.0-2' }}</td>
                  @if (canManage) {
                    <td class="right no-print">
                      <button class="btn btn-danger btn-sm" (click)="removeEntry.emit(e)">✕</button>
                    </td>
                  }
                </tr>
              }
            </tbody>
            <tfoot>
              <tr>
                <td [attr.colspan]="canManage ? 4 : 4">Total purchases (this period)</td>
                <td class="num">₹{{ bill.periodTotal | number: '1.0-2' }}</td>
                @if (canManage) { <td class="no-print"></td> }
              </tr>
            </tfoot>
          </table>
        </div>
      } @else {
        <div class="khata-empty">No purchase entries in this period.</div>
      }

      @if (bill.payments.length > 0) {
        <div class="khata-section-title">Payments received (this period)</div>
        <div class="tbl-wrap" style="border: none; border-radius: 0; background: transparent;">
          <table class="tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Mode</th>
                <th>Note</th>
                <th class="num">Amount (₹)</th>
                @if (canManage) { <th class="no-print"></th> }
              </tr>
            </thead>
            <tbody>
              @for (p of bill.payments; track p.id) {
                <tr>
                  <td>{{ p.paymentDate | date: 'dd MMM yyyy' }}</td>
                  <td>{{ p.mode }}</td>
                  <td>{{ p.note || '—' }}</td>
                  <td class="num">{{ p.amount | number: '1.0-2' }}</td>
                  @if (canManage) {
                    <td class="right no-print">
                      <button class="btn btn-danger btn-sm" (click)="removePayment.emit(p)">✕</button>
                    </td>
                  }
                </tr>
              }
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3">Total paid (this period)</td>
                <td class="num">₹{{ bill.periodPaid | number: '1.0-2' }}</td>
                @if (canManage) { <td class="no-print"></td> }
              </tr>
            </tfoot>
          </table>
        </div>
      }

      <div class="khata-totals">
        <div>
          <div class="t-label">Period purchases</div>
          <div class="t-value">₹{{ bill.periodTotal | number: '1.0-2' }}</div>
        </div>
        <div>
          <div class="t-label">Total purchases (all time)</div>
          <div class="t-value">₹{{ bill.lifetimePurchases | number: '1.0-2' }}</div>
        </div>
        <div>
          <div class="t-label">Total paid (all time)</div>
          <div class="t-value">₹{{ bill.lifetimePaid | number: '1.0-2' }}</div>
        </div>
        <div class="t-out" [class.clear]="bill.outstanding <= 0">
          <div class="t-label">Outstanding</div>
          <div class="t-value">₹{{ bill.outstanding | number: '1.0-2' }}</div>
        </div>
      </div>
    </div>

    <div class="mt no-print right bill-actions">
      <button class="btn btn-primary" (click)="pdf()">
        <app-icon name="download" [size]="16" /> Download PDF
      </button>
      <button class="btn btn-wa" (click)="shareOnWhatsApp()"
              [title]="'Send this bill summary to ' + bill.phone">
        <app-icon name="whatsapp" [size]="17" /> Share on WhatsApp
      </button>
    </div>
  `,
  styles: [`
    .bill-actions { display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap; }

    .chip-paid, .chip-udhaar {
      display: inline-block; margin-left: 8px; padding: 2px 9px;
      border-radius: 999px; font-size: 0.66rem; font-weight: 800;
      letter-spacing: 0.06em; text-transform: uppercase; vertical-align: 1px;
    }
    .chip-paid { background: rgba(122, 186, 96, 0.16); color: #8FC777; border: 1px solid rgba(122, 186, 96, 0.4); }
    .chip-udhaar { background: rgba(228, 199, 102, 0.12); color: var(--gold-2); border: 1px solid var(--line); }
  `]
})
export class BillViewComponent {
  @Input({ required: true }) bill!: Bill;
  @Input() canManage = false;
  @Output() removeEntry = new EventEmitter<DailyEntry>();
  @Output() removePayment = new EventEmitter<Payment>();

  farm = FARM;

  pdf() {
    downloadBillPdf(this.bill);
  }

  /**
   * Sends the bill summary to the customer's own WhatsApp — the number they
   * registered with. The PDF stays a separate download the farm can attach.
   */
  shareOnWhatsApp() {
    const b = this.bill;
    const lines: string[] = [];
    lines.push(`*${FARM.name}*`);
    lines.push(FARM.tagline2);
    lines.push('');
    lines.push(`Bill for: ${b.customerName}`);
    lines.push(`Period: ${niceDate(b.from)} to ${niceDate(b.to)}`);
    lines.push('');

    if (b.entries.length > 0) {
      lines.push('*Purchases*');
      b.entries.forEach(e => {
        lines.push(`${niceDate(e.entryDate)} — ${e.productName} ${e.quantity} ${e.unit || ''} x ₹${e.rate} = ₹${e.total}`);
      });
      lines.push('');
    }

    lines.push(`Total purchases: ₹${b.periodTotal}`);
    lines.push(`Paid this period: ₹${b.periodPaid}`);
    lines.push(`*Outstanding: ₹${b.outstanding}*`);
    lines.push('');
    lines.push(b.outstanding > 0
      ? 'Kindly clear the outstanding amount at your convenience. Thank you!'
      : 'Your account is fully settled. Thank you!');

    // Indian numbers are stored as 10 digits; WhatsApp needs the country code.
    const digits = String(b.phone || '').replace(/\D/g, '');
    const number = digits.length === 10 ? `91${digits}` : digits;

    window.open(`https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  }
}
