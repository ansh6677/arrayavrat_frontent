import { Injectable, computed, signal } from '@angular/core';

/** Counts in-flight API calls; drives the global top loading bar. */
@Injectable({ providedIn: 'root' })
export class LoaderService {
  private pending = signal(0);
  loading = computed(() => this.pending() > 0);

  show() { this.pending.update(n => n + 1); }
  hide() { this.pending.update(n => Math.max(0, n - 1)); }
}
