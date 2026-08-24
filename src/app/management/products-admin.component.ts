import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../core/api.service';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { AuthService } from '../core/auth.service';
import { STOCK_PHOTOS, productPhoto } from '../core/farm';
import { Product } from '../core/models';
import { IconComponent } from '../shared/icon.component';
import { ProductImage } from '../shared/product-image';

/** Products CRUD + price update (write actions are full-admin only). */
@Component({
  selector: 'app-products-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <h2>Products</h2>
    <p class="mgmt-sub">Update prices, photos and availability here — changes reflect instantly on the website and in new entries.</p>

    <div class="panel">
      @if (auth.isFullAdmin()) {
        <div class="toolbar">
          <button class="btn btn-primary push" (click)="startAdd()">
            <app-icon name="plus" [size]="15" [stroke]="2.4" /> Add product
          </button>
        </div>
      }

      @if (error && !formOpen) { <div class="alert alert-error">{{ error }}</div> }

      @if (loading) {
        <div class="skeleton" style="height: 260px;"></div>
      } @else {
        <div class="tbl-wrap">
          <table class="tbl" style="min-width: 700px;">
            <thead>
              <tr>
                <th class="th-ord">Order</th>
                <th class="th-photo">Photo</th>
                <th>Product</th><th>Category</th><th>Unit</th><th class="num">Price (₹)</th><th>Status</th>
                @if (auth.isFullAdmin()) { <th class="right">Actions</th> }
              </tr>
            </thead>
            <tbody>
              @for (p of products; track p.id) {
                <tr>
                  <td class="ord-cell">
                    @if (auth.isFullAdmin()) {
                      <span class="ord">
                        <button type="button" (click)="move(p, -1)" [disabled]="$index === 0 || reordering"
                                title="Move up" aria-label="Move up">▲</button>
                        <b>{{ $index + 1 }}</b>
                        <button type="button" (click)="move(p, 1)" [disabled]="$index === products.length - 1 || reordering"
                                title="Move down" aria-label="Move down">▼</button>
                      </span>
                    } @else {
                      <b class="ord-n">{{ $index + 1 }}</b>
                    }
                  </td>
                  <td>
                    <img class="p-thumb" [src]="img.src(p)" [alt]="p.name"
                         loading="lazy" (error)="img.failed(p)" />
                  </td>
                  <td>
                    <b>{{ p.name }}</b>
                    @if (!p.imageUrl) { <span class="auto-tag" title="No image set — the website falls back to the category photo">auto photo</span> }
                  </td>
                  <td class="td-order" (click)="$event.stopPropagation()">
                    @if (auth.isFullAdmin()) {
                      <input class="ord-box" type="number" min="1" step="1"
                             [ngModel]="p.sortOrder" [ngModelOptions]="{ standalone: true }"
                             (change)="setOrder(p, $event)"
                             [attr.aria-label]="'Display position for ' + p.name" />
                    } @else {
                      {{ p.sortOrder }}
                    }
                  </td>
                  <td>{{ p.category }}</td>
                  <td>{{ p.unit }}</td>
                  <td class="num">{{ p.price | number: '1.0-2' }}</td>
                  <td>
                    @if (p.comingSoon) { <span class="badge badge-gold">Coming soon</span> }
                    @else if (p.available) { <span class="badge badge-ok">Available</span> }
                    @else { <span class="badge badge-off">Not available</span> }
                  </td>
                  @if (auth.isFullAdmin()) {
                    <td class="right actions">
                      <button class="btn btn-outline btn-sm" (click)="startEdit(p)">
                        <app-icon name="edit" [size]="14" /> Edit
                      </button>
                      <button class="btn btn-danger btn-sm" (click)="remove(p)">
                        <app-icon name="trash" [size]="14" /> Delete
                      </button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    <!-- ============ Add/Edit product modal ============ -->
    @if (formOpen) {
      <div class="modal-back" (click)="formOpen = false">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>{{ editing ? 'Edit — ' + editing.name : 'New product' }}</h3>
            <button type="button" class="modal-close" (click)="formOpen = false" aria-label="Close">
              <app-icon name="close" [size]="16" [stroke]="2.2" />
            </button>
          </div>
          @if (error) { <div class="alert alert-error">{{ error }}</div> }
          <div class="form-grid">
            <div class="field">
              <label>Name <span class="req">*</span></label>
              <input name="pname" [(ngModel)]="form.name" placeholder="e.g. Pure A2 Cow Milk" />
            </div>
            <div class="field">
              <label>Unit <span class="req">*</span></label>
              <select name="punit" [(ngModel)]="form.unit">
                <option>Litre</option>
                <option>Kg</option>
                <option>Gram</option>
                <option>Piece</option>
                <option>Packet</option>
              </select>
            </div>
            <div class="field">
              <label>Price (₹ per unit) <span class="req">*</span></label>
              <input name="pprice" type="number" [(ngModel)]="form.price" min="0" step="0.5" />
            </div>
            <div class="field field-wide">
              <label>Description</label>
              <textarea name="pdesc" [(ngModel)]="form.description" placeholder="Short description shown on the website"></textarea>
            </div>
            <div class="field field-wide">
              <label>Product photo</label>
              <div class="img-row">
                <img class="img-preview" [src]="previewUrl()" alt="Selected photo" />
                <div class="img-fields">
                  <div class="img-picks">
                    @for (sp of stockPhotos; track sp.url) {
                      <button type="button" class="img-pick" [class.on]="form.imageUrl === sp.url"
                              (click)="form.imageUrl = sp.url" [title]="sp.label">
                        <img [src]="sp.url" [alt]="sp.label" loading="lazy" />
                      </button>
                    }
                    <button type="button" class="img-pick clear" [class.on]="!form.imageUrl"
                            (click)="form.imageUrl = ''" title="Automatic photo">
                      <app-icon name="close" [size]="15" [stroke]="2.2" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div class="field">
              <label>Display position <span class="hint-inline">1 shows first on the website</span></label>
              <input type="number" name="pord" [(ngModel)]="form.sortOrder" min="1" step="1" />
            </div>
            <div class="field">
              <label>Status</label>
              <select name="pstatus" [ngModel]="status()" (ngModelChange)="setStatus($event)">
                <option value="available">Available</option>
                <option value="out">Not available</option>
                <option value="soon">Coming soon</option>
              </select>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-ghost" (click)="formOpen = false">Cancel</button>
            <button class="btn btn-primary" (click)="save()" [disabled]="saving">
              @if (saving) { <span class="spinner"></span> } {{ editing ? 'Update product' : 'Save product' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`


    .th-order, .td-order { width: 84px; }
    .ord-box { width: 70px; padding: 7px 8px; text-align: center; font-weight: 700; }
    .hint-inline { font-weight: 400; font-size: 0.74rem; color: var(--muted); margin-left: 6px; }

    .th-ord { width: 74px; }
    .ord { display: inline-flex; flex-direction: column; align-items: center; gap: 2px; }
    .ord b, .ord-n { font-family: var(--font-display); color: var(--gold-2); font-size: 0.95rem; }
    .ord button {
      width: 24px; height: 20px; line-height: 1; font-size: 0.62rem; cursor: pointer;
      border: 1px solid var(--line-soft); background: #100E08; color: var(--muted); border-radius: 6px;
    }
    .ord button:hover:not(:disabled) { border-color: var(--gold); color: var(--gold-2); }
    .ord button:disabled { opacity: 0.35; cursor: default; }

    .actions { white-space: nowrap; }
    .actions .btn { margin-left: 6px; }
    .th-photo { width: 74px; }
    .p-thumb {
      width: 54px; height: 41px; object-fit: contain; border-radius: 8px;
      border: 1px solid var(--line-soft);
    }
    .auto-tag {
      display: inline-block; margin-left: 8px; padding: 1px 8px; border-radius: 999px;
      font-size: 0.68rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
      color: var(--muted); background: rgba(255, 255, 255, 0.06);
    }
    .img-row { display: flex; gap: 14px; align-items: flex-start; }
    .img-preview {
      width: 128px; height: 96px; object-fit: contain; border-radius: 10px;
      border: 1px solid var(--line-soft); background: #12100A; flex-shrink: 0;
    }
    .img-fields { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
    .img-picks { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 4px; }
    .img-pick {
      width: 50px; height: 38px; padding: 0; border-radius: 8px; overflow: hidden; cursor: pointer;
      border: 1.5px solid var(--line-soft); background: #12100A; color: var(--muted);
      display: grid; place-items: center;
      transition: border-color 0.15s ease, transform 0.15s ease;
    }
    .img-pick img { width: 100%; height: 100%; object-fit: contain; }
    .img-pick:hover { border-color: var(--gold); transform: translateY(-2px); }
    .img-pick.on { border-color: var(--gold-2); box-shadow: 0 0 0 2px rgba(228, 199, 102, 0.25); }
    .img-pick.clear:hover { color: var(--gold-2); }
    @media (max-width: 560px) {
      .img-row { flex-direction: column; }
      .img-preview { width: 100%; height: 140px; }
    }
  `]
})
export class ProductsAdminComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private confirm = inject(ConfirmService);
  auth = inject(AuthService);
  img = new ProductImage();
  stockPhotos = STOCK_PHOTOS;

  products: Product[] = [];
  loading = true;
  formOpen = false;
  editing: Product | null = null;
  saving = false;
  msg = '';
  error = '';

  form: Product = this.blank();

  /** True while a reorder round-trip is saving, so the arrows can't race. */
  reordering = false;

  ngOnInit() {
    this.load();
  }

  /** What the website would actually show for the product being edited. */
  previewUrl(): string {
    return productPhoto(this.form);
  }

  private blank(): Product {
    return { name: '', category: '', description: '', unit: 'Litre', price: 0, imageUrl: '', available: true, comingSoon: false, sortOrder: this.products.length + 1 };
  }

  load() {
    this.loading = true;
    this.api.getAdminProducts().subscribe({
      next: list => {
        // Admin table follows the display order the arrows control.
        this.products = [...list].sort((a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100) || a.name.localeCompare(b.name));
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  startAdd() {
    this.editing = null;
    this.form = this.blank();
    this.error = '';
    this.formOpen = true;
  }

  startEdit(p: Product) {
    this.editing = p;
    this.form = { ...p };
    this.error = '';
    this.formOpen = true;
  }

  /** Maps the two backing flags onto one dropdown value. */
  status(): 'available' | 'out' | 'soon' {
    if (this.form.comingSoon) return 'soon';
    return this.form.available ? 'available' : 'out';
  }

  setStatus(value: 'available' | 'out' | 'soon') {
    this.form.comingSoon = value === 'soon';
    this.form.available = value === 'available';
  }

  /**
   * Category is no longer typed in — it is read from the product name so the
   * website's category filter keeps working without another field to fill.
   */
  private deriveCategory(name: string): string {
    const n = (name || '').toLowerCase();
    const map: [RegExp, string][] = [
      [/butter\s*milk|chaach|chhach|lassi/, 'Buttermilk'],
      [/ghee/, 'Ghee'],
      [/paneer|cheese/, 'Paneer'],
      [/curd|dahi|yogh?urt/, 'Curd'],
      [/milk|doodh|dudh/, 'Milk'],
      [/mushroom|khumb/, 'Mushroom'],
      [/turmeric|haldi/, 'Turmeric'],
      [/spice|masala|chilli|mirch|coriander|dhania|cumin|jeera/, 'Spices'],
      [/honey|shahad/, 'Honey'],
      [/egg|anda/, 'Eggs'],
      [/vegetable|sabzi|sabji|greens/, 'Vegetables'],
      [/khoya|khoa|mawa|malai|cream/, 'Khoya'],
      [/lassi/, 'Lassi'],
      [/makhan|white butter|butter/, 'Butter'],
      [/sweet|mithai|peda|barfi|burfi|laddu|ladoo|rasgulla|kalakand/, 'Sweets']
    ];
    for (const [pattern, category] of map) {
      if (pattern.test(n)) return category;
    }
    return 'Other';
  }

  /**
   * Moves a product one step in the display order. Positions are rewritten
   * as 1..n around the swap, and only the rows whose number actually changed
   * are saved — first click may touch several (old data all shared the same
   * default), after that it's just the two neighbours.
   */
  move(p: Product, dir: -1 | 1) {
    const i = this.products.indexOf(p);
    const j = i + dir;
    if (j < 0 || j >= this.products.length || this.reordering) return;

    const next = [...this.products];
    [next[i], next[j]] = [next[j], next[i]];

    const changed = next
      .map((prod, idx) => ({ prod, order: idx + 1 }))
      .filter(x => (x.prod.sortOrder ?? 100) !== x.order);
    if (changed.length === 0) return;

    this.reordering = true;
    let pending = changed.length;
    for (const x of changed) {
      this.api.updateProduct(x.prod.id!, { ...x.prod, sortOrder: x.order }).subscribe({
        next: () => { x.prod.sortOrder = x.order; if (--pending === 0) this.finishMove(next); },
        error: err => {
          this.reordering = false;
          this.toast.error(err?.error?.error || 'Could not save the new order.');
        }
      });
    }
  }

  private finishMove(next: Product[]) {
    this.products = next;
    this.reordering = false;
  }

  /** Inline table edit: type 1, 2, 3… and the website reorders instantly. */
  setOrder(p: Product, ev: Event) {
    const value = Math.max(1, Math.round(Number((ev.target as HTMLInputElement).value) || 100));
    this.api.updateProduct(p.id!, { ...p, sortOrder: value }).subscribe({
      next: () => {
        this.toast.success(`"${p.name}" moved to position ${value}.`);
        this.load();
      },
      error: err => this.toast.error(err?.error?.error || 'Could not update the position.')
    });
  }


  save() {
    this.error = '';
    this.msg = '';
    if (!this.form.name.trim()) { this.error = 'Product name is required.'; return; }
    // Keep an existing category when editing; fill it in for new products.
    this.form.category = this.form.category?.trim() || this.deriveCategory(this.form.name);
    if (!this.form.price || this.form.price <= 0) { this.error = 'Price must be greater than 0.'; return; }

    this.saving = true;
    const done = (message: string) => {
      this.saving = false;
      this.formOpen = false;
      this.toast.success(message);
      this.load();
    };
    const fail = (err: any) => {
      this.saving = false;
      this.error = err?.error?.error || 'Could not save. Please try again.';
    };

    if (this.editing) {
      this.api.updateProduct(this.editing.id!, this.form).subscribe({ next: () => done('Product updated.'), error: fail });
    } else {
      this.api.addProduct(this.form).subscribe({ next: () => done('Product added.'), error: fail });
    }
  }

  async remove(p: Product) {
    const ok = await this.confirm.ask({
      title: 'Delete this product?',
      message: `"${p.name}" will disappear from the website and from new entries. Past entries are not affected.`,
      confirmLabel: 'Delete product'
    });
    if (!ok) return;
    this.api.deleteProduct(p.id!).subscribe({
      next: () => {
        this.toast.success('Product deleted.');
        this.load();
      },
      error: err => this.toast.error(err?.error?.error || 'Delete failed.')
    });
  }
}
