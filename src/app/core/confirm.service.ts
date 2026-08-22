import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  /** The question, as a heading — "Delete this expense?" */
  title: string;
  /** What exactly is being acted on, and whether it can be undone. */
  message?: string;
  /** Label on the confirming button. Defaults to "Delete". */
  confirmLabel?: string;
  /** Label on the dismissing button. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Destructive actions get the red button and the bin icon. Defaults to true. */
  danger?: boolean;
}

interface PendingConfirm extends ConfirmRequest {
  resolve: (ok: boolean) => void;
}

/**
 * App-wide confirmation dialog — rendered by <app-confirm> in the root shell.
 *
 * Replaces `window.confirm`, which draws the browser's own grey box: it ignores
 * the site's theme, cannot say which record is about to go, and on mobile shows
 * the page's URL above the question. This asks the same thing in the panel's own
 * styling and awaits an answer:
 *
 * ```ts
 * if (!await this.confirm.ask({ title: 'Delete this entry?' })) return;
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  /** The dialog currently on screen, or null. */
  pending = signal<PendingConfirm | null>(null);

  ask(request: ConfirmRequest): Promise<boolean> {
    // A second question while one is open would strand the first promise
    // forever, so answer it "no" before taking over the dialog.
    this.pending()?.resolve(false);
    return new Promise<boolean>(resolve => this.pending.set({ ...request, resolve }));
  }

  answer(ok: boolean) {
    const current = this.pending();
    if (!current) {
      return;
    }
    this.pending.set(null);
    current.resolve(ok);
  }
}
