import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { isoDate } from '../core/farm';
import { Offer, OfferScope } from '../core/models';
import { IconComponent } from '../shared/icon.component';

/**
 * Offers & coupon codes.
 *
 * A coupon is a percentage off a whole order, unlocked by typing its code —
 * nothing is ever discounted automatically, which is what lets the farm hand a
 * code to a WhatsApp group or print it on a flyer and still control who uses it.
 *
 * Write actions are full-admin only; view-only staff see the same table without
 * the buttons, and the backend refuses their writes regardless.
 */
@Component({
  selector: 'app-offers-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <h2>Offers</h2>
    <p class="mgmt-sub">
      Create a coupon code, and customers who type it get that percentage off their whole order.
      Live codes are announced in the strip at the top of the website.
    </p>

    <div class="panel">
      <div class="toolbar">
        <div class="legend">
          <span class="badge badge-ok">Live</span> working right now ·
          <span class="badge badge-gold">Scheduled</span> starts later ·
          <span class="badge badge-off">Paused</span> switched off or finished
        </div>
        @if (auth.isFullAdmin()) {
          <button class="btn btn-primary push" (click)="startAdd()">
            <app-icon name="plus" [size]="15" [stroke]="2.4" /> New offer
          </button>
        }
      </div>

      @if (error && !formOpen) { <div class="alert alert-error">{{ error }}</div> }

      @if (loading) {
        <div class="skeleton" style="height: 240px;"></div>
      } @else if (offers.length === 0) {
        <div class="empty">
          <div class="empty-ic"><app-icon name="tag" [size]="26" /></div>
          <h3>No offers yet</h3>
          <p class="muted">
            Create one to run a discount — for example <b>10% off everything</b> with the code
            <b>ARYA10</b>, valid for a week.
          </p>
          @if (auth.isFullAdmin()) {
            <button class="btn btn-primary mt" (click)="startAdd()">Create the first offer</button>
          }
        </div>
      } @else {
        <div class="tbl-wrap">
          <table class="tbl" style="min-width: 860px;">
            <thead>
              <tr>
                <th>Code</th>
                <th>Offer</th>
                <th class="num">Discount</th>
                <th>Works on</th>
                <th>Running</th>
                <th>Status</th>
                <th class="num">Used</th>
                @if (auth.isFullAdmin()) { <th class="right">Actions</th> }
              </tr>
            </thead>
            <tbody>
              @for (o of offers; track o.id) {
                <tr [class.row-dim]="statusOf(o) === 'Paused'">
                  <td><span class="code">{{ o.code }}</span></td>
                  <td>
                    <b>{{ o.title }}</b>
                    @if (o.description) { <div class="muted sm">{{ o.description }}</div> }
                    @if (!o.showOnSite) {
                      <span class="auto-tag" title="Not announced on the website — share this code yourself">private</span>
                    }
                  </td>
                  <td class="num pct">{{ o.percentOff }}%</td>
                  <td>{{ scopeLabel(o.scope) }}</td>
                  <td class="sm">{{ rangeLabel(o) }}</td>
                  <td>
                    @switch (statusOf(o)) {
                      @case ('Live') { <span class="badge badge-ok">Live</span> }
                      @case ('Scheduled') { <span class="badge badge-gold">Scheduled</span> }
                      @default { <span class="badge badge-off">Paused</span> }
                    }
                  </td>
                  <td class="num">{{ o.usedCount || 0 }}</td>
                  @if (auth.isFullAdmin()) {
                    <td class="right actions">
                      <button class="btn btn-outline btn-sm" (click)="toggleActive(o)"
                              [title]="o.active ? 'Stop this code working' : 'Start this code working again'">
                        {{ o.active ? 'Pause' : 'Resume' }}
                      </button>
                      <button class="btn btn-outline btn-sm" (click)="startEdit(o)">
                        <app-icon name="edit" [size]="14" /> Edit
                      </button>
                      <button class="btn btn-danger btn-sm" (click)="remove(o)">
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

    <!-- ============ Add / edit offer ============ -->
    @if (formOpen) {
      <div class="modal-back" (click)="formOpen = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>{{ editing ? 'Edit — ' + editing.code : 'New offer' }}</h3>
            <button type="button" class="modal-close" (click)="formOpen = false" aria-label="Close">
              <app-icon name="close" [size]="16" [stroke]="2.2" />
            </button>
          </div>
          @if (error) { <div class="alert alert-error">{{ error }}</div> }

          <div class="form-grid">
            <div class="field">
              <label>Coupon code <span class="req">*</span></label>
              <input name="ocode" class="code-input" [(ngModel)]="form.code"
                     placeholder="ARYA10" maxlength="20" autocomplete="off" spellcheck="false" />
              <span class="hint">Letters and numbers only. This is what the customer types.</span>
            </div>
            <div class="field">
              <label>Discount <span class="req">*</span></label>
              <div class="pct-row">
                <input name="opct" type="number" [(ngModel)]="form.percentOff" min="1" max="90" step="1" />
                <span class="pct-suffix">% off</span>
              </div>
              <span class="hint">Applies to the whole order total.</span>
            </div>

            <div class="field field-wide">
              <label>Headline</label>
              <input name="otitle" [(ngModel)]="form.title" [placeholder]="defaultTitle()" />
              <span class="hint">Shown in the strip at the top of the website. Leave blank to use "{{ defaultTitle() }}".</span>
            </div>
            <div class="field field-wide">
              <label>Small print (optional)</label>
              <input name="odesc" [(ngModel)]="form.description"
                     placeholder="e.g. On orders sent through WhatsApp this week" />
            </div>

            <div class="field field-wide">
              <label>Where the code works <span class="req">*</span></label>
              <div class="seg">
                <button type="button" [class.on]="form.scope === 'BOTH'" (click)="form.scope = 'BOTH'">
                  Both <span class="seg-sub">website + khata</span>
                </button>
                <button type="button" [class.on]="form.scope === 'WEBSITE'" (click)="form.scope = 'WEBSITE'">
                  Website only <span class="seg-sub">cart orders</span>
                </button>
                <button type="button" [class.on]="form.scope === 'KHATA'" (click)="form.scope = 'KHATA'">
                  Khata only <span class="seg-sub">daily entries</span>
                </button>
              </div>
              <span class="hint">
                Website codes come off the cart total before the WhatsApp order is sent.
                Khata codes are typed by staff in the daily entry sheet and come off that entry's amount.
              </span>
            </div>

            <div class="field">
              <label>Starts on</label>
              <input name="ofrom" type="date" [(ngModel)]="form.validFrom" />
              <span class="hint">Blank = works immediately.</span>
            </div>
            <div class="field">
              <label>Ends on</label>
              <input name="oto" type="date" [(ngModel)]="form.validTo" />
              <span class="hint">Blank = runs until you pause it. The last day counts.</span>
            </div>

            <div class="field field-wide">
              <label>Visibility</label>
              <label class="check">
                <input type="checkbox" name="oshow" [(ngModel)]="form.showOnSite" />
                <span>Announce this code in the strip across the top of the website</span>
              </label>
              <label class="check">
                <input type="checkbox" name="oactive" [(ngModel)]="form.active" />
                <span>Code is working</span>
              </label>
            </div>
          </div>

          <div class="modal-actions">
            <div class="m-total m-aside">
              @if (form.percentOff > 0) {
                A ₹1,000 order pays ₹{{ 1000 - (1000 * form.percentOff / 100) | number: '1.0-2' }}
              }
            </div>
            <button class="btn btn-ghost" (click)="formOpen = false">Cancel</button>
            <button class="btn btn-primary" (click)="save()" [disabled]="saving">
              @if (saving) { <span class="spinner"></span> } {{ editing ? 'Update offer' : 'Create offer' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* Segmented picker — same control as the entry sheet's paid/unpaid toggle. */
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
    @media (max-width: 560px) { .seg { flex-direction: column; } }

    .legend { font-size: 0.78rem; color: var(--muted); }
    .legend .badge { margin-right: 2px; }
    .push { margin-left: auto; }

    .code {
      display: inline-block; padding: 3px 12px; border-radius: 8px;
      background: #100E08; border: 1px dashed var(--line);
      font-family: var(--font-display); font-size: 0.98rem; letter-spacing: 0.1em;
      color: var(--gold-2);
    }
    .pct { font-family: var(--font-display); font-size: 1.05rem; color: var(--gold-2); }
    .sm { font-size: 0.82rem; }
    .row-dim td { opacity: 0.55; }
    .actions { white-space: nowrap; }
    .actions .btn { margin-left: 6px; }
    .auto-tag {
      display: inline-block; margin-top: 4px; padding: 1px 8px; border-radius: 999px;
      font-size: 0.68rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
      color: var(--muted); background: rgba(255, 255, 255, 0.06);
    }

    .empty { text-align: center; padding: 48px 24px; max-width: 460px; margin: 0 auto; }
    .empty-ic {
      width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 14px;
      display: grid; place-items: center;
      background: var(--leaf-soft); border: 1px solid var(--line-soft); color: var(--gold-2);
    }
    .empty h3 { color: var(--gold-2); margin-bottom: 6px; }

    .code-input { text-transform: uppercase; letter-spacing: 0.12em; font-weight: 700; }
    .pct-row { display: flex; align-items: center; gap: 10px; }
    .pct-row input { width: 110px; }
    .pct-suffix { font-family: var(--font-display); color: var(--gold-2); font-size: 1.05rem; }

    .check { display: flex; align-items: center; gap: 10px; padding: 5px 0; cursor: pointer; font-size: 0.92rem; }
    .check input { width: 17px; height: 17px; accent-color: var(--gold); flex: none; }

    @media (max-width: 620px) {
      .legend { display: none; }
      .push { margin-left: 0; }
    }
  `]
})
export class OffersAdminComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  auth = inject(AuthService);

  offers: Offer[] = [];
  loading = true;
  formOpen = false;
  editing: Offer | null = null;
  saving = false;
  error = '';

  form: Offer = this.blank();

  ngOnInit() {
    this.load();
  }

  private blank(): Offer {
    return {
      code: '',
      title: '',
      description: '',
      percentOff: 10,
      scope: 'BOTH',
      active: true,
      showOnSite: true,
      validFrom: null,
      validTo: null
    };
  }

  load() {
    this.loading = true;
    this.api.getOffers().subscribe({
      next: list => {
        this.offers = list;
        this.loading = false;
      },
      error: err => {
        this.error = err?.error?.error || 'Could not load the offers.';
        this.loading = false;
      }
    });
  }

  /** What the headline will say if the admin leaves it blank. */
  defaultTitle(): string {
    const pct = this.form.percentOff || 0;
    return `${pct}% off everything`;
  }

  scopeLabel(scope: OfferScope): string {
    if (scope === 'WEBSITE') return 'Website orders';
    if (scope === 'KHATA') return 'Khata entries';
    return 'Website + khata';
  }

  /** "Until 30 Sep", "1–15 Oct", "Always on" — whichever the dates describe. */
  rangeLabel(o: Offer): string {
    const from = this.pretty(o.validFrom);
    const to = this.pretty(o.validTo);
    if (from && to) return `${from} → ${to}`;
    if (from) return `From ${from}`;
    if (to) return `Until ${to}`;
    return 'No end date';
  }

  private pretty(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /** Paused covers both "switched off" and "the end date has passed". */
  statusOf(o: Offer): 'Live' | 'Scheduled' | 'Paused' {
    if (!o.active) return 'Paused';
    const today = isoDate();
    if (o.validTo && o.validTo < today) return 'Paused';
    if (o.validFrom && o.validFrom > today) return 'Scheduled';
    return 'Live';
  }

  startAdd() {
    this.editing = null;
    this.form = this.blank();
    this.error = '';
    this.formOpen = true;
  }

  startEdit(o: Offer) {
    this.editing = o;
    this.form = { ...o, description: o.description || '' };
    this.error = '';
    this.formOpen = true;
  }

  /** One-tap pause/resume — the common case doesn't need the whole form. */
  toggleActive(o: Offer) {
    const next = { ...o, active: !o.active };
    this.api.updateOffer(o.id!, next).subscribe({
      next: () => {
        this.toast.success(next.active ? `${o.code} is live again.` : `${o.code} paused — the code stops working now.`);
        this.load();
      },
      error: err => this.toast.error(err?.error?.error || 'Could not update the offer.')
    });
  }

  save() {
    this.error = '';
    const code = (this.form.code || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!code) { this.error = 'A coupon code is required.'; return; }
    if (!/^[A-Z0-9]{3,20}$/.test(code)) {
      this.error = 'The code must be 3–20 characters, letters and numbers only.';
      return;
    }
    const pct = Number(this.form.percentOff);
    if (!pct || pct <= 0) { this.error = 'The discount must be greater than 0%.'; return; }
    if (pct > 90) { this.error = 'The discount cannot be more than 90%.'; return; }
    if (this.form.validFrom && this.form.validTo && this.form.validTo < this.form.validFrom) {
      this.error = 'The end date cannot be before the start date.';
      return;
    }

    const payload: Offer = {
      ...this.form,
      code,
      percentOff: pct,
      title: (this.form.title || '').trim() || this.defaultTitle(),
      description: (this.form.description || '').trim() || null,
      validFrom: this.form.validFrom || null,
      validTo: this.form.validTo || null
    };

    this.saving = true;
    const done = (message: string) => {
      this.saving = false;
      this.formOpen = false;
      this.toast.success(message);
      this.load();
    };
    const fail = (err: any) => {
      this.saving = false;
      this.error = err?.error?.error || 'Could not save the offer. Please try again.';
    };

    if (this.editing) {
      this.api.updateOffer(this.editing.id!, payload).subscribe({ next: () => done(`${code} updated.`), error: fail });
    } else {
      this.api.addOffer(payload).subscribe({ next: () => done(`${code} created — it works immediately.`), error: fail });
    }
  }

  async remove(o: Offer) {
    const ok = await this.confirm.ask({
      title: `Delete ${o.code}?`,
      message: 'The code stops working and disappears from the website. Entries that already used it keep their discount. '
        + 'To stop a code without losing its record, pause it instead.',
      confirmLabel: 'Delete offer'
    });
    if (!ok) return;
    this.api.deleteOffer(o.id!).subscribe({
      next: () => {
        this.toast.success(`${o.code} deleted.`);
        this.load();
      },
      error: err => this.toast.error(err?.error?.error || 'Delete failed.')
    });
  }
}
