import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  text: string;
  leaving?: boolean;
}

/** App-wide toast notifications — rendered by <app-toasts> in the root shell. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);
  private seq = 0;

  success(text: string, ttl = 3800) { this.push('success', text, ttl); }
  error(text: string, ttl = 5000) { this.push('error', text, ttl); }
  info(text: string, ttl = 3800) { this.push('info', text, ttl); }

  private push(type: ToastType, text: string, ttl: number) {
    const id = ++this.seq;
    this.toasts.update(list => [...list.slice(-3), { id, type, text }]);
    setTimeout(() => this.dismiss(id), ttl);
  }

  dismiss(id: number) {
    // play the leave animation, then remove
    this.toasts.update(list => list.map(t => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => this.toasts.update(list => list.filter(t => t.id !== id)), 240);
  }
}
