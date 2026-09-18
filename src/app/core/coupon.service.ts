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
 * The applied coupon, remembered across the visit.
 *
 * It lives beside the cart in localStorage so a code survives a reload — a
 * customer who picks a code in the cart, browses more products and comes back
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

  /** Live, listable offers — what the cart's offer list shows. */
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

  // ------------------------------------------------------------------
  // Per-offer maths — what the coupon list needs to show every code at
  // once, the way a food-delivery app does: what each one saves today,
  // and exactly how much more the cart needs for the ones still locked.
  // ------------------------------------------------------------------

  /** Has the cart reached this offer's minimum? No minimum = always true. */
  unlocked(offer: Offer): boolean {
    const min = offer?.minOrderAmount || 0;
    return min <= 0 || this.cart.total() >= min;
  }

  /** What this offer takes off the cart as it stands. 0 while it is locked. */
  savingFor(offer: Offer): number {
    if (!offer || !this.unlocked(offer)) return 0;
    return Math.round(this.cart.total() * offer.percentOff) / 100;
  }

  /** Rupees still missing before this offer works; 0 once it is unlocked. */
  gapFor(offer: Offer): number {
    const gap = (offer?.minOrderAmount || 0) - this.cart.total();
    return gap > 0 ? Math.round(gap * 100) / 100 : 0;
  }

  /** 0–1 along the way to the minimum — the fill of the little progress bar. */
  progressFor(offer: Offer): number {
    const min = offer?.minOrderAmount || 0;
    if (min <= 0) return 1;
    return Math.min(1, Math.max(0, this.cart.total() / min));
  }

  /**
   * What a locked offer would save once the cart just reaches its minimum.
   *
   * This is the number worth showing next to "add ₹120 more" — the shortfall
   * alone tells a customer what it costs them, not what they get for it.
   */
  savingAtMinimum(offer: Offer): number {
    const base = Math.max(this.cart.total(), offer?.minOrderAmount || 0);
    return Math.round(base * (offer?.percentOff || 0)) / 100;
  }

  /**
   * Every live offer, best first: the ones usable right now by biggest saving,
   * then the locked ones by how close they are. A customer should never have
   * to scroll past a coupon they cannot use to find one they can.
   */
  offerList = computed<Offer[]>(() =>
    [...this.offers()].sort((a, b) => {
      const ua = this.unlocked(a), ub = this.unlocked(b);
      if (ua !== ub) return ua ? -1 : 1;
      return ua ? this.savingFor(b) - this.savingFor(a) : this.gapFor(a) - this.gapFor(b);
    }));

  /** The closest locked offer — the one worth nudging about near the total. */
  nextUnlock = computed<Offer | null>(() => {
    const code = this.applied()?.code;
    return this.offerList().find(o => !this.unlocked(o) && o.code !== code) || null;
  });

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
