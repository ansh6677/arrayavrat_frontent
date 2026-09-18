import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CouponService } from '../core/coupon.service';
import { ToastService } from '../core/toast.service';
import { burstFrom } from '../core/confetti';
import { Offer } from '../core/models';
import { IconComponent } from './icon.component';

/**
 * Every running coupon, laid out the way a food-delivery app lays them out:
 * one card per code, the ones you can use right now at the top with the rupees
 * they save, and the rest showing exactly how much more the cart needs.
 *
 * Typing a code still works and always will — but a customer should not have
 * to know a code exists to benefit from it, and a locked coupon that states
 * its gap ("add ₹120 more") is the cheapest upsell the site has.
 */
@Component({
  selector: 'app-coupon-list',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    @if (list().length > 0) {
      <div class="cl">
        <div class="cl-head">
          <app-icon name="tag" [size]="14" />
          <span>Offers for you</span>
          <em>{{ list().length }} running</em>
        </div>

        @for (o of list(); track o.code) {
          <div class="cp" [class.cp-locked]="!coupons.unlocked(o)" [class.cp-live]="isApplied(o)">
            <div class="cp-stub"><span>{{ o.code }}</span></div>

            <div class="cp-body">
              <b class="cp-title">{{ o.title }}</b>
              @if (o.description) { <p class="cp-desc">{{ o.description }}</p> }

              @if (coupons.unlocked(o)) {
                <p class="cp-win">
                  Saves ₹{{ coupons.savingFor(o) | number: '1.0-2' }} on this order
                </p>
              } @else {
                <div class="cp-bar" role="progressbar"
                     [attr.aria-valuenow]="(coupons.progressFor(o) * 100) | number: '1.0-0'"
                     aria-valuemin="0" aria-valuemax="100">
                  <i [style.width.%]="coupons.progressFor(o) * 100"></i>
                </div>
                <p class="cp-gap">
                  Add ₹{{ coupons.gapFor(o) | number: '1.0-2' }} more to unlock
                  <span>— then this saves ₹{{ coupons.savingAtMinimum(o) | number: '1.0-2' }}</span>
                </p>
              }
            </div>

            <div class="cp-end">
              @if (isApplied(o)) {
                <span class="cp-tick"><app-icon name="check" [size]="13" [stroke]="2.6" /> Applied</span>
                <button type="button" class="cp-undo" (click)="remove()">Remove</button>
              } @else if (coupons.unlocked(o)) {
                <button type="button" class="btn btn-gold btn-sm" (click)="use(o, $event)">Apply</button>
              } @else {
                <span class="cp-min">Min ₹{{ o.minOrderAmount | number: '1.0-0' }}</span>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .cl { margin: 14px 0 6px; }
    .cl-head {
      display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
      font-size: 0.78rem; font-weight: 700; letter-spacing: 0.12em;
      text-transform: uppercase; color: var(--clay);
    }
    .cl-head em { font-style: normal; margin-left: auto; letter-spacing: 0.04em; color: var(--muted); font-weight: 400; }

    .cp {
      display: grid; grid-template-columns: 62px 1fr auto; gap: 12px; align-items: center;
      padding: 12px; margin-bottom: 10px;
      background: #100E08; border: 1px solid var(--line-soft); border-radius: 12px;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    .cp:hover { border-color: var(--line); }
    .cp-live { border-color: var(--gold); background: var(--ghee-soft); }
    .cp-locked { opacity: 0.92; }

    /* The stub is the torn-ticket edge — the shape does the "coupon" talking
       so the card needs no extra badge. */
    .cp-stub {
      position: relative; display: grid; place-items: center; align-self: stretch;
      padding: 8px 4px; border-radius: 9px;
      background: var(--ghee-soft); border: 1px dashed var(--line);
    }
    .cp-stub span {
      font-size: 0.68rem; font-weight: 800; letter-spacing: 0.06em;
      color: var(--gold-2); word-break: break-all; text-align: center; line-height: 1.25;
    }
    .cp-locked .cp-stub { background: rgba(255, 255, 255, 0.03); border-color: var(--line-soft); }
    .cp-locked .cp-stub span { color: var(--muted); }

    .cp-body { min-width: 0; }
    .cp-title { display: block; font-size: 0.92rem; color: var(--ivory); font-weight: 700; }
    .cp-desc { font-size: 0.78rem; color: var(--muted); margin: 2px 0 0; line-height: 1.45; }
    .cp-win { font-size: 0.8rem; color: var(--ok); margin: 5px 0 0; font-weight: 700; }
    .cp-gap { font-size: 0.76rem; color: var(--gold-2); margin: 5px 0 0; line-height: 1.45; }
    .cp-gap span { color: var(--muted); font-weight: 400; }

    .cp-bar { height: 5px; border-radius: 999px; background: rgba(255, 255, 255, 0.07); margin-top: 8px; overflow: hidden; }
    .cp-bar i { display: block; height: 100%; border-radius: 999px; background: var(--gold-grad); transition: width 0.3s ease; }

    .cp-end { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .cp-min { font-size: 0.72rem; color: var(--muted); white-space: nowrap; }
    .cp-tick { display: inline-flex; align-items: center; gap: 5px; font-size: 0.78rem; font-weight: 700; color: var(--ok); }
    .cp-undo {
      background: none; border: none; cursor: pointer; padding: 0;
      font-family: var(--font-body); font-size: 0.74rem; color: var(--muted);
      text-decoration: underline dotted; text-underline-offset: 3px;
    }
    .cp-undo:hover { color: var(--danger); }

    @media (max-width: 460px) {
      .cp { grid-template-columns: 54px 1fr; }
      .cp-end { grid-column: 1 / -1; flex-direction: row; justify-content: flex-end; align-items: center; gap: 10px; }
    }
  `]
})
export class CouponListComponent implements OnInit {
  coupons = inject(CouponService);
  private toast = inject(ToastService);

  /** Usable first, then the closest locked ones — sorted in the service. */
  list = computed<Offer[]>(() => this.coupons.offerList());

  ngOnInit() {
    this.coupons.loadOffers();
  }

  isApplied(offer: Offer): boolean {
    return this.coupons.applied()?.code === offer.code;
  }

  /**
   * Applying is instant and local — the codes in this list came from the
   * server's live list, so there is nothing left to verify and no reason to
   * make the customer wait for a round trip before the confetti.
   */
  use(offer: Offer, ev: MouseEvent) {
    if (!this.coupons.unlocked(offer)) return;
    this.coupons.apply({
      code: offer.code,
      title: offer.title,
      percentOff: offer.percentOff,
      minOrderAmount: offer.minOrderAmount || 0
    });
    burstFrom(ev.currentTarget as Element);
    this.toast.success(`${offer.code} applied — ₹${this.coupons.discount()} off.`);
  }

  remove() {
    this.coupons.clear();
  }
}
