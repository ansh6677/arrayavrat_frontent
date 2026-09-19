import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BannerService } from '../core/banner.service';

/**
 * The announcement strip under the site header.
 *
 * Whatever the farm types in the management panel is what appears here — a
 * holiday notice, a new arrival, a phone number. It used to be wired to the
 * offers table, which meant the only way to say anything was to invent a
 * coupon; the two have nothing to do with each other and are now separate.
 *
 * One line sits still, because a single short phrase crawling past is harder
 * to read than one that stays put. Two or more scroll, which is what lets
 * several notices share a strip 40px tall.
 */
@Component({
  selector: 'app-banner-strip',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (lines().length > 0) {
      <div class="ticker no-print" [class.tone-green]="tone() === 'green'" [class.tone-red]="tone() === 'red'"
           role="region" aria-label="Announcements">
        @if (lines().length === 1) {
          <p class="tk-one">
            <span class="tk-star" aria-hidden="true">&#10022;</span>{{ lines()[0] }}
          </p>
        } @else {
          <div class="tk-track" [style.animation-duration.s]="duration()">
            <div class="tk-set">
              @for (line of marquee(); track $index) {
                <span class="tk-item">
                  <span class="tk-star" aria-hidden="true">&#10022;</span>
                  <span>{{ line }}</span>
                </span>
              }
            </div>
            <!-- Second copy makes the loop seamless; hidden so it isn't read twice. -->
            <div class="tk-set" aria-hidden="true">
              @for (line of marquee(); track $index) {
                <span class="tk-item"><span class="tk-star">&#10022;</span><span>{{ line }}</span></span>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .ticker {
      overflow: hidden;
      background: var(--gold-grad);
      border-bottom: 1px solid rgba(23, 19, 7, 0.22);
      color: #171307;
    }
    .tone-green { background: linear-gradient(120deg, #6E9C57, #9CC08B 45%, #7ABA60); }
    .tone-red { background: linear-gradient(120deg, #B4553F, #E4685A 45%, #C4543F); color: #FFF1EC; }
    .tone-red .tk-star { color: rgba(255, 241, 236, 0.6); }

    .tk-one {
      margin: 0; padding: 11px 16px; text-align: center; white-space: nowrap;
      overflow-x: auto; scrollbar-width: none;
      font-family: var(--font-body); font-size: 0.78rem; font-weight: 800;
      letter-spacing: 0.13em; text-transform: uppercase;
    }
    .tk-one::-webkit-scrollbar { display: none; }
    .tk-one .tk-star { margin-right: 10px; }

    .tk-track {
      display: flex; width: max-content;
      animation-name: tk-scroll;
      animation-timing-function: linear;
      animation-iteration-count: infinite;
    }
    /* Half the track is exactly one set, so the reset is invisible. */
    @keyframes tk-scroll {
      from { transform: translateX(0); }
      to { transform: translateX(-50%); }
    }
    .ticker:hover .tk-track { animation-play-state: paused; }

    .tk-set { display: flex; flex: none; }
    .tk-item {
      display: inline-flex; align-items: center; gap: 18px;
      padding: 11px 0 11px 18px; white-space: nowrap;
      font-family: var(--font-body); font-size: 0.78rem; font-weight: 800;
      letter-spacing: 0.13em; text-transform: uppercase;
    }
    .tk-star { font-size: 0.72rem; color: rgba(23, 19, 7, 0.55); }

    @media (max-width: 720px) {
      .tk-item, .tk-one { font-size: 0.7rem; gap: 14px; letter-spacing: 0.1em; }
      .tk-item { padding-left: 14px; }
    }

    /*
      Motion off: the strip stops dead and becomes a normal scrollable row, so
      every notice is still readable without anything moving on screen.
    */
    @media (prefers-reduced-motion: reduce) {
      .tk-track { animation: none; }
      .ticker { overflow-x: auto; }
      .tk-set:last-child { display: none; }
    }
  `]
})
export class BannerStripComponent implements OnInit {
  private banner = inject(BannerService);

  lines = computed(() => this.banner.info().messages);
  tone = computed(() => this.banner.info().tone);

  /**
   * Two notices would leave most of a wide strip empty, so the list is
   * repeated until it is long enough to fill one.
   */
  marquee = computed<string[]>(() => {
    const base = this.lines();
    if (base.length === 0) return [];
    const out = [...base];
    while (out.length < 8) out.push(...base);
    return out;
  });

  /** Scales with content so the text always crosses at the same speed. */
  duration = computed(() => Math.max(18, this.marquee().length * 4.5));

  ngOnInit() {
    this.banner.load();
  }
}
