import { DeliveryInfo } from './models';

/** What the delivery rule works out to for one cart. */
export interface DeliveryOutcome {
  /** Does the farm charge for delivery at all? */
  charges: boolean;
  /** Is this cart over the free-delivery line? */
  free: boolean;
  /** Rupees to add to the bill. */
  fee: number;
  /** Rupees still needed for free delivery; 0 when already free or never charged. */
  gap: number;
  /** 0–1 towards the free-delivery line, for the bar in the cart. */
  progress: number;
}

/**
 * The delivery rule applied to a cart subtotal.
 *
 * Kept free of Angular so it can be run and checked on its own — this is the
 * one place in the shop where a wrong number changes what a customer is asked
 * to pay, so it is worth being able to test without a browser.
 *
 * @param subtotal the item total *before* any coupon. A customer reading
 *                 "free above ₹500" has their cart total in mind, and losing
 *                 free delivery because they used a coupon is the kind of
 *                 surprise that gets an order abandoned.
 */
export function deliveryFor(info: DeliveryInfo | null | undefined, subtotal: number): DeliveryOutcome {
  const above = Math.max(0, info?.freeDeliveryAbove || 0);
  const charge = Math.max(0, info?.deliveryCharge || 0);
  const cart = Math.max(0, subtotal || 0);

  const charges = charge > 0;
  // No threshold set means the charge always applies; no charge means always free.
  const free = !charges || (above > 0 && cart >= above);
  const fee = cart <= 0 || free ? 0 : round2(charge);
  const gap = charges && !free && above > 0 ? round2(Math.max(0, above - cart)) : 0;
  const progress = !charges || above <= 0 ? 1 : Math.min(1, cart / above);

  return { charges, free, fee, gap, progress };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
