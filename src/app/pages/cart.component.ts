import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CartService } from '../core/cart.service';
import { waLink } from '../core/farm';
import { IconComponent } from '../shared/icon.component';
import { ProductImage } from '../shared/product-image';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent],
  template: `
    <div class="container page-head">
      <span class="eyebrow">Your cart</span>
      <h1>Review your <span class="hl">order</span></h1>
      <p>Set your quantities and send the entire order in one WhatsApp message — confirmed within 30 minutes.</p>
    </div>

    <section class="section" style="padding-top: 24px;">
      <div class="container">
        @if (cart.items().length === 0) {
          <div class="card empty">
            <div class="empty-ic"><app-icon name="cart" [size]="30" /></div>
            <h3>Your cart is empty</h3>
            <p class="muted">Head to the products page and add some fresh dairy.</p>
            <a routerLink="/products" class="btn btn-primary mt">Browse products</a>
          </div>
        } @else {
          <div class="cart-grid">
            <!-- ============ items ============ -->
            <div>
              @for (i of cart.items(); track i.product.id) {
                <div class="citem">
                  <div class="citem-media">
                    <img [src]="img.src(i.product)" [alt]="i.product.name"
                         loading="lazy" (error)="img.failed(i.product)" />
                  </div>
                  <div class="citem-body">
                    <div class="citem-name">{{ i.product.name }}</div>
                    <div class="muted citem-rate">₹{{ i.product.price | number: '1.0-2' }} / {{ i.product.unit }}</div>
                    <div class="qty">
                      <button type="button" (click)="dec(i.product.id!, i.qty)"
                              [attr.aria-label]="'Less ' + i.product.name">
                        <app-icon name="minus" [size]="14" [stroke]="2.6" />
                      </button>
                      <span>{{ i.qty | number: '1.0-2' }} {{ i.product.unit }}</span>
                      <button type="button" (click)="inc(i.product.id!, i.qty)"
                              [attr.aria-label]="'More ' + i.product.name">
                        <app-icon name="plus" [size]="14" [stroke]="2.6" />
                      </button>
                    </div>
                  </div>
                  <div class="citem-end">
                    <div class="citem-total">₹{{ i.qty * i.product.price | number: '1.0-2' }}</div>
                    <button class="btn btn-danger btn-sm" (click)="cart.remove(i.product.id!)">Remove</button>
                  </div>
                </div>
              }
              <div class="right">
                <button class="btn btn-ghost btn-sm" (click)="cart.clear()">Clear cart</button>
                <a routerLink="/products" class="btn btn-outline btn-sm">+ Add more items</a>
              </div>
            </div>

            <!-- ============ summary ============ -->
            <div class="card summary">
              <h3>Order summary</h3>
              <div class="srow"><span class="muted">Items</span><b>{{ cart.count() }}</b></div>
              <div class="srow total"><span>Total</span><b>₹{{ cart.total() | number: '1.0-2' }}</b></div>

              <div class="field mt">
                <label>Your name <span class="req">*</span></label>
                <input name="cname" [(ngModel)]="name" placeholder="e.g. Ramesh Kumar" />
              </div>
              <div class="field">
                <label>Mobile number <span class="req">*</span></label>
                <input name="cphone" type="tel" [(ngModel)]="phone" placeholder="10-digit WhatsApp number" />
              </div>
              <div class="field">
                <label>Delivery address <span class="req">*</span></label>
                <textarea name="caddr" [(ngModel)]="address" placeholder="House, street, area…" rows="2"></textarea>
              </div>
              <div class="field">
                <label>Note (optional)</label>
                <input name="cnote" [(ngModel)]="note" placeholder="e.g. deliver before 7 AM" />
              </div>

              @if (formError) { <div class="alert alert-error">{{ formError }}</div> }
              <button class="btn btn-wa btn-block" (click)="orderOnWhatsApp()">
                <app-icon name="whatsapp" [size]="18" />
                Order on WhatsApp — ₹{{ cart.total() | number: '1.0-2' }}
              </button>
              <p class="muted shint">Tapping the button opens WhatsApp with your full order pre-filled — just hit send.</p>
            </div>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .empty { text-align: center; padding: 60px 24px; max-width: 520px; margin: 0 auto; }
    .empty-ic {
      width: 74px; height: 74px; border-radius: 50%; margin: 0 auto 16px;
      display: grid; place-items: center;
      background: var(--leaf-soft); border: 1px solid var(--line-soft); color: var(--gold-2);
    }
    .cart-grid { display: grid; grid-template-columns: 1.4fr 0.9fr; gap: 26px; align-items: start; }
    .citem {
      display: grid; grid-template-columns: 84px 1fr auto; gap: 16px; align-items: center;
      background: var(--surface); border: 1px solid var(--line-soft); border-radius: var(--radius);
      padding: 14px 16px; margin-bottom: 12px;
    }
    .citem-media {
      width: 100%; aspect-ratio: 1; border-radius: 12px; overflow: hidden;
      background: radial-gradient(120% 100% at 50% 45%, #1B170F 0%, #0E0C07 100%);
      border: 1px solid var(--line-soft);
    }
    .citem-media img { width: 100%; height: 100%; object-fit: contain; }
    .citem-name { font-weight: 700; color: var(--ivory); }
    .citem-rate { font-size: 0.85rem; margin: 2px 0 8px; }
    .qty { display: inline-flex; align-items: center; gap: 4px; border: 1.5px solid var(--line-soft); border-radius: 999px; padding: 3px; background: #100E08; }
    .qty button {
      width: 28px; height: 28px; border-radius: 50%; border: none; cursor: pointer;
      background: var(--gold-grad); color: #171307;
      display: grid; place-items: center; line-height: 1;
    }
    .qty button:hover { filter: brightness(1.1); }
    .qty span { min-width: 72px; text-align: center; font-weight: 700; font-size: 0.88rem; color: var(--ivory); }
    .citem-end { text-align: right; display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
    .citem-total { font-family: var(--font-display); font-size: 1.2rem; color: var(--gold-2); }
    .summary { position: sticky; top: 96px; }
    .srow { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed var(--line-soft); }
    .srow.total { border-bottom: none; font-family: var(--font-display); font-size: 1.25rem; }
    .srow.total b { color: var(--gold-2); }
    .shint { font-size: 0.8rem; margin-top: 10px; text-align: center; }
    @media (max-width: 860px) {
      .cart-grid { grid-template-columns: 1fr; }
      .summary { position: static; }
      .citem { grid-template-columns: 68px 1fr; }
      .citem-end { grid-column: 1 / -1; flex-direction: row; justify-content: space-between; align-items: center; }
    }
  `]
})
export class CartComponent {
  cart = inject(CartService);
  img = new ProductImage();

  name = '';
  phone = '';
  address = '';
  formError = '';
  note = '';

  inc(id: string, qty: number) {
    this.cart.setQty(id, qty + 0.5);
  }

  dec(id: string, qty: number) {
    this.cart.setQty(id, Math.max(0.5, qty - 0.5));
  }

  orderOnWhatsApp() {
    const items = this.cart.items();
    if (items.length === 0) return;

    // The farm needs all three to deliver — no anonymous orders.
    this.formError = '';
    if (!this.name.trim() || !this.address.trim() || !this.phone.trim()) {
      this.formError = 'Please fill in your name, mobile number and delivery address.';
      return;
    }
    const digits = this.phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      this.formError = 'Please enter a valid 10-digit mobile number.';
      return;
    }

    const lines: string[] = ['I want to order:', ''];
    items.forEach((i, idx) => {
      const lineTotal = Math.round(i.qty * i.product.price * 100) / 100;
      lines.push(`${idx + 1}) ${i.product.name}`);
      lines.push(`    ${i.qty} ${i.product.unit} × ₹${i.product.price} = ₹${lineTotal}`);
    });
    lines.push('');
    lines.push(`Total: ₹${this.cart.total()}`);
    lines.push(`Name: ${this.name.trim()}`);
    lines.push(`Mobile: ${digits}`);
    lines.push(`Address: ${this.address.trim()}`);
    if (this.note.trim()) lines.push(`Note: ${this.note.trim()}`);
    lines.push('');
    lines.push('Please confirm my order.');

    window.open(waLink(lines.join('\n')), '_blank');
  }
}
