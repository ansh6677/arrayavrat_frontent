import { Injectable, computed, inject, signal } from '@angular/core';

import { ApiService } from './api.service';
import { CartService } from './cart.service';
import { deliveryFor } from './delivery-math';
import { DeliveryInfo } from './models';

/**
 * The shop's delivery rule, and what it means for the cart on screen.
 *
 * The threshold is tested against the item subtotal, not the amount left after
 * a coupon. A customer reading "free above ₹500" has their cart total in mind,
 * and losing free delivery *because* they used a coupon is the kind of surprise
 * that gets an order abandoned.
 */
@Injectable({ providedIn: 'root' })
export class DeliveryService {
  private api = inject(ApiService);
  private cart = inject(CartService);

  /** Defaults to free until the real rule arrives, so nothing flickers a charge. */
  info = signal<DeliveryInfo>({ freeDeliveryAbove: 0, deliveryCharge: 0, deliveryNote: null });
  private loaded = false;

  load() {
    if (this.loaded) return;
    this.loaded = true;
    this.api.getDeliveryInfo().subscribe({
      next: res => this.info.set(res),
      // A failed lookup must not block checkout: the cart simply shows no
      // charge, which is the same thing a farm with no rule set would see.
      error: () => { this.loaded = false; }
    });
  }

  /** The rule applied to the cart as it stands — all four numbers at once. */
  private outcome = computed(() => deliveryFor(this.info(), this.cart.total()));

  /** True when the farm charges for delivery at all. */
  charges = computed(() => this.outcome().charges);

  /** Is this cart over the free-delivery line? */
  isFree = computed(() => this.outcome().free);

  /** What to add to the bill — 0 once delivery is free. */
  fee = computed(() => this.outcome().fee);

  /** Rupees still needed for free delivery; 0 when already there or never charged. */
  gap = computed(() => this.outcome().gap);

  /** 0–1 towards free delivery, for the little bar in the cart. */
  progress = computed(() => this.outcome().progress);
}
