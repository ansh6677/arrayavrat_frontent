import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CouponService } from '../core/coupon.service';
import { ToastService } from '../core/toast.service';

interface TickerItem {
  text: string;
  code: string;
}

/**
 * The running-offers ticker, directly under the site header.
 *
 * A marquee rather than a static bar: one line of gold that keeps moving reads
 * as a live announcement, and it lets several phrases share a strip that is
 * only 40px tall. Tapping any phrase applies its code to the cart, so the gap
 * between "sees a code" and "has to remember a code" never opens.
 */
@Component({
  selector: 'app-offer-strip',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (marquee().length > 0) {
      <div class="ticker no-print" role="region" aria-label="Running offers">
        <div class="tk-track" [style.animation-duration.s]="duration()">
          <div class="tk-set">
            @for (item of marquee(); track $index) {
              <button type="button" class="tk-item" (click)="use(item.code)"
                      [attr.title]="'Apply ' + item.code + ' to your cart'">
                <span class="tk-star" aria-hidden="true">&#10022;</span>
                <span>{{ item.text }}</span>
              </button>
            }
          </div>
          <!-- Second copy makes the loop seamless; hidden so it isn't read twice. -->
          <div class="tk-set" aria-hidden="true">
            @for (item of marquee(); track $index) {
              <button type="button" class="tk-item" tabindex="-1" (click)="use(item.code)">
                <span class="tk-star">&#10022;</span>
                <span>{{ item.text }}</span>
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .ticker {
      overflow: hidden;
      background: var(--gold-grad);
      border-bottom: 1px solid rgba(23, 19, 7, 0.22);
    }
    .tk-track {
      display: flex;
      width: max-content;
      animation-name: tk-scroll;
      animation-timing-function: linear;
      animation-iteration-count: infinite;
    }
    /* Half the track is exactly one set, so the reset is invisible. */
    @keyframes tk-scroll {
      from { transform: translateX(0); }
      to { transform: translateX(-50%); }
    }
    .ticker:hover .tk-track, .ticker:focus-within .tk-track { animation-play-state: paused; }

    .tk-set { display: flex; flex: none; }
    .tk-item {
      display: inline-flex; align-items: center; gap: 18px;
      padding: 11px 0 11px 18px; white-space: nowrap; cursor: pointer;
      background: none; border: none; color: #171307;
      font-family: var(--font-body); font-size: 0.78rem; font-weight: 800;
      letter-spacing: 0.13em; text-transform: uppercase;
    }
    .tk-item:hover { color: #000; }
    .tk-item:focus-visible { outline: 2px solid #171307; outline-offset: -3px; }
    .tk-star { font-size: 0.72rem; color: rgba(23, 19, 7, 0.55); }

    @media (max-width: 720px) {
      .tk-item { font-size: 0.7rem; gap: 14px; padding-left: 14px; letter-spacing: 0.1em; }
    }

    /*
      Motion off: the strip stops dead and becomes a normal scrollable row, so
      the offers are still reachable without anything moving on screen.
    */
    @media (prefers-reduced-motion: reduce) {
      .tk-track { animation: none; }
      .ticker { overflow-x: auto; }
      .tk-set:last-child { display: none; }
    }
  `]
})
export class OfferStripComponent implements OnInit {
  private coupons = inject(CouponService);
  private toast = inject(ToastService);

  /**
   * Phrases to scroll. Each offer contributes its headline and its code as
   * separate beats, which reads better than one long sentence going past.
   */
  private phrases = computed<TickerItem[]>(() => {
    const out: TickerItem[] = [];
    for (const o of this.coupons.offers()) {
      out.push({ text: o.title, code: o.code });
      out.push({ text: `Use code ${o.code}`, code: o.code });
      if (o.description) out.push({ text: o.description, code: o.code });
    }
    return out;
  });

  /**
   * One offer is the normal case and would leave most of the strip empty, so
   * the phrase list is repeated until it is long enough to fill a wide screen.
   */
  marquee = computed<TickerItem[]>(() => {
    const base = this.phrases();
    if (base.length === 0) return [];
    const out = [...base];
    while (out.length < 8) out.push(...base);
    return out;
  });

  /** Scales with content so the text always crosses at the same speed. */
  duration = computed(() => Math.max(18, this.marquee().length * 4.5));

  ngOnInit() {
    this.coupons.loadOffers();
  }

  use(code: string) {
    const offer = this.coupons.offers().find(o => o.code === code);
    if (!offer) return;

    this.coupons.apply({ code: offer.code, title: offer.title, percentOff: offer.percentOff });
    // Clipboard is a bonus, not the mechanism — it is blocked on plain HTTP and
    // in some in-app browsers, and the coupon is already applied by then.
    try { navigator.clipboard?.writeText(code); } catch { /* no clipboard */ }
    this.toast.success(`${code} applied — ${offer.percentOff}% off at checkout.`);
  }
}
