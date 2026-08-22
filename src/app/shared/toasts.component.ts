import { Component, inject } from '@angular/core';

import { ToastService } from '../core/toast.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-toasts',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="stack no-print" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class]="t.type" [class.leaving]="t.leaving">
          <span class="tic">
            @switch (t.type) {
              @case ('success') { <app-icon name="check" [size]="15" [stroke]="2.4" /> }
              @case ('error') { <app-icon name="close" [size]="14" [stroke]="2.4" /> }
              @default { <app-icon name="star" [size]="14" [stroke]="2" /> }
            }
          </span>
          <span class="txt">{{ t.text }}</span>
          <button class="x" (click)="toast.dismiss(t.id)" aria-label="Dismiss">
            <app-icon name="close" [size]="13" [stroke]="2" />
          </button>
          <span class="bar"></span>
        </div>
      }
    </div>
  `,
  styles: [`
    .stack {
      position: fixed; top: 16px; right: 16px; z-index: 400;
      display: flex; flex-direction: column; gap: 10px;
      width: min(380px, calc(100vw - 32px));
      pointer-events: none;
    }
    .toast {
      pointer-events: auto;
      position: relative; overflow: hidden;
      display: flex; align-items: center; gap: 12px;
      background: linear-gradient(160deg, #1B1810, #12100A);
      border: 1px solid var(--line); border-radius: 14px;
      padding: 13px 14px 15px;
      box-shadow: 0 18px 44px -14px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(228, 199, 102, 0.05);
      animation: toastIn 0.32s cubic-bezier(0.21, 1.02, 0.55, 1);
    }
    .toast.leaving { animation: toastOut 0.24s ease forwards; }
    @keyframes toastIn { from { transform: translateX(24px); opacity: 0; } to { transform: none; opacity: 1; } }
    @keyframes toastOut { to { transform: translateX(24px); opacity: 0; } }
    .tic {
      flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%;
      display: grid; place-items: center; color: #14110A;
    }
    .success .tic { background: linear-gradient(135deg, #9ACE84, #6FAE58); }
    .error .tic { background: linear-gradient(135deg, #F28270, #D6553F); }
    .info .tic { background: var(--gold-grad); }
    .txt { flex: 1; font-size: 0.9rem; font-weight: 600; color: var(--ivory); line-height: 1.45; }
    .x {
      flex-shrink: 0; background: none; border: none; cursor: pointer;
      color: var(--muted); padding: 4px; border-radius: 8px; display: inline-flex;
    }
    .x:hover { color: var(--gold-2); background: rgba(228, 199, 102, 0.08); }
    .bar {
      position: absolute; left: 0; bottom: 0; height: 2.5px; width: 100%;
      transform-origin: left; animation: toastBar 3.8s linear forwards;
    }
    .success .bar { background: linear-gradient(90deg, #9ACE84, #6FAE58); }
    .error .bar { background: linear-gradient(90deg, #F28270, #D6553F); animation-duration: 5s; }
    .info .bar { background: var(--gold-grad); }
    @keyframes toastBar { from { transform: scaleX(1); } to { transform: scaleX(0); } }
  `]
})
export class ToastsComponent {
  toast = inject(ToastService);
}
