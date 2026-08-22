import { productPhoto } from '../core/farm';

interface HasPhoto {
  id?: string;
  imageUrl?: string;
  category?: string;
  name?: string;
}

/**
 * Resolves the photo for a product, and remembers the ones whose remote image
 * failed to load.
 *
 * Product cards previously dropped to a food emoji on a pale tile whenever the
 * backend's `imageUrl` was blank or broken, which is what made one card in a
 * row of five look like it came from a different site. Falling back to the
 * category photo instead keeps the grid uniform whatever the database holds.
 */
export class ProductImage {
  private broken = new Set<string>();

  src(p: HasPhoto): string {
    if (p.id && this.broken.has(p.id)) {
      return productPhoto({ category: p.category, name: p.name });
    }
    return productPhoto(p);
  }

  /** Bind to the `<img>` `error` event to switch that product to its local photo. */
  failed(p: HasPhoto): void {
    if (p.id) this.broken.add(p.id);
  }
}
