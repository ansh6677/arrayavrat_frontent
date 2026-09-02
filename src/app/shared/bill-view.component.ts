import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../core/api.service';
import { Bill, DailyEntry, Payment } from '../core/models';
import { FARM, monthLabel, newRequestId, niceDate, waLink } from '../core/farm';
import { saveBlob } from '../core/download';
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
  imports: [CommonModule, FormsModule, IconComponent],
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
                <tr [class.old-due-row]="e.oldDue">
                  <td>{{ e.entryDate | date: 'dd MMM yyyy' }}</td>
                  <td>
                    @if (e.oldDue) {
                      <span class="old-due-chip">OLD DUE · {{ monthLabel(e.forPeriod) }}</span>
                      @if (e.note) { <span class="muted">· {{ e.note }}</span> }
                    } @else {
                      {{ e.productName }}
                      @if (e.paid) { <span class="chip-paid">✓ Paid</span> } @else { <span class="chip-udhaar">Credit</span> }
                      @if (e.note) { <span class="muted">· {{ e.note }}</span> }
                    }
                  </td>
                  <td class="num">@if (e.oldDue) { — } @else { {{ e.quantity | number: '1.0-2' }} {{ e.unit }} }</td>
                  <td class="num">@if (e.oldDue) { — } @else { {{ e.rate | number: '1.0-2' }} }</td>
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

      @if (pendingClaims.length > 0) {
        <div class="khata-section-title">Reported by customer — awaiting confirmation</div>
        <div class="tbl-wrap" style="border: none; border-radius: 0; background: transparent;">
          <table class="tbl">
            <thead>
              <tr>
                <th>Reported on</th>
                <th>Mode</th>
                <th>Reference / UTR</th>
                <th class="num">Amount (₹)</th>
                @if (canManage) { <th class="no-print"></th> }
              </tr>
            </thead>
            <tbody>
              @for (p of pendingClaims; track p.id) {
                <tr>
                  <td>{{ p.paymentDate | date: 'dd MMM yyyy' }}</td>
                  <td>{{ p.mode }}</td>
                  <td>{{ p.claimedRef || '—' }}</td>
                  <td class="num">{{ p.amount | number: '1.0-2' }}</td>
                  @if (canManage) {
                    <td class="right no-print claim-actions">
                      <button class="btn btn-wa btn-sm" (click)="confirmClaim(p)" [disabled]="busyClaimId === p.id">
                        @if (busyClaimId === p.id) { <span class="spinner"></span> } ✓ Confirm
                      </button>
                      <button class="btn btn-danger btn-sm" (click)="removePayment.emit(p)" title="Reject this claim">✕</button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="claim-note">
          @if (canManage) {
            Check the bank / UPI statement against the reference, then press <b>Confirm</b>.
            The amount reduces the outstanding only after that.
          } @else {
            Not deducted yet — the farm is verifying this transfer. Your outstanding
            updates as soon as it is confirmed.
          }
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

    <!-- ================= UPI pay sheet =================
         One flow that works on BOTH platforms:
         · Android — "Open UPI app" fires the generic upi:// system chooser
           (every installed UPI app shows up).
         · iOS — upi:// belongs to one app only (often WhatsApp!), so the
           customer taps their app and we use that app's own scheme.
         After the app opens, coming back to this tab shows the confirm step
         so the flow ends on OUR site, not in the payment app. -->
    @if (payOpen) {
      <div class="pay-back no-print" (click)="closePay()">
        <div class="pay-sheet" (click)="$event.stopPropagation()">
          <button type="button" class="pay-x" (click)="closePay()" aria-label="Close">✕</button>

          @if (payStep === 'pick') {
            <div class="pay-kicker">Paying {{ farmName }}</div>
            <button type="button" class="pay-amt-btn" (click)="copyAmount()">
              ₹{{ payAmount | number: '1.0-2' }}
              <span class="copy-tag" [class.copied]="amountCopied">{{ amountCopied ? '✓ Copied' : 'Tap to copy' }}</span>
            </button>
            <button type="button" class="pay-upi-id" (click)="copyUpiId()">
              UPI ID: <b>{{ upiId }}</b>
              <span class="copy-tag" [class.copied]="copied">{{ copied ? '✓ Copied' : 'Tap to copy' }}</span>
            </button>

            <!-- No upi:// buttons here on purpose. UPI apps refuse a browser deep
                 link to a personal VPA ("payment not allowed"), so the only path
                 offered is the one that completes: copy the ID, pay inside the app. -->
            <div class="pay-steps">
              <div class="pay-steps-title">Three steps:</div>
              <ol>
                <li>Tap the UPI ID above to copy it.</li>
                <li>Open GPay / PhonePe / Paytm → <b>Pay to UPI ID</b> (or <b>Send to UPI ID</b>) → paste.</li>
                <li>Enter ₹{{ payAmount | number: '1.0-2' }} and pay.</li>
              </ol>
            </div>

            <div class="pay-qr">
              <img [src]="qrSrc" [alt]="farmName + ' UPI QR code'" width="112" height="112" />
              <div class="pay-qr-side">
                <div class="pay-note"><b>Or scan the QR.</b></div>
                <button type="button" class="pay-link" (click)="saveQr()" [disabled]="qrBusy">
                  @if (qrBusy) { <span class="spinner"></span> } Save QR image
                </button>
                <div class="pay-note pay-note-sm">
                  Paying from this same phone? Save it, then in your UPI app tap
                  <b>Scan</b> → the gallery icon → pick the saved image.
                </div>
              </div>
            </div>

            <button class="btn btn-wa pay-main" (click)="payStep = 'confirm'">
              <app-icon name="wallet" [size]="16" /> I have paid — tell the farm →
            </button>

          } @else if (payStep === 'confirm') {
            <div class="pay-kicker">Almost done</div>
            <div class="pay-q">Did the payment of <b>₹{{ payAmount | number: '1.0-2' }}</b> go through?</div>
            <div class="pay-field">
              <label for="upiref">UPI reference / UTR <span>(optional, helps us verify faster)</span></label>
              <input id="upiref" name="upiref" [(ngModel)]="payRefInput" autocomplete="off"
                     placeholder="e.g. 412345678901" />
            </div>
            @if (claimError) { <div class="pay-err">{{ claimError }}</div> }
            <div class="pay-row">
              <button class="btn btn-wa" (click)="paidYes()" [disabled]="claiming">
                @if (claiming) { <span class="spinner"></span> } ✓ Yes, paid
              </button>
              <button class="btn btn-ghost" (click)="retry()" [disabled]="claiming">Not yet — retry</button>
            </div>
            @if (claimError) {
              <a class="btn btn-wa" [href]="confirmWaLink" target="_blank" rel="noopener">
                <app-icon name="whatsapp" [size]="16" /> Tell the farm on WhatsApp instead
              </a>
            }

          } @else {
            <div class="pay-done-ring"><span>✓</span></div>
            <div class="pay-q">Thank you! Your payment of <b>₹{{ payAmount | number: '1.0-2' }}</b> is recorded.</div>
            <div class="pay-note">
              It shows on your khata as <b>awaiting confirmation</b> and will be deducted
              once the farm verifies the transfer. To speed that up:
            </div>
            <a class="btn btn-wa" [href]="confirmWaLink" target="_blank" rel="noopener">
              <app-icon name="whatsapp" [size]="16" /> Confirm on WhatsApp
            </a>
            <button class="btn btn-ghost" (click)="closePay()">Back to my bill</button>
          }
        </div>
      </div>
    }

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

    /* ---------- UPI pay sheet ---------- */
    .pay-back {
      position: fixed; inset: 0; z-index: 60;
      background: rgba(8, 7, 4, 0.72); backdrop-filter: blur(3px);
      display: flex; align-items: flex-end; justify-content: center;
    }
    .pay-sheet {
      position: relative; width: 100%; max-width: 440px;
      background: linear-gradient(180deg, rgba(201, 162, 39, 0.10), rgba(201, 162, 39, 0.02) 30%), #171308;
      border: 1px solid rgba(228, 199, 102, 0.35); border-bottom: none;
      border-radius: 22px 22px 0 0; padding: 26px 22px 30px;
      display: flex; flex-direction: column; gap: 14px; text-align: center;
      animation: sheetUp 0.28s ease-out;
    }
    @keyframes sheetUp { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
    @media (min-width: 700px) {
      .pay-back { align-items: center; }
      .pay-sheet { border-radius: 22px; border-bottom: 1px solid rgba(228, 199, 102, 0.35); }
    }
    .pay-x {
      position: absolute; top: 10px; right: 12px; background: none; border: none;
      color: var(--muted); font-size: 1rem; cursor: pointer; padding: 6px;
    }
    .pay-kicker { color: var(--muted); font-size: 0.82rem; letter-spacing: 0.08em; text-transform: uppercase; }
    .pay-amt { font-family: var(--font-display); font-size: 2.6rem; line-height: 1; color: var(--gold-2); }
    .pay-upi-id {
      align-self: center; display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: center;
      background: rgba(13, 12, 9, 0.6); border: 1px dashed rgba(228, 199, 102, 0.4);
      border-radius: 12px; padding: 9px 14px; color: var(--ivory); font-size: 0.88rem; cursor: pointer;
    }
    .pay-upi-id b { color: var(--gold-2); }
    .copy-tag {
      font-size: 0.7rem; font-weight: 700; color: var(--muted);
      border: 1px solid var(--line-soft); border-radius: 999px; padding: 2px 8px;
    }
    .copy-tag.copied { color: #9ACE84; border-color: rgba(55, 200, 113, 0.5); }
    .pay-main { width: 100%; justify-content: center; font-size: 1rem; padding: 13px 16px; }
    .pay-note { color: var(--muted); font-size: 0.85rem; line-height: 1.5; }
    .pay-note-sm { font-size: 0.76rem; }

    /* Amount, big and copyable — the app's amount box needs it typed in. */
    .pay-amt-btn {
      background: none; border: none; cursor: pointer; padding: 0;
      color: inherit; font-size: 2.1rem; font-weight: 800; letter-spacing: -0.02em;
      font-variant-numeric: tabular-nums;
    }
    .pay-amt-btn .copy-tag { vertical-align: 8px; }

    /* The three-step instructions that replace the blocked one-tap link. */
    .pay-steps {
      text-align: left; background: rgba(0, 0, 0, 0.22);
      border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px;
    }
    .pay-steps-title {
      font-size: 0.76rem; font-weight: 800; letter-spacing: 0.06em;
      text-transform: uppercase; color: var(--gold-2); margin-bottom: 6px;
    }
    .pay-steps ol { margin: 0; padding-left: 20px; display: grid; gap: 5px; }
    .pay-steps li { font-size: 0.85rem; line-height: 1.5; color: var(--muted); }
    .pay-steps b { color: inherit; }

    /* QR block. */
    .pay-qr { display: flex; gap: 13px; align-items: flex-start; text-align: left; }
    .pay-qr img {
      width: 112px; height: 112px; flex: none; border-radius: 12px;
      background: #fff; padding: 5px; object-fit: contain;
    }
    .pay-qr-side { display: flex; flex-direction: column; gap: 5px; }


    /* "I have already paid" — the escape hatch out of the pick step. */
    .pay-link {
      background: none; border: none; cursor: pointer; padding: 4px 0;
      color: var(--gold-2); font-size: 0.86rem; font-weight: 700;
      text-decoration: underline; text-underline-offset: 3px;
    }

    /* UTR field on the confirm step. */
    .pay-field { text-align: left; display: flex; flex-direction: column; gap: 6px; }
    .pay-field label { font-size: 0.78rem; font-weight: 700; color: var(--gold-2); }
    .pay-field label span { font-weight: 500; color: var(--muted); }
    .pay-field input {
      width: 100%; padding: 11px 13px; border-radius: 12px;
      border: 1px solid var(--line); background: rgba(255, 255, 255, 0.04);
      color: inherit; font-size: 0.95rem; font-variant-numeric: tabular-nums;
    }
    .pay-field input:focus { outline: none; border-color: var(--gold-2); }
    .pay-err {
      background: rgba(214, 92, 78, 0.14); border: 1px solid rgba(214, 92, 78, 0.4);
      color: #E8A79E; border-radius: 12px; padding: 10px 12px;
      font-size: 0.84rem; line-height: 1.45; text-align: left;
    }

    /* ---------- pending customer claims ---------- */
    .claim-actions { white-space: nowrap; display: flex; gap: 6px; justify-content: flex-end; }
    .claim-note {
      margin-top: 8px; padding: 10px 12px; border-radius: 12px;
      background: rgba(228, 199, 102, 0.08); border: 1px solid var(--line);
      color: var(--muted); font-size: 0.82rem; line-height: 1.5;
    }
    .claim-note b { color: var(--gold-2); }
    .pay-q { color: var(--ivory); font-size: 1.02rem; line-height: 1.5; }
    .pay-q b { color: var(--gold-2); }
    .pay-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
    .pay-done-ring {
      width: 74px; height: 74px; border-radius: 50%; align-self: center;
      display: flex; align-items: center; justify-content: center;
      background: rgba(55, 200, 113, 0.12); border: 2px solid #37c871;
      color: #37c871; font-size: 2rem; font-weight: 800;
      animation: donePop 0.45s cubic-bezier(0.2, 1.4, 0.4, 1);
      box-shadow: 0 0 26px rgba(55, 200, 113, 0.35);
    }
    @keyframes donePop { from { transform: scale(0.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }

    /* Old dues (past month's pending khata) stand out in amber. */
    .old-due-row td { background: rgba(217, 142, 50, 0.10); }
    .old-due-chip {
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
  private api = inject(ApiService);

  /** True while the PDF is being generated for download / share. */
  pdfBusy = false;
  shareBusy = false;

  @Input({ required: true }) bill!: Bill;
  @Input() canManage = false;
  /** Show the "Pay via UPI" button — set only by the customer dashboard. */
  @Input() showPay = false;
  @Output() removeEntry = new EventEmitter<DailyEntry>();
  @Output() removePayment = new EventEmitter<Payment>();
  /** Customer reported a UPI payment — the host should reload the bill. */
  @Output() paymentClaimed = new EventEmitter<Payment>();
  /** Admin verified a claim — the host should reload the bill. */
  @Output() paymentConfirmed = new EventEmitter<Payment>();

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

  // ---------------- UPI pay sheet ----------------

  /*
   * Deliberately simple: no upi:// deep links, no app buttons, no
   * came-back-from-the-app detection.
   *
   * UPI apps refuse a browser deep link to a personal VPA — every app opened
   * and then said "payment not allowed", so those buttons were a trap. The
   * customer copies the UPI ID (or the QR), pays inside their app as an
   * ordinary transfer, then taps "I have paid" to report it. Because nothing
   * navigates away from the page, there is no state to stash and restore.
   */

  payOpen = false;
  payStep: 'pick' | 'confirm' | 'done' = 'pick';
  copied = false;
  upiId = FARM.upiId;
  farmName = FARM.name;
  confirmWaLink = '';

  /** Amount of the attempt in flight — kept separate from bill.outstanding, which reloads. */
  payAmount = 0;
  payRefInput = '';
  amountCopied = false;
  qrSrc = 'assets/brand/upi-qr.jpg';
  qrBusy = false;
  claiming = false;
  claimError = '';
  /** One request id per attempt, so a double tap cannot create two claims. */
  private attemptId = '';

  /** Customer-reported payments that the farm has not verified yet. */
  get pendingClaims(): Payment[] {
    return this.bill?.pendingClaims ?? [];
  }

  payNow() {
    const b = this.bill;
    if (!b || b.outstanding <= 0) return;
    this.beginAttempt(b.outstanding);
  }

  private beginAttempt(amount: number) {
    this.payAmount = amount;
    this.payRefInput = '';
    this.amountCopied = false;
    this.attemptId = newRequestId();
    this.claimError = '';
    this.copied = false;
    this.payStep = 'pick';
    this.payOpen = true;
    this.buildConfirmWaLink(amount);
  }

  /** The bare figure, ready to paste into the app's amount box. */
  copyAmount() {
    const plain = String(Math.round(this.payAmount * 100) / 100);
    try {
      navigator.clipboard?.writeText(plain).then(() => {
        this.amountCopied = true;
        setTimeout(() => (this.amountCopied = false), 2200);
      }).catch(() => {});
    } catch { /* clipboard is best-effort */ }
  }

  /**
   * Save the QR to the gallery. On the customer's own phone the screen cannot
   * be scanned, but every major UPI app can pick a QR image out of the gallery.
   */
  async saveQr() {
    if (this.qrBusy) return;
    this.qrBusy = true;
    try {
      const res = await fetch(this.qrSrc);
      if (!res.ok) throw new Error('qr fetch failed');
      saveBlob(await res.blob(), `${FARM.shortName}-upi-qr.jpg`);
      this.toast.success('QR saved — open it from your gallery inside the UPI app.');
    } catch {
      this.toast.error('Could not save the QR. Long-press the image and choose "Save image" instead.');
    } finally {
      this.qrBusy = false;
    }
  }

  copyUpiId() {
    try {
      navigator.clipboard?.writeText(FARM.upiId).then(() => {
        this.copied = true;
        setTimeout(() => (this.copied = false), 2200);
      }).catch(() => {});
    } catch { /* clipboard is best-effort */ }
  }

  /** "Not yet" — back to the pay screen with a fresh attempt id. */
  retry() {
    this.beginAttempt(this.payAmount);
  }

  /**
   * Report the payment to the farm. This is the step that used to be missing
   * entirely — the old code only built a WhatsApp link, so nothing ever reached
   * the server and the khata stayed unchanged no matter what the customer did.
   *
   * The claim is saved as PENDING: the customer sees it immediately, the admin
   * gets a Confirm button, and the outstanding moves only after verification.
   */
  paidYes() {
    if (this.claiming) return;
    this.claiming = true;
    this.claimError = '';
    const typed = this.payRefInput.trim();
    this.api.claimMyPayment({
      amount: this.payAmount,
      ref: typed,
      requestId: this.attemptId || newRequestId()
    }).subscribe({
      next: claim => {
        this.claiming = false;
        this.payAmount = claim.amount;
        this.payStep = 'done';
        this.buildConfirmWaLink(claim.amount, typed);
        this.paymentClaimed.emit(claim);
        this.toast.success('Payment reported — the farm will verify it shortly.');
      },
      error: err => {
        this.claiming = false;
        // Stay on the confirm step: the WhatsApp fallback appears underneath so
        // the customer is never stuck with an unreportable payment.
        this.claimError = err?.error?.error
          || 'Could not reach the farm just now. Please tell us on WhatsApp, or try again.';
        this.buildConfirmWaLink(this.payAmount, typed);
      }
    });
  }

  private buildConfirmWaLink(amount: number, ref = '') {
    const b = this.bill;
    const today = new Date().toLocaleDateString('en-IN');
    this.confirmWaLink = waLink(
      `Payment done ✓\nAmount: ₹${amount}\nTo UPI ID: ${FARM.upiId}\n` +
      (ref ? `Ref: ${ref}\n` : '') +
      `Name: ${b?.customerName || ''}\nPhone: ${b?.phone || ''}\nDate: ${today}\n` +
      `Kripya mera khata update kar dein.`
    );
  }

  closePay() {
    this.payOpen = false;
    this.payStep = 'pick';
    this.claimError = '';
  }

  // ---- admin side: verify a claim ----

  busyClaimId: string | null = null;

  /** Admin: accept a customer's reported payment, which finally moves the khata. */
  confirmClaim(p: Payment) {
    if (!p.id || this.busyClaimId) return;
    this.busyClaimId = p.id;
    this.api.confirmPayment(p.id).subscribe({
      next: () => {
        this.busyClaimId = null;
        this.toast.success(`₹${p.amount} confirmed — the outstanding has been updated.`);
        this.paymentConfirmed.emit(p);
      },
      error: err => {
        this.busyClaimId = null;
        this.toast.error(err?.error?.error || 'Could not confirm this payment. Please try again.');
      }
    });
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
      // No upi:// link here either — apps refuse it for a personal VPA. The
      // UPI ID is what the customer can actually act on.
      (b.outstanding > 0
        ? `\n\nOutstanding: ₹${b.outstanding}\nPay to UPI ID: ${FARM.upiId} (${FARM.upiName})`
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
