import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService } from '../core/api.service';
import { CartService } from '../core/cart.service';
import { ToastService } from '../core/toast.service';
import { waLink } from '../core/farm';
import { Product } from '../core/models';
import { IconComponent } from '../shared/icon.component';
import { ProductImage } from '../shared/product-image';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent],
  template: `
    <div class="container page-head">
      <span class="section-label">Our products</span>
      <h1>Today's <span class="hl">fresh</span> listing</h1>
      <p>Pick your quantity, add to cart, and send the whole order in one WhatsApp message.</p>
    </div>

    <section class="section" style="padding-top: 24px;">
      <div class="container">
        <div class="p-toolbar mb">
          <div class="p-search">
            <app-icon name="search" [size]="17" [stroke]="2" />
            <input name="q" [(ngModel)]="q" placeholder="Search milk, ghee, paneer…" aria-label="Search products" />
            @if (q) {
              <button type="button" class="p-clear" (click)="q = ''" aria-label="Clear search">
                <app-icon name="close" [size]="14" [stroke]="2.2" />
              </button>
            }
          </div>
          <div class="chips">
            <button type="button" class="chip" [class.on]="selected === 'All'" (click)="select('All')">All</button>
            @for (c of categories; track c) {
              <button type="button" class="chip" [class.on]="selected === c" (click)="select(c)">{{ c }}</button>
            }
          </div>
          <select class="p-sort" name="sort" [(ngModel)]="sort" aria-label="Sort products">
            <option value="featured">Sort: Featured</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
            <option value="name">Name: A → Z</option>
          </select>
        </div>

        @if (loading) {
          <div class="p-grid">
            @for (s of [1, 2, 3, 4, 5, 6]; track s) { <div class="skeleton" style="height: 420px;"></div> }
          </div>
        } @else if (error) {
          <div class="alert alert-error">{{ error }}</div>
        } @else if (visible().length === 0) {
          <div class="card p-empty">
            <h3>Nothing matched</h3>
            <p class="muted">Try a different search term, or clear the filters to see everything.</p>
            <button type="button" class="btn btn-outline mt" (click)="resetFilters()">Show all products</button>
          </div>
        } @else {
          <p class="muted p-count">{{ visible().length }} product{{ visible().length === 1 ? '' : 's' }}</p>
          <div class="p-grid">
            @for (p of visible(); track p.id) {
              <article class="pcard" [class.pcard-off]="!buyable(p)">
                <div class="media">
                  <img [src]="img.src(p)" [alt]="p.name" loading="lazy"
                       width="1200" height="900" (error)="img.failed(p)" />
                  <span class="pcard-cat">{{ p.category }}</span>
                  @if (p.comingSoon) {
                    <span class="pcard-flag flag-soon">Coming soon</span>
                  } @else if (!p.available) {
                    <span class="pcard-flag flag-out">Currently unavailable</span>
                  }
                </div>

                <div class="pcard-body">
                  <h3>{{ p.name }}</h3>
                  <p class="pcard-desc clamp-2">{{ p.description }}</p>

                  <div class="pcard-line">
                    <div class="pcard-price">
                      ₹{{ p.price | number: '1.0-2' }} <span>/ {{ p.unit }}</span>
                    </div>
                    @if (buyable(p)) {
                    <div class="qty">
                      <button type="button" (click)="dec(p)" [attr.aria-label]="'Less ' + p.name">
                        <app-icon name="minus" [size]="14" [stroke]="2.6" />
                      </button>
                      <span>{{ qtyOf(p) | number: '1.0-2' }}</span>
                      <button type="button" (click)="inc(p)" [attr.aria-label]="'More ' + p.name">
                        <app-icon name="plus" [size]="14" [stroke]="2.6" />
                      </button>
                    </div>
                    } @else {
                      <span class="status-note">{{ p.comingSoon ? 'Launching shortly' : 'Back in stock soon' }}</span>
                    }
                  </div>

                  <div class="pcard-actions">
                    @if (!buyable(p)) {
                      <button type="button" class="btn btn-outline pc-add" (click)="requestProduct(p)">
                        <app-icon name="whatsapp" [size]="16" />
                        {{ p.comingSoon ? 'Notify me on launch' : 'Request this product' }}
                      </button>
                    } @else {
                    <button type="button" class="btn btn-primary pc-add" [class.done]="added[p.id!]" (click)="addToCart(p)">
                      @if (added[p.id!]) {
                        <app-icon name="check" [size]="16" [stroke]="2.4" /> Added to cart
                      } @else {
                        <app-icon name="cart" [size]="16" /> Add — ₹{{ totalOf(p) | number: '1.0-0' }}
                      }
                    </button>
                    <button type="button" class="btn btn-wa pc-wa" (click)="orderOnWhatsApp(p)"
                            [attr.aria-label]="'Order ' + p.name + ' on WhatsApp'" title="Quick-order this item on WhatsApp">
                      <app-icon name="whatsapp" [size]="18" />
                    </button>
                    }
                  </div>
                </div>
              </article>
            }
          </div>

          @if (cart.count() > 0) {
            <div class="cart-fab no-print">
              <a routerLink="/cart" class="btn btn-gold">
                <app-icon name="cart" [size]="17" />
                View cart ({{ cart.count() }}) — ₹{{ cart.total() | number: '1.0-0' }}
              </a>
            </div>
          }
        }
      </div>
    </section>
  `,
  styles: [`
    .p-toolbar { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }
    .p-search {
      display: flex; align-items: center; gap: 8px; flex: 1; min-width: 240px; max-width: 360px;
      background: #100E08; border: 1.5px solid var(--line-soft); border-radius: 999px;
      padding: 4px 8px 4px 16px; color: var(--muted);
    }
    .p-search input { border: none; background: transparent; padding: 7px 6px; }
    .p-search input:focus { outline: none; }
    .p-search:focus-within { border-color: var(--gold); }
    .p-clear {
      background: none; border: none; color: var(--muted); cursor: pointer;
      display: grid; place-items: center; padding: 6px; border-radius: 50%;
    }
    .p-clear:hover { color: var(--gold-2); background: rgba(255, 255, 255, 0.06); }
    .p-sort { width: auto; border-radius: 999px; padding: 9px 16px; font-weight: 600; font-size: 0.9rem; }
    .p-count { font-size: 0.85rem; margin-bottom: 14px; }
    .p-empty { text-align: center; padding: 52px 24px; max-width: 480px; margin: 0 auto; }
    .p-empty h3 { color: var(--gold-2); margin-bottom: 6px; }

    .p-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(268px, 1fr)); gap: 22px; }
    .pcard {
      background: var(--surface); border: 1px solid var(--line-soft); border-radius: var(--radius);
      overflow: hidden; box-shadow: var(--shadow-sm); display: flex; flex-direction: column;
      transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
    }
    .pcard:hover { border-color: var(--line); transform: translateY(-4px); box-shadow: var(--shadow); }
    .pcard-cat {
      position: absolute; top: 12px; left: 12px; z-index: 1;
      background: rgba(9, 8, 5, 0.82); color: var(--gold-2); border: 1px solid var(--line);
      font-size: 0.68rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
      padding: 4px 12px; border-radius: 999px; backdrop-filter: blur(3px);
    }
    .pcard-body { padding: 20px; display: flex; flex-direction: column; flex: 1; gap: 4px; }
    .pcard-body h3 { color: var(--ivory); font-size: 1.1rem; }
    .pcard-desc { color: var(--muted); font-size: 0.89rem; margin: 4px 0 12px; flex: 1; line-height: 1.55; }
    /* grid rather than wrapping flex: a four-figure price (₹2,200 / Kg) used to
       push the stepper onto a second line, so that one card's internals sat at a
       different height from every other card in the row */
    .pcard-line {
      display: grid; grid-template-columns: minmax(0, 1fr) auto;
      align-items: center; gap: 10px;
      margin-bottom: 14px; padding-top: 12px; border-top: 1px dashed var(--line-soft);
    }
    .pcard-price {
      font-family: var(--font-display); font-size: 1.32rem; color: var(--gold-2);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .pcard-price span { font-family: var(--font-body); font-size: 0.82rem; font-weight: 600; color: var(--muted); }

    .qty { display: inline-flex; align-items: center; gap: 4px; border: 1.5px solid var(--line-soft); border-radius: 999px; padding: 3px; background: #100E08; }
    .qty button {
      width: 28px; height: 28px; border-radius: 50%; border: none; cursor: pointer;
      background: var(--gold-grad); color: #171307;
      display: grid; place-items: center; line-height: 1;
    }
    .qty button:hover { filter: brightness(1.1); }
    .qty span { min-width: 42px; text-align: center; font-weight: 700; font-size: 0.9rem; color: var(--ivory); }

    /* Sold-out and upcoming items stay on the shelf, just visually stepped back
       so the range is still discoverable and can be requested. */
    .pcard-off .media img { filter: grayscale(0.55) brightness(0.72); }
    .pcard-off .pcard-price { color: var(--muted); }
    .pcard-flag {
      position: absolute; top: 12px; right: 12px; z-index: 2;
      font-size: 0.64rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
      padding: 5px 11px; border-radius: 999px; backdrop-filter: blur(4px);
    }
    .flag-out { background: rgba(180, 85, 63, 0.92); color: #FFF1EC; }
    .flag-soon { background: rgba(201, 162, 39, 0.94); color: #171307; }
    .status-note { font-size: 0.78rem; font-weight: 600; color: var(--clay); }
    .pcard-actions { display: flex; gap: 8px; }
    .pc-add { flex: 1; min-width: 0; }
    .pc-add.done { background: var(--ok-soft); color: var(--ok); box-shadow: none; }
    .pc-wa { padding: 11px 14px; }

    .cart-fab { position: sticky; bottom: 18px; display: flex; justify-content: center; margin-top: 28px; z-index: 40; }
    .cart-fab .btn { box-shadow: var(--shadow); }

    @media (max-width: 420px) {
      .p-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class ProductsComponent implements OnInit {
  private api = inject(ApiService);
  cart = inject(CartService);
  private toast = inject(ToastService);
  img = new ProductImage();

  products: Product[] = [];
  categories: string[] = [];
  selected = 'All';
  q = '';
  sort: 'featured' | 'price-asc' | 'price-desc' | 'name' = 'featured';
  loading = true;
  error = '';

  qty: Record<string, number> = {};
  added: Record<string, boolean> = {};

  ngOnInit() {
    this.api.getCategories().subscribe({ next: c => (this.categories = c) });
    this.load();
  }

  select(category: string) {
    this.selected = category;
    this.load();
  }

  resetFilters() {
    this.q = '';
    this.select('All');
  }

  private load() {
    this.loading = true;
    this.error = '';
    this.api.getProducts(this.selected).subscribe({
      next: list => {
        this.products = list;
        this.loading = false;
      },
      error: () => {
        this.error = 'We couldn\'t load the products right now. Please check your internet connection and try again.';
        this.loading = false;
      }
    });
  }

  visible(): Product[] {
    const q = this.q.trim().toLowerCase();
    const list = !q
      ? [...this.products]
      : this.products.filter(p =>
          (p.name + ' ' + p.category + ' ' + (p.description || '')).toLowerCase().includes(q)
        );
    switch (this.sort) {
      case 'price-asc': list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      case 'name': list.sort((a, b) => a.name.localeCompare(b.name)); break;
    }
    return list;
  }

  qtyOf(p: Product): number { return this.qty[p.id!] ?? 1; }
  inc(p: Product) { this.qty[p.id!] = Math.round((this.qtyOf(p) + 0.5) * 100) / 100; }
  dec(p: Product) {
    const next = this.qtyOf(p) - 0.5;
    this.qty[p.id!] = next < 0.5 ? 0.5 : Math.round(next * 100) / 100;
  }
  totalOf(p: Product): number { return Math.round(this.qtyOf(p) * p.price * 100) / 100; }

  /** Only in-stock, launched products can go into the cart. */
  buyable(p: Product): boolean {
    return p.available && !p.comingSoon;
  }

  /** Asks the farm for a sold-out item, or to be told when a teaser launches. */
  requestProduct(p: Product) {
    const message = p.comingSoon
      ? `Please let me know when "${p.name}" is available. I would like to order it.`
      : `Is "${p.name}" available? I would like to place an order when it is back in stock.`;
    window.open(waLink(message), '_blank');
  }

  addToCart(p: Product) {
    this.cart.add(p, this.qtyOf(p));
    this.toast.success(`${p.name} added to cart (${this.qtyOf(p)} ${p.unit})`);
    this.added[p.id!] = true;
    setTimeout(() => (this.added[p.id!] = false), 1300);
  }

  /** Quick single-item order in the exact specified WhatsApp format. */
  orderOnWhatsApp(p: Product) {
    const quantity = this.qtyOf(p);
    const total = this.totalOf(p);
    window.open(
      waLink(
        `I want to order:\n` +
        `Product: ${p.name}\n` +
        `Quantity: ${quantity} ${p.unit}\n` +
        `Price: ₹${total}\n` +
        `Please confirm my order.`
      ),
      '_blank'
    );
  }
}
