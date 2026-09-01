import { Component } from '@angular/core';

import { waLink } from '../core/farm';
import { IconComponent } from './icon.component';

/**
 * The classic floating WhatsApp button — fixed at the bottom-right of every
 * public page, one tap opens the farm's chat with a ready opener line.
 *
 * Layering: z-index 80 keeps it above the page and the sticky navbar (60),
 * but under the mobile drawer (90/95), the welcome popup (120) and modals
 * (300), so overlays always cover it instead of fighting it.
 */
@Component({
  selector: 'app-whatsapp-fab',
  standalone: true,
  imports: [IconComponent],
  template: `
    <a class="wa-fab no-print" [href]="wa" target="_blank" rel="noopener"
       aria-label="Order on WhatsApp" title="Order on WhatsApp">
      <span class="wa-fab-pulse" aria-hidden="true"></span>
      <app-icon name="whatsapp" [size]="26" [stroke]="1.9" />
    </a>
  `,
  styles: [`
    .wa-fab {
      position: fixed;
      right: 18px;
      /* clears the iPhone home-indicator / Android gesture bar */
      bottom: calc(18px + env(safe-area-inset-bottom, 0px));
      z-index: 80;
      width: 56px; height: 56px; border-radius: 50%;
      display: grid; place-items: center;
      background: var(--wa); color: #06130A;
      border: 1px solid rgba(228, 199, 102, 0.35);
      box-shadow: 0 10px 26px -8px rgba(0, 0, 0, 0.7), 0 0 0 4px rgba(31, 174, 85, 0.14);
      transition: transform 0.16s ease, background 0.16s ease;
    }
    .wa-fab:hover { background: #2BC968; transform: translateY(-2px) scale(1.05); }
    .wa-fab:active { transform: scale(0.96); }
    .wa-fab:focus-visible { outline: 3px solid var(--gold-2); outline-offset: 3px; }

    /* soft breathing halo so the button is noticed without being loud */
    .wa-fab-pulse {
      position: absolute; inset: 0; border-radius: 50%;
      border: 2px solid rgba(31, 174, 85, 0.55);
      animation: wa-pulse 2.6s ease-out infinite;
      pointer-events: none;
    }
    @keyframes wa-pulse {
      0%   { transform: scale(1);    opacity: 0.8; }
      70%  { transform: scale(1.55); opacity: 0; }
      100% { transform: scale(1.55); opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .wa-fab-pulse { animation: none; opacity: 0; }
      .wa-fab, .wa-fab:hover { transition: none; transform: none; }
    }

    @media (max-width: 640px) {
      .wa-fab { right: 14px; bottom: calc(14px + env(safe-area-inset-bottom, 0px)); width: 52px; height: 52px; }
    }
  `]
})
export class WhatsappFabComponent {
  wa = waLink();
}
