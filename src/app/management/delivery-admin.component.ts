import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { ShopSettings } from '../core/models';
import { IconComponent } from '../shared/icon.component';

/**
 * The delivery rule: free at or above one amount, a flat charge below it.
 *
 * Two numbers, so the screen is mostly about making their effect obvious —
 * the preview underneath spells out what a customer will see at three cart
 * values, because "₹40 below ₹500" reads differently to everyone until you
 * show it.
 */
@Component({
  selector: 'app-delivery-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="head-row">
      <div>
        <h2>Delivery charge</h2>
        <p class="muted">What the website adds to a WhatsApp order, and when it stops adding it.</p>
      </div>
    </div>

    @if (loading) {
      <div class="panel"><span class="spinner"></span> Loading…</div>
    } @else {
      <div class="panel form-panel">
        <div class="grid2">
          <div class="field">
            <label for="fd">Free delivery at or above (₹)</label>
            <input id="fd" type="number" min="0" step="10" [(ngModel)]="freeAbove" name="fd" />
            <p class="hint">0 rakho to har order pe delivery free.</p>
          </div>
          <div class="field">
            <label for="dc">Delivery charge below that (₹)</label>
            <input id="dc" type="number" min="0" step="5" [(ngModel)]="charge" name="dc" />
            <p class="hint">0 rakho to kabhi charge nahi lagega.</p>
          </div>
          <div class="field field-wide">
            <label for="dn">Note under the delivery row <span class="muted">(optional)</span></label>
            <input id="dn" [(ngModel)]="note" name="dn" maxlength="120"
                   placeholder="e.g. Muzaffarpur city ke andar hi" />
          </div>
        </div>

        <!-- The rule, said back in the customer's words. -->
        <div class="preview">
          <p class="pv-head"><app-icon name="truck" [size]="14" /> Cart me aise dikhega</p>
          @if (!charging()) {
            <p class="pv-line ok">Har order pe delivery FREE — cart me koi charge row nahi aayegi.</p>
          } @else {
            @for (t of samples; track t) {
              <p class="pv-line">
                <span>₹{{ t | number: '1.0-0' }} ka order</span>
                @if (t >= freeAbove && freeAbove > 0) {
                  <b class="ok">Delivery FREE</b>
                } @else {
                  <b>+ ₹{{ charge | number: '1.0-2' }} delivery · total ₹{{ t + charge | number: '1.0-2' }}</b>
                }
              </p>
            }
            @if (freeAbove > 0) {
              <p class="pv-note">
                Isse kam ka cart ho to customer ko dikhega: “Add ₹… more and delivery is free.”
              </p>
            } @else {
              <p class="pv-note">Free-delivery amount 0 hai, to har order pe ₹{{ charge | number: '1.0-2' }} lagega.</p>
            }
          }
        </div>

        @if (canEdit) {
          <div class="actions">
            <button type="button" class="btn btn-gold" (click)="save()" [disabled]="saving">
              @if (saving) { <span class="spinner"></span> } Save
            </button>
            @if (updated) { <span class="muted saved">Last changed {{ updated }}</span> }
          </div>
        } @else {
          <p class="muted">You have view-only access, so this cannot be changed here.</p>
        }
      </div>
    }
  `,
  styles: [`
    .head-row { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
    .head-row h2 { margin: 0 0 2px; }
    .form-panel { max-width: 720px; }
    .grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .field-wide { grid-column: 1 / -1; }
    .hint { font-size: 0.74rem; color: var(--muted); margin: 5px 0 0; }

    .preview { margin-top: 16px; padding: 12px 14px; border: 1px dashed var(--line); border-radius: 12px; background: var(--ghee-soft); }
    .pv-head { display: flex; align-items: center; gap: 7px; margin: 0 0 8px; font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--clay); }
    .pv-line { display: flex; justify-content: space-between; gap: 12px; margin: 0 0 5px; font-size: 0.86rem; color: var(--muted); }
    .pv-line b { color: var(--ivory); font-weight: 600; }
    .pv-line .ok, .ok { color: var(--ok); }
    .pv-note { font-size: 0.76rem; color: var(--muted); margin: 8px 0 0; line-height: 1.5; }

    .actions { display: flex; align-items: center; gap: 12px; margin-top: 16px; }
    .saved { font-size: 0.76rem; }
    @media (max-width: 560px) { .grid2 { grid-template-columns: 1fr; } }
  `]
})
export class DeliveryAdminComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);

  loading = true;
  saving = false;
  freeAbove = 0;
  charge = 0;
  note = '';
  updated = '';

  /** Cart values the preview walks through. */
  samples = [200, 500, 1000];

  canEdit = this.auth.isFullAdmin();

  ngOnInit() {
    this.api.getShopSettings().subscribe({
      next: s => { this.apply(s); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  charging(): boolean {
    return (this.charge || 0) > 0;
  }

  save() {
    this.saving = true;
    this.api.saveDelivery({
      freeDeliveryAbove: Number(this.freeAbove) || 0,
      deliveryCharge: Number(this.charge) || 0,
      deliveryNote: this.note.trim() || null
    }).subscribe({
      next: s => {
        this.apply(s);
        this.saving = false;
        this.toast.success('Delivery charge saved.');
      },
      error: err => {
        this.saving = false;
        this.toast.error(err?.error?.message || err?.error?.error || 'Could not save.');
      }
    });
  }

  private apply(s: ShopSettings) {
    this.freeAbove = s.freeDeliveryAbove || 0;
    this.charge = s.deliveryCharge || 0;
    this.note = s.deliveryNote || '';
    this.updated = s.updatedAt ? new Date(s.updatedAt).toLocaleString('en-IN') : '';
  }
}
