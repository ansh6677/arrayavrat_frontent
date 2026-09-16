import { Injectable, computed, effect, inject, signal } from '@angular/core';

import { ApiService } from './api.service';
import { CartService } from './cart.service';
import { Offer } from './models';

const COUPON_KEY = 'adf_coupon';

/** The coupon the customer has applied, as it needs to be remembered. */
export interface AppliedCoupon {
  code: string;
  title: string;
  percentOff: number;
  /** Order total needed before it works. 0 or absent = no minimum. */
  minOrderAmount?: number;
}

/**
 * The applied coupon, shared by the cart and the site strip.
 *
 * It lives beside the cart in localStorage so a code survives a reload — a
 * customer who copies a code from the strip, browses products and comes back
 * to the cart should not have to type it again.
 *
 * The discount here is only ever a *display*: orders are sent as WhatsApp
 * messages, so the farm still confirms the final figure. The code is validated
 * against the backend before it is stored, which is what stops an invented
 * code from ever showing up in that message.
 */
@Injectable({ providedIn: 'root' })
export class CouponService {
  private api = inject(ApiService);
  private cart = inject(CartService);

  applied = signal<AppliedCoupon | null>(this.restore());

  /** Live, advertisable offers — loaded once for the site strip. */
  offers = signal<Offer[]>([]);
  private offersLoaded = false;

  /**
   * Whether the cart has reached the coupon's minimum.
   *
   * The coupon stays applied when it hasn't — removing it silently as items
   * come out of the cart would leave the customer wondering where their
   * discount went. It simply stops counting, and the cart says why.
   */
  meetsMinimum = computed(() => {
    const coupon = this.applied();
    const min = coupon?.minOrderAmount || 0;
    return min <= 0 || this.cart.total() >= min;
  });

  /** How much more is needed to unlock it; 0 once the minimum is met. */
  shortfall = computed(() => {
    const coupon = this.applied();
    const min = coupon?.minOrderAmount || 0;
    if (min <= 0 || this.meetsMinimum()) return 0;
    return Math.round((min - this.cart.total()) * 100) / 100;
  });

  /** What the applied coupon takes off the current cart, in rupees. */
  discount = computed(() => {
    const coupon = this.applied();
    if (!coupon || !this.meetsMinimum()) return 0;
    return Math.round(this.cart.total() * coupon.percentOff) / 100;
  });

  /** Cart total after the discount — never below zero. */
  payable = computed(() => Math.max(0, Math.round((this.cart.total() - this.discount()) * 100) / 100));

  constructor() {
    effect(() => {
      const coupon = this.applied();
      try {
        if (coupon) localStorage.setItem(COUPON_KEY, JSON.stringify(coupon));
        else localStorage.removeItem(COUPON_KEY);
      } catch {
        /* storage blocked — the coupon just won't survive a reload */
      }
    });
  }

  private restore(): AppliedCoupon | null {
    try {
      const raw = localStorage.getItem(COUPON_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AppliedCoupon;
      return parsed && parsed.code && parsed.percentOff > 0 ? parsed : null;
    } catch {
      return null;
    }
  }

  /** Fetches the live offers once per page load; safe to call from anywhere. */
  loadOffers() {
    if (this.offersLoaded) return;
    this.offersLoaded = true;
    this.api.getLiveOffers().subscribe({
      next: list => {
        this.offers.set(list || []);
        this.dropIfDead(list || []);
      },
      error: () => this.offers.set([])
    });
  }

  apply(coupon: AppliedCoupon) {
    this.applied.set(coupon);
  }

  clear() {
    this.applied.set(null);
  }

  /**
   * A stored code outlives the campaign that created it. Once the live list is
   * known, a coupon that is no longer on it is dropped rather than left to
   * print a discount the farm will not honour — but only when the list came
   * back non-empty, so a failed request never wipes a valid code.
   */
  private dropIfDead(live: Offer[]) {
    const coupon = this.applied();
    if (!coupon || live.length === 0) return;
    if (!live.some(o => o.code === coupon.code)) {
      // It may still be a valid private code, so ask before discarding it.
      this.api.validateCoupon(coupon.code, this.cart.total()).subscribe({
        next: res => { if (!res.valid) this.clear(); },
        error: () => { /* offline — keep what we have */ }
      });
    }
  }
}
