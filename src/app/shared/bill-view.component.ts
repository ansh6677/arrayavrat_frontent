import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Bill, DailyEntry, Payment } from '../core/models';
import { FARM, isProbablyPhone, monthLabel, niceDate, upiPayLink } from '../core/farm';
import { billPdfFile, downloadBillPdf } from '../core/pdf';
import { ToastService } from '../core/toast.service';
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
                <tr [class.old-pay-row]="!!p.forPeriod">
                  <td>{{ p.paymentDate | date: 'dd MMM yyyy' }}</td>
                  <td>{{ p.mode }}</td>
                  <td>
                    @if (p.forPeriod) {
                      <span class="old-pay-chip">OLD · {{ monthLabel(p.forPeriod) }}</span>
                    }
                    {{ p.note || '—' }}
                  </td>
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
        @if (bill.previousBalance > 0) {
          <div class="t-prev">
            <div class="t-label">Previous balance (till {{ dayBefore(bill.from) }})</div>
            <div class="t-value">₹{{ bill.previousBalance | number: '1.0-2' }}</div>
          </div>
        }
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

    <div class="mt no-print bill-actions">
      <!-- The Pay button belongs to the CUSTOMER side only: the customer
           dashboard sets showPay, the management pages never do — staff
           record payments through the "+ Payment" popup instead. -->
      @if (showPay && bill.outstanding > 0) {
        <button class="btn btn-wa pay-btn" (click)="payNow()"
                title="Opens your UPI app with ₹{{ bill.outstanding }} pre-filled">
          <app-icon name="wallet" [size]="16" /> Pay ₹{{ bill.outstanding | number: '1.0-2' }} via UPI
        </button>
      }
      <button class="btn btn-primary" (click)="pdf()" [disabled]="pdfBusy">
        @if (pdfBusy) { <span class="spinner"></span> }
        <app-icon name="download" [size]="16" /> Download PDF
      </button>
      <button class="btn btn-wa" (click)="shareOnWhatsApp()" [disabled]="shareBusy"
              [title]="'Send this bill summary to ' + bill.phone">
        @if (shareBusy) { <span class="spinner"></span> } @else { <app-icon name="whatsapp" [size]="17" /> }
        Share on WhatsApp
      </button>
    </div>
  `,
  styles: [`
    .pay-btn { background: linear-gradient(135deg, #2BB673, #1E9E62); border-color: transparent; }

    /* Old payments (past month's dues) stand out in amber. */
    .old-pay-row td { background: rgba(217, 142, 50, 0.10); }
    .old-pay-chip {
      display: inline-block; margin-right: 6px; padding: 2px 8px; border-radius: 999px;
      background: rgba(217, 142, 50, 0.18); border: 1px solid rgba(217, 142, 50, 0.55);
      color: #E5A55D; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.04em; white-space: nowrap;
    }

    /* The action row wraps instead of colliding when space runs out. */
    .bill-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; align-items: center; }

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
  monthLabel = monthLabel;
  private toast = inject(ToastService);

  /** True while the PDF is being generated for download / share. */
  pdfBusy = false;
  shareBusy = false;

  @Input({ required: true }) bill!: Bill;
  @Input() canManage = false;
  /** Show the "Pay via UPI" button — set only by the customer dashboard. */
  @Input() showPay = false;
  @Output() removeEntry = new EventEmitter<DailyEntry>();
  @Output() removePayment = new EventEmitter<Payment>();

  farm = FARM;

  async pdf() {
    if (this.pdfBusy) return;
    this.pdfBusy = true;
    try {
      await downloadBillPdf(this.bill);
    } finally {
      this.pdfBusy = false;
    }
  }

  /**
   * On a phone this opens the UPI app with the exact due pre-filled; on a
   * desktop (no upi:// handler) the UPI id is copied instead, with a toast.
   */
  payNow() {
    const b = this.bill;
    try {
      navigator.clipboard?.writeText(FARM.upiId).catch(() => {});
    } catch { /* clipboard is best-effort */ }

    if (isProbablyPhone()) {
      // Phones/tablets: hand the amount straight to GPay/PhonePe/Paytm.
      window.location.href = upiPayLink(b.outstanding, `${FARM.name} bill ${b.to}`);
      this.toast.info(`Opening your UPI app for ₹${b.outstanding}…`, 5000);
    } else {
      // Laptops have no upi:// handler — navigating there just shows a browser
      // error, so the id is copied and shown instead.
      this.toast.info(
        `Pay ₹${b.outstanding} to UPI ID ${FARM.upiId} (${FARM.upiName}) — the id is copied. ` +
        'Open GPay/PhonePe/Paytm on your phone and paste it.', 9000);
    }
  }

  /** dd-mm-yyyy of the day before an ISO date — labels the previous-balance cutoff. */
  dayBefore(iso: string): string {
    const d = new Date(iso);
    d.setDate(d.getDate() - 1);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}-${mm}-${d.getFullYear()}`;
  }

  /**
   * Share the ACTUAL bill PDF on WhatsApp.
   *
   * Phones (Android + iPhone): the Web Share API hands the real PDF file to
   * the system share sheet — the person taps WhatsApp, picks the chat, and the
   * PDF itself is sent. No download-then-attach dance.
   *
   * Laptops / older browsers (no file sharing): the next best thing — the PDF
   * is downloaded and the customer's WhatsApp chat opens with a ready note, so
   * only one human step remains: attach the freshly downloaded file and send.
   */
  async shareOnWhatsApp() {
    if (this.shareBusy) return;
    this.shareBusy = true;

    // Can this browser hand a real file to the share sheet? Probed with a tiny
    // dummy PDF *before* any await, so the answer is known while we are still
    // inside the click. Phones answer yes and never see the fallback tab;
    // laptops answer no, and the tab must open NOW to stay popup-blocker-safe.
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    const probe = new File([new Blob(['%'], { type: 'application/pdf' })], 'probe.pdf', { type: 'application/pdf' });
    const fileShare = typeof nav.share === 'function' && nav.canShare?.({ files: [probe] }) === true;
    const win = fileShare ? null : window.open('about:blank', '_blank');

    const b = this.bill;
    const note =
      `Namaste ${b.customerName} ji! Your ${FARM.name} bill for ` +
      `${niceDate(b.from)} to ${niceDate(b.to)} is attached as a PDF.` +
      (b.outstanding > 0
        ? `\n\nPay instantly (₹${b.outstanding}): ${upiPayLink(b.outstanding, FARM.name + ' bill ' + b.to)}`
        : '') +
      '\nThank you!';

    let file: File | null = null;
    try {
      file = await billPdfFile(b);
    } catch {
      this.toast.error('The PDF could not be generated — sending the note only.');
    }

    // ---- Phones: the real PDF goes into the system share sheet ----
    if (file && fileShare) {
      try {
        await nav.share({
          files: [file],
          title: `${FARM.name} bill`,
          text: note
        });
        this.toast.success(`Bill PDF shared — pick WhatsApp → ${b.customerName} and send.`, 6000);
      } catch (e) {
        // The person closed the share sheet — that's a choice, not an error.
        if ((e as DOMException)?.name !== 'AbortError') {
          this.toast.error('Sharing failed — the PDF has been downloaded instead.');
          this.saveFile(file);
        }
      }
      this.shareBusy = false;
      return;
    }

    // ---- Laptops / old browsers: download + open the right chat ----
    if (file) {
      this.saveFile(file);
      this.toast.info(
        `Bill PDF downloaded ✓ — ${b.customerName}'s WhatsApp chat is opening. ` +
        'Attach it (📎 → Document → newest file) or just drag the PDF into the chat, then send.', 9000);
    }

    // Registered numbers are 10 digits; wa.me needs the country code.
    const digits = String(b.phone || '').replace(/\D/g, '');
    const number = digits.length === 10 ? `91${digits}` : digits;
    const url = `https://wa.me/${number}?text=${encodeURIComponent(note)}`;

    if (win) {
      win.location.href = url;
    } else {
      window.location.href = url;              // popup blocked — last resort
    }
    this.shareBusy = false;
  }

  /** Saves an already-built PDF File to the device (the fallback path). */
  private saveFile(file: File) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}
