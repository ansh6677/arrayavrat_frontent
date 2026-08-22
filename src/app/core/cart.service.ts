import { Injectable, computed, effect, signal } from '@angular/core';

import { Product } from './models';

export interface CartItem {
  product: Product;
  qty: number;
}

const CART_KEY = 'adf_cart';

/** Simple cart for WhatsApp checkout — persisted in localStorage. */
@Injectable({ providedIn: 'root' })
export class CartService {
  items = signal<CartItem[]>(this.restore());

  /** Distinct line items (navbar badge). */
  count = computed(() => this.items().length);

  total = computed(() =>
    Math.round(this.items().reduce((s, i) => s + i.qty * i.product.price, 0) * 100) / 100
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

  private restore(): CartItem[] {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
      return Array.isArray(parsed)
        ? parsed.filter(i => i && i.product && i.product.id && i.qty > 0)
        : [];
    } catch {
      return [];
    }
  }

  add(product: Product, qty = 1) {
    const items = [...this.items()];
    const idx = items.findIndex(i => i.product.id === product.id);
    if (idx >= 0) {
      items[idx] = { ...items[idx], qty: Math.round((items[idx].qty + qty) * 100) / 100 };
    } else {
      items.push({ product, qty });
    }
    this.items.set(items);
  }

  setQty(productId: string, qty: number) {
    if (qty <= 0) {
      this.remove(productId);
      return;
    }
    this.items.set(
      this.items().map(i => (i.product.id === productId ? { ...i, qty: Math.round(qty * 100) / 100 } : i))
    );
  }

  remove(productId: string) {
    this.items.set(this.items().filter(i => i.product.id !== productId));
  }

  clear() {
    this.items.set([]);
  }
}
