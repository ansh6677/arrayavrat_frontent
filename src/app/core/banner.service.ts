import { Injectable, inject, signal } from '@angular/core';

import { ApiService } from './api.service';
import { BannerInfo } from './models';

/**
 * The farm's own announcement strip.
 *
 * Starts empty and stays empty if the lookup fails — a strip is a nice-to-have,
 * and a broken one must never push the page down or show a stale notice.
 */
@Injectable({ providedIn: 'root' })
export class BannerService {
  private api = inject(ApiService);

  info = signal<BannerInfo>({ enabled: false, messages: [], tone: 'gold' });
  private loaded = false;

  load() {
    if (this.loaded) return;
    this.loaded = true;
    this.api.getBanner().subscribe({
      next: res => this.info.set({
        enabled: !!res?.enabled,
        messages: res?.enabled ? (res.messages || []).filter(m => !!(m || '').trim()) : [],
        tone: res?.tone || 'gold'
      }),
      error: () => { this.loaded = false; }
    });
  }
}
