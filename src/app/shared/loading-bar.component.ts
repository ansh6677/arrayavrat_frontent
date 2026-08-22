import { Component, inject } from '@angular/core';

import { LoaderService } from '../core/loader.service';

/** Slim indeterminate gold bar pinned to the very top during API calls. */
@Component({
  selector: 'app-loading-bar',
  standalone: true,
  template: `
    @if (loader.loading()) {
      <div class="rail no-print" role="progressbar" aria-label="Loading">
        <div class="glow"></div>
      </div>
    }
  `,
  styles: [`
    .rail {
      position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 500;
      background: rgba(228, 199, 102, 0.12); overflow: hidden;
    }
    .glow {
      position: absolute; top: 0; bottom: 0; width: 34%;
      background: var(--gold-grad);
      border-radius: 999px;
      box-shadow: 0 0 12px rgba(228, 199, 102, 0.7);
      animation: slide 1.05s cubic-bezier(0.4, 0, 0.4, 1) infinite;
    }
    @keyframes slide {
      from { left: -34%; }
      to { left: 100%; }
    }
  `]
})
export class LoadingBarComponent {
  loader = inject(LoaderService);
}
