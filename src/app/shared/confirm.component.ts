import { Component, HostListener, inject } from '@angular/core';

import { ConfirmService } from '../core/confirm.service';
import { IconComponent } from './icon.component';

/**
 * The site's own confirmation dialog, shown wherever `ConfirmService.ask()` is
 * called. Lives in the root shell so any page — panel or website — can raise it.
 */
@Component({
  selector: 'app-confirm',
  standalone: true,
  imports: [IconComponent],
  template: `
    @if (confirm.pending(); as c) {
      <div class="modal-back" (click)="confirm.answer(false)">
        <div class="modal cf" role="alertdialog" aria-modal="true" aria-labelledby="cf-title"
             (click)="$event.stopPropagation()">
          <div class="cf-top">
            <span class="cf-ic" [class.danger]="c.danger !== false">
              <app-icon [name]="c.danger === false ? 'shield' : 'trash'" [size]="19" />
            </span>
            <div class="cf-text">
              <h3 id="cf-title">{{ c.title }}</h3>
              @if (c.message) { <p>{{ c.message }}</p> }
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" (click)="confirm.answer(false)">
              {{ c.cancelLabel || 'Cancel' }}
            </button>
            <button type="button" autofocus
                    [class]="c.danger === false ? 'btn btn-primary' : 'btn btn-danger'"
                    (click)="confirm.answer(true)">
              {{ c.confirmLabel || 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .cf { width: min(430px, 100%); padding: 24px; }
    .cf-top { display: flex; align-items: flex-start; gap: 15px; }
    .cf-ic {
      flex: none; width: 42px; height: 42px; border-radius: 12px;
      display: grid; place-items: center;
      color: var(--gold-2); background: rgba(228, 199, 102, 0.12);
      border: 1px solid rgba(228, 199, 102, 0.28);
    }
    .cf-ic.danger {
      color: var(--danger); background: var(--danger-soft);
      border-color: rgba(228, 104, 90, 0.35);
    }
    .cf-text { min-width: 0; }
    .cf-text h3 { margin: 3px 0 0; color: var(--ivory); font-size: 1.16rem; }
    .cf-text p { margin-top: 8px; color: var(--muted); font-size: 0.93rem; line-height: 1.55; }
  `]
})
export class ConfirmComponent {
  confirm = inject(ConfirmService);

  /** Escape dismisses, like the browser dialog it replaces. */
  @HostListener('document:keydown.escape')
  onEscape() {
    this.confirm.answer(false);
  }
}
