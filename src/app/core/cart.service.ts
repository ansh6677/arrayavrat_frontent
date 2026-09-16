import { Injectable, computed, effect, signal } from '@angular/core';

import { Product, ProductVariant } from './models';

export interface CartItem {
  /**
   * Product plus pack. Two packs of the same paneer are two separate lines,
   * because they carry different prices and the customer chose both on purpose.
   */
  key: string;
  product: Product;
  /** The chosen pack, or null when the product is sold by loose quantity. */
  variant: ProductVariant | null;
  /** Number of packs when a variant is set, base units otherwise. */
  qty: number;
}

const CART_KEY = 'adf_cart';

/** Stable line id for a product/pack pair. */
export function cartKey(product: Product, variant?: ProductVariant | null): string {
  return `${product.id}|${variant?.label || ''}`;
}

/** What one unit of this line costs — the pack price wins when there is one. */
export function linePrice(item: { product: Product; variant: ProductVariant | null }): number {
  return item.variant ? item.variant.price : item.product.price;
}

/** Packs the customer can actually buy right now. */
export function sellablePacks(product: Product): ProductVariant[] {
  return (product.variants || []).filter(v => v.available !== false);
}

/** First available pack, or null for a loose-quantity product. */
export function defaultPack(product: Product): ProductVariant | null {
  return sellablePacks(product)[0] || null;
}

/** Simple cart for WhatsApp checkout — persisted in localStorage. */
@Injectable({ providedIn: 'root' })
export class CartService {
  items = signal<CartItem[]>(this.restore());

  /** Distinct line items (navbar badge). */
  count = computed(() => this.items().length);

  total = computed(() =>
    Math.round(this.items().reduce((s, i) => s + i.qty * linePrice(i), 0) * 100) / 100
  );

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(CART_KEY, JSON.stringify(this.items()));
      } catch {
        /* storage full/blocked — ignore */
      }
    });
  }

  /**
   * Carts saved before packs existed have no `key` or `variant`. They are
   * repaired rather than thrown away — someone mid-shop should not lose their
   * basket to a deploy.
   */
  private restore(): CartItem[] {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(i => i && i.product && i.product.id && i.qty > 0)
        .map(i => ({
          product: i.product,
          variant: i.variant || null,
          qty: i.qty,
          key: i.key || cartKey(i.product, i.variant)
        }));
    } catch {
      return [];
    }
  }

  add(product: Product, qty = 1, variant: ProductVariant | null = null) {
    const key = cartKey(product, variant);
    const items = [...this.items()];
    const idx = items.findIndex(i => i.key === key);
    if (idx >= 0) {
      items[idx] = { ...items[idx], qty: Math.round((items[idx].qty + qty) * 100) / 100 };
    } else {
      items.push({ key, product, variant, qty });
    }
    this.items.set(items);
  }

  setQty(key: string, qty: number) {
    if (qty <= 0) {
      this.remove(key);
      return;
    }
    this.items.set(
      this.items().map(i => (i.key === key ? { ...i, qty: Math.round(qty * 100) / 100 } : i))
    );
  }

  remove(key: string) {
    this.items.set(this.items().filter(i => i.key !== key));
  }

  clear() {
    this.items.set([]);
  }
}
