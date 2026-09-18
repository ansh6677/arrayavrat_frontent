import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../core/api.service';
import { saveBlob } from '../core/download';
import { ConfirmService } from '../core/confirm.service';
import { ToastService } from '../core/toast.service';
import { AuthService } from '../core/auth.service';
import { STOCK_PHOTOS, photoSrc, productPhoto } from '../core/farm';
import { Product, ProductVariant } from '../core/models';
import { IconComponent } from '../shared/icon.component';
import { ProductImage } from '../shared/product-image';

/** Products CRUD + price update (write actions are full-admin only). */
/**
 * Pack sizes offered as one tap in the form, by base unit.
 *
 * These only fill the row in — the price that lands is a suggestion from the
 * base rate, and the whole point of packs is that the farm then changes it:
 * half a kilo of paneer sells at Rs. 230, not the Rs. 210 the arithmetic gives.
 */
const PACK_PRESETS: Readonly<Record<string, ReadonlyArray<{ label: string; quantity: number }>>> = {
  litre: [
    { label: '250 ml', quantity: 0.25 },
    { label: '500 ml', quantity: 0.5 },
    { label: '1 Litre', quantity: 1 },
    { label: '2 Litre', quantity: 2 },
    { label: '5 Litre', quantity: 5 }
  ],
  kg: [
    { label: '100 g', quantity: 0.1 },
    { label: '200 g', quantity: 0.2 },
    { label: '250 g', quantity: 0.25 },
    { label: '400 g', quantity: 0.4 },
    { label: '500 g', quantity: 0.5 },
    { label: '750 g', quantity: 0.75 },
    { label: '1 kg', quantity: 1 },
    { label: '2 kg', quantity: 2 }
  ],
  gram: [
    { label: '100 g', quantity: 100 },
    { label: '200 g', quantity: 200 },
    { label: '250 g', quantity: 250 },
    { label: '500 g', quantity: 500 },
    { label: '1 kg', quantity: 1000 }
  ],
  piece: [
    { label: '1 piece', quantity: 1 },
    { label: '6 pieces', quantity: 6 },
    { label: '12 pieces', quantity: 12 }
  ],
  packet: [
    { label: '1 packet', quantity: 1 },
    { label: '2 packets', quantity: 2 },
    { label: '5 packets', quantity: 5 }
  ]
};

@Component({
  selector: 'app-products-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <h2>Products</h2>
    <p class="mgmt-sub">Update prices, photos and availability here — changes reflect instantly on the website and in new entries.</p>

    <div class="panel">
      <div class="toolbar">
        <button class="btn btn-outline" (click)="exportCsv()" [disabled]="exporting"
                title="Download the product list as CSV">
          @if (exporting) { <span class="spinner"></span> } @else { <app-icon name="download" [size]="15" /> }
          Export CSV
        </button>
        @if (auth.isFullAdmin()) {
          <button class="btn btn-primary push" (click)="startAdd()">
            <app-icon name="plus" [size]="15" [stroke]="2.4" /> Add product
          </button>
        }
      </div>

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
                  <td class="num">
                    {{ p.price | number: '1.0-2' }}
                    @if (p.variants && p.variants.length > 0) {
                      <div class="pk-count">{{ p.variants.length }} pack{{ p.variants.length === 1 ? '' : 's' }}</div>
                    }
                  </td>
                  <td>
                    @if (p.comingSoon) { <span class="badge badge-gold">Coming soon</span> }
                    @else if (p.available) { <span class="badge badge-ok">Available</span> }
                    @else { <span class="badge badge-off">Out of stock</span> }
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
              <label>Product photos <span class="hint-inline">first one is the cover · swipe order on the website</span></label>
              <div class="img-row">
                <img class="img-preview" [src]="previewUrl()" alt="Selected photo" />
                <div class="img-fields">

                  @if (gallery().length > 0) {
                    <div class="shots">
                      @for (url of gallery(); track url; let i = $index) {
                        <div class="shot" [class.cover]="i === 0">
                          <img [src]="shot(url)" [alt]="'Photo ' + (i + 1)" loading="lazy" />
                          @if (i === 0) { <span class="shot-tag">Cover</span> }
                          <div class="shot-acts">
                            @if (i > 0) {
                              <button type="button" (click)="moveShot(i, -1)" title="Move left">‹</button>
                              <button type="button" (click)="makeCover(i)" title="Make this the cover">★</button>
                            }
                            @if (i < gallery().length - 1) {
                              <button type="button" (click)="moveShot(i, 1)" title="Move right">›</button>
                            }
                            <button type="button" class="del" (click)="removeShot(i)" title="Remove">✕</button>
                          </div>
                        </div>
                      }
                    </div>
                  }

                  <div class="up-row">
                    <label class="btn btn-outline btn-sm up-btn" [class.busy]="uploading > 0">
                      @if (uploading > 0) {
                        <span class="spinner"></span> Uploading {{ uploading }}…
                      } @else {
                        <app-icon name="plus" [size]="14" /> Add photos
                      }
                      <input type="file" accept="image/jpeg,image/png,image/webp" multiple
                             (change)="pickFiles($event)" [disabled]="uploading > 0" />
                    </label>
                    <span class="hint-inline">Phone se seedha — JPG, PNG ya WebP, 12 MB tak. Bade photo apne aap chhote ho jaate hain.</span>
                  </div>

                  <p class="stock-head">Or pick a stock photo</p>
                  <div class="img-picks">
                    @for (sp of stockPhotos; track sp.url) {
                      <button type="button" class="img-pick" [class.on]="gallery().includes(sp.url)"
                              (click)="useStock(sp.url)" [title]="sp.label">
                        <img [src]="sp.url" [alt]="sp.label" loading="lazy" />
                      </button>
                    }
                    <button type="button" class="img-pick clear" [class.on]="!form.imageUrl"
                            (click)="clearPhotos()" title="Automatic photo">
                      <app-icon name="close" [size]="15" [stroke]="2.2" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div class="field field-wide">
              <label>Pack sizes <span class="hint-inline">leave empty to sell by loose quantity</span></label>
              <span class="hint">
                Each pack carries its own price, so a small pack can cost more per {{ form.unit | lowercase }}
                than the base rate — half a kg of paneer at ₹230 rather than ₹210.
              </span>
              @if (form.variants && form.variants.length > 0) {
                <div class="pk-head">
                  <span>Label</span><span>Holds ({{ form.unit }})</span><span>Price (₹)</span><span></span><span></span>
                </div>
                @for (v of form.variants; track $index) {
                  <div class="pk-row">
                    <input [(ngModel)]="v.label" [name]="'vl' + $index" placeholder="Half kg" />
                    <input type="number" [(ngModel)]="v.quantity" [name]="'vq' + $index" min="0" step="0.05" placeholder="0.5" />
                    <input type="number" [(ngModel)]="v.price" [name]="'vp' + $index" min="0" step="5" placeholder="230" />
                    <span class="pk-rate" [class.over]="ratePremium(v) > 0">{{ rateHint(v) }}</span>
                    <button type="button" class="pk-del" (click)="removePack($index)"
                            [attr.aria-label]="'Remove pack ' + (v.label || $index + 1)">
                      <app-icon name="trash" [size]="14" />
                    </button>
                  </div>
                }
              }
              @if (packPresets().length > 0) {
                <div class="pk-quick">
                  <span class="pk-quick-lbl">Quick add</span>
                  @for (s of packPresets(); track s.label) {
                    <button type="button" class="pk-chip" (click)="addPreset(s)"
                            [title]="'Add a ' + s.label + ' pack'">
                      {{ s.label }}
                      @if (suggestPrice(s.quantity) > 0) {
                        <em>₹{{ suggestPrice(s.quantity) | number: '1.0-2' }}</em>
                      }
                    </button>
                  }
                </div>
              }
              <button type="button" class="btn btn-outline btn-sm pk-add" (click)="addPack()">
                <app-icon name="plus" [size]="14" [stroke]="2.4" /> Add a pack size
              </button>
            </div>

            <div class="field">
              <label>Display position <span class="hint-inline">1 shows first on the website</span></label>
              <input type="number" name="pord" [(ngModel)]="form.sortOrder" min="1" step="1" />
            </div>
            <div class="field">
              <label>Status</label>
              <select name="pstatus" [ngModel]="status()" (ngModelChange)="setStatus($event)">
                <option value="available">Available</option>
                <option value="out">Out of stock</option>
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


    .pk-head, .pk-row {
      display: grid; grid-template-columns: 1.2fr 0.9fr 0.9fr 1fr 34px;
      gap: 8px; align-items: center;
    }
    .pk-head { margin: 10px 0 2px; font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
    .pk-row { margin-bottom: 7px; }
    .pk-row input { height: 38px; }
    .pk-rate { font-size: 0.76rem; color: var(--muted); }
    .pk-rate.over { color: var(--gold-2); }
    .pk-del {
      width: 32px; height: 32px; border-radius: 9px; cursor: pointer;
      display: grid; place-items: center;
      background: var(--danger-soft); border: none; color: var(--danger);
    }
    .pk-del:hover { background: rgba(228, 104, 90, 0.28); }
    .pk-add { margin-top: 6px; }
    .pk-count { font-size: 0.7rem; color: var(--gold-2); font-weight: 700; }
    @media (max-width: 620px) {
      .pk-head { display: none; }
      .pk-row { grid-template-columns: 1fr 1fr; }
      .pk-rate { grid-column: 1 / -1; }
    }

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
    .pk-quick { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 4px 0 10px; }
    .pk-quick-lbl { font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-right: 2px; }
    .pk-chip {
      display: inline-flex; align-items: baseline; gap: 5px;
      padding: 5px 11px; border-radius: 999px; cursor: pointer;
      border: 1px dashed var(--line); background: transparent; color: var(--ivory);
      font-family: var(--font-body); font-size: 0.8rem;
    }
    .pk-chip em { font-style: normal; color: var(--muted); font-size: 0.72rem; }
    .pk-chip:hover { border-style: solid; border-color: var(--gold); background: var(--ghee-soft); }
    .pk-chip:hover em { color: var(--gold-2); }

    .shots { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
    .shot {
      position: relative; width: 84px; height: 64px; border-radius: 9px; overflow: hidden;
      border: 1.5px solid var(--line-soft); background: #12100A;
    }
    .shot.cover { border-color: var(--gold-2); box-shadow: 0 0 0 2px rgba(228, 199, 102, 0.22); }
    .shot img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .shot-tag {
      position: absolute; left: 0; bottom: 0; padding: 1px 6px;
      font-size: 0.6rem; letter-spacing: 0.08em; text-transform: uppercase;
      background: var(--gold); color: #171307; border-top-right-radius: 6px;
    }
    /* Controls sit on the thumbnail itself: a row of 6 photos with buttons
       underneath each would push the rest of the form off a phone screen. */
    .shot-acts { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 2px;
      background: rgba(10, 8, 4, 0.72); opacity: 0; transition: opacity 0.15s ease; }
    .shot:hover .shot-acts, .shot:focus-within .shot-acts { opacity: 1; }
    .shot-acts button {
      border: none; background: rgba(255, 255, 255, 0.12); color: var(--ivory);
      width: 22px; height: 22px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; line-height: 1;
    }
    .shot-acts button:hover { background: var(--gold); color: #171307; }
    .shot-acts .del:hover { background: var(--danger); color: #fff; }
    @media (hover: none) { .shot-acts { opacity: 1; background: rgba(10, 8, 4, 0.45); } }

    .up-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
    .up-btn { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 6px; }
    .up-btn input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    .up-btn.busy { pointer-events: none; opacity: 0.7; }
    .stock-head { font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin: 0 0 6px; }

    @media (max-width: 560px) {
      .img-row { flex-direction: column; }
      .img-preview { width: 100%; height: 140px; }
      .shot { width: 72px; height: 56px; }
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

  /** How many uploads are still in flight, so the button can say so. */
  uploading = 0;

  /** What the website would actually show for the product being edited. */
  previewUrl(): string {
    return productPhoto(this.form);
  }

  /* ---------------- photo gallery ---------------- */

  /**
   * The gallery as stored. An older product has only `imageUrl`, so it is read
   * as a one-photo gallery rather than migrated — nothing is rewritten until
   * the staff member actually saves a change.
   */
  gallery(): string[] {
    const list = (this.form.images || []).filter(u => !!(u || '').trim());
    if (list.length > 0) return list;
    return this.form.imageUrl?.trim() ? [this.form.imageUrl.trim()] : [];
  }

  /** Thumbnail source for a stored reference. */
  shot(url: string): string {
    return photoSrc(url);
  }

  private setGallery(list: string[]) {
    this.form.images = list;
    // The cover is mirrored into imageUrl so cards, the cart and the bill PDF
    // keep showing the right photo without knowing about galleries.
    this.form.imageUrl = list[0] || '';
  }

  pickFiles(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';                       // same file twice should still work
    if (files.length === 0) return;

    this.uploading = files.length;
    for (const file of files) {
      this.api.uploadImage(file).subscribe({
        next: res => {
          this.setGallery([...this.gallery(), res.url]);
          this.uploading--;
        },
        error: err => {
          this.uploading--;
          this.toast.error(err?.error?.message || err?.error?.error || `${file.name} upload nahi hua.`);
        }
      });
    }
  }

  removeShot(i: number) {
    const list = [...this.gallery()];
    list.splice(i, 1);
    this.setGallery(list);
  }

  moveShot(i: number, by: number) {
    const list = [...this.gallery()];
    const to = i + by;
    if (to < 0 || to >= list.length) return;
    [list[i], list[to]] = [list[to], list[i]];
    this.setGallery(list);
  }

  makeCover(i: number) {
    const list = [...this.gallery()];
    const [pick] = list.splice(i, 1);
    this.setGallery([pick, ...list]);
  }

  /** A stock pick joins the gallery instead of replacing it. */
  useStock(url: string) {
    const list = this.gallery();
    if (list.includes(url)) return;
    this.setGallery([...list, url]);
  }

  clearPhotos() {
    this.setGallery([]);
  }

  private blank(): Product {
    return { name: '', category: '', description: '', unit: 'Litre', price: 0, imageUrl: '', images: [], available: true, comingSoon: false, sortOrder: this.products.length + 1, variants: [] };
  }

  /* ---------------- pack sizes ---------------- */

  addPack() {
    if (!this.form.variants) this.form.variants = [];
    this.form.variants.push({ label: '', quantity: 0, price: 0, available: true });
  }

  /** Sizes worth offering for the unit currently chosen, minus the ones already added. */
  packPresets(): ReadonlyArray<{ label: string; quantity: number }> {
    const list = PACK_PRESETS[(this.form.unit || '').trim().toLowerCase()] || [];
    const taken = (this.form.variants || []);
    return list.filter(s => !taken.some(v =>
      v.label.trim().toLowerCase() === s.label.toLowerCase() || Math.abs(v.quantity - s.quantity) < 1e-9));
  }

  /**
   * The straight-line price for a pack, rounded to something a shop would
   * actually charge. It is only ever a starting point — the row stays editable,
   * and the rate hint beside it shows the moment the farm prices it higher.
   */
  suggestPrice(quantity: number): number {
    const raw = (this.form.price || 0) * quantity;
    if (raw <= 0) return 0;
    return raw < 20 ? Math.round(raw) : Math.round(raw / 5) * 5;
  }

  addPreset(size: { label: string; quantity: number }) {
    if (!this.form.variants) this.form.variants = [];
    this.form.variants.push({
      label: size.label,
      quantity: size.quantity,
      price: this.suggestPrice(size.quantity),
      available: true
    });
  }

  removePack(index: number) {
    this.form.variants?.splice(index, 1);
  }

  /** What this pack works out to per base unit. */
  packRate(v: ProductVariant): number {
    return v.quantity > 0 ? Math.round((v.price / v.quantity) * 100) / 100 : 0;
  }

  /** How far above the base rate this pack sits — the grace amount, made visible. */
  ratePremium(v: ProductVariant): number {
    if (!v.quantity || !this.form.price) return 0;
    return Math.round((this.packRate(v) - this.form.price) * 100) / 100;
  }

  /**
   * Shown live as the price is typed, so the premium on a small pack is a
   * decision rather than something discovered later on a bill.
   */
  rateHint(v: ProductVariant): string {
    if (!v.quantity || !v.price) return '';
    const rate = this.packRate(v);
    const premium = this.ratePremium(v);
    const base = `₹${rate}/${this.form.unit}`;
    if (premium > 0) return `${base} · ₹${premium} above base`;
    if (premium < 0) return `${base} · ₹${Math.abs(premium)} below base`;
    return base;
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

  exporting = false;

  exportCsv() {
    if (this.exporting) return;
    this.exporting = true;
    this.api.downloadCsv('products.csv').subscribe({
      next: blob => { saveBlob(blob, 'products.csv'); this.exporting = false; },
      error: () => (this.exporting = false)
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
    // Packs are copied, not shared: editing a row then cancelling must not
    // leave the table showing changes that were never saved.
    this.form = { ...p, variants: (p.variants || []).map(v => ({ ...v })) };
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

    // Rows left completely blank are dropped rather than rejected — tapping
    // "Add a pack size" and changing your mind shouldn't block the save.
    const packs = (this.form.variants || []).filter(v => v.label.trim() || v.quantity > 0 || v.price > 0);
    for (const v of packs) {
      if (!v.label.trim()) { this.error = 'Every pack needs a label, e.g. "Half kg".'; return; }
      if (!v.quantity || v.quantity <= 0) { this.error = `Pack "${v.label}" needs how much ${this.form.unit} it holds.`; return; }
      if (!v.price || v.price <= 0) { this.error = `Pack "${v.label}" needs a price greater than 0.`; return; }
    }
    const labels = packs.map(v => v.label.trim().toLowerCase());
    if (new Set(labels).size !== labels.length) { this.error = 'Two packs share the same label.'; return; }
    this.form.variants = packs;

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
