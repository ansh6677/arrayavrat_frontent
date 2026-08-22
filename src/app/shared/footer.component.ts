import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FARM, SOCIAL_ICONS, waLink } from '../core/farm';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <footer class="foot no-print">
      <!-- ===== order strip ===== -->
      <div class="foot-cta">
        <div class="container-wide fc-inner">
          <div class="fc-copy">
            <span class="fc-eyebrow">Ready when you are</span>
            <h3>Send your order in one WhatsApp message</h3>
            <p>Add what you need to the cart, tap once, and we confirm within 30 minutes.</p>
          </div>
          <div class="fc-actions">
            <a routerLink="/products" class="btn btn-outline">Browse products</a>
            <a [href]="wa" target="_blank" rel="noopener" class="btn btn-wa">
              <app-icon name="whatsapp" [size]="17" /> Order on WhatsApp
            </a>
            <a [href]="'tel:' + farm.phone" class="btn btn-ghost">
              <app-icon name="phone" [size]="16" /> +91 {{ farm.phone }}
            </a>
          </div>
        </div>
      </div>

      <!-- watermark lives in its own clipping layer: the footer itself must not
           clip, or the order strip overlapping its top edge gets cut off -->
      <div class="foot-bg" aria-hidden="true"><img class="wm" [src]="farm.logo" alt="" /></div>

      <div class="container-wide foot-grid">
        <!-- brand -->
        <div class="fcol fcol-brand">
          <div class="foot-brand">
            <img [src]="farm.logo" alt="" width="62" height="62" />
            <div>
              <b>{{ farm.name }}<sup class="tm">™</sup></b>
              <span>{{ farm.tagline2 }}</span>
            </div>
          </div>
          <p class="foot-about">{{ farm.description }}</p>
          <ul class="foot-trust">
            <li><app-icon name="truck" [size]="15" /> Doorstep within 2 hours</li>
            <li><app-icon name="shield" [size]="15" /> Lab certificate on request</li>
            <li><app-icon name="pot" [size]="15" /> Traditional bilona methods</li>
          </ul>
        </div>

        <!-- quick links -->
        <div class="fcol">
          <h4>Quick Links</h4>
          <ul class="foot-nav">
            <li><a routerLink="/">Home</a></li>
            <li><a routerLink="/about">About Us</a></li>
            <li><a routerLink="/products">Products</a></li>
            <li><a routerLink="/cart">Cart</a></li>
            <li><a routerLink="/contact">Contact</a></li>
            <li><a routerLink="/login">Customer Login</a></li>
          </ul>
        </div>

        <!-- products -->
        <div class="fcol">
          <h4>Our Dairy</h4>
          <ul class="foot-nav">
            <li><a routerLink="/products">Pure A2 Cow Milk</a></li>
            <li><a routerLink="/products">Curd (Dahi)</a></li>
            <li><a routerLink="/products">Fresh Paneer</a></li>
            <li><a routerLink="/products">Bilona Desi Ghee</a></li>
            <li><a routerLink="/products">Buttermilk (Chaach)</a></li>
          </ul>
        </div>

        <!-- contact + social cards -->
        <div class="fcol fcol-reach">
          <h4>Reach Us</h4>
          <div class="foot-lines">
            <p class="fline">
              <app-icon name="pin" [size]="15" [stroke]="1.9" />
              <a [href]="farm.mapLink" target="_blank" rel="noopener">{{ farm.address }}</a>
            </p>
            <p class="fline">
              <app-icon name="phone" [size]="15" [stroke]="1.9" />
              <a [href]="'tel:' + farm.phone">+91 {{ farm.phone }}</a>
            </p>
            <p class="fline">
              <app-icon name="mail" [size]="15" [stroke]="1.9" />
              <a [href]="'mailto:' + farm.email">{{ farm.email }}</a>
            </p>
            <p class="fline">
              <app-icon name="clock" [size]="15" [stroke]="1.9" />
              <span>{{ farm.timing }}</span>
            </p>
          </div>

        </div>
      </div>

      <!--
        The three social cards used to live inside the "Reach Us" column, which
        made that one column run about twice the height of the other three and
        left the whole footer visibly lopsided. As their own full-width row they
        balance the grid and read better besides.
      -->
      <div class="container-wide foot-connect">
        @for (s of socials; track s.key) {
          <a [class]="'link-card is-' + s.key" [href]="s.url" target="_blank" rel="noopener">
            <span class="lc-ic"><app-icon [name]="s.icon" [size]="19" /></span>
            <span>
              <span class="lc-label">{{ s.label }}</span>
              <span class="lc-handle">{{ s.handle }}</span>
            </span>
            <span class="lc-go"><app-icon name="arrow-up-right" [size]="16" /></span>
          </a>
        }
      </div>

      <div class="foot-bottom">
        <div class="container-wide fb-inner">
          <span>© {{ year }} {{ farm.name }}<sup class="tm">™</sup> · Muzaffarpur, Bihar · All rights reserved</span>
          <span class="fb-tag">{{ farm.tagline }}</span>
          <button type="button" class="to-top" (click)="toTop()" aria-label="Back to top">
            <app-icon name="arrow-up-right" [size]="14" /> Top
          </button>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .foot {
      position: relative;
      background:
        radial-gradient(760px 320px at 10% 8%, rgba(201, 162, 39, 0.08), transparent 62%),
        radial-gradient(620px 260px at 92% 96%, rgba(201, 162, 39, 0.05), transparent 60%),
        #0B0906;
      color: #CFC7AE;
      margin-top: 90px;
    }
    .foot::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(228, 199, 102, 0.5), transparent);
    }
    .foot-bg { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
    .wm {
      position: absolute; right: -70px; bottom: -90px;
      width: 430px; height: 430px; opacity: 0.05;
      user-select: none;
      -webkit-mask-image: radial-gradient(closest-side, #000 55%, transparent 100%);
              mask-image: radial-gradient(closest-side, #000 55%, transparent 100%);
    }
    @media (prefers-reduced-motion: no-preference) {
      .wm { animation: wmFloat 18s ease-in-out infinite alternate; }
      @keyframes wmFloat {
        from { transform: translateY(0) rotate(0deg); }
        to { transform: translateY(-16px) rotate(2deg); }
      }
    }
    .foot a { color: #C9C1A8; }
    .foot a:hover { color: var(--gold-2); }

    /* ---- order strip ---- */
    .foot-cta {
      position: relative; z-index: 2;
      margin-top: -46px;
      background:
        radial-gradient(420px 160px at 88% 0%, rgba(228, 199, 102, 0.1), transparent 70%),
        linear-gradient(120deg, #17130A 0%, #221B0D 52%, #17130A 100%);
      border: 1px solid var(--line);
      border-radius: 22px;
      width: min(1300px, 94%); margin-inline: auto;
      box-shadow: var(--shadow), 0 0 0 1px rgba(228, 199, 102, 0.04);
      overflow: hidden;
    }
    .foot-cta::before {
      content: ''; position: absolute; inset: 0 0 auto 0; height: 2px;
      background: var(--gold-grad);
    }
    .fc-inner {
      display: flex; align-items: center; justify-content: space-between;
      gap: 26px; flex-wrap: wrap; padding: 30px 0;
    }
    .fc-eyebrow {
      display: block; font-size: 0.72rem; font-weight: 700;
      letter-spacing: 0.22em; text-transform: uppercase; color: var(--clay); margin-bottom: 6px;
    }
    .fc-copy h3 { color: var(--gold-2); font-size: clamp(1.2rem, 2.4vw, 1.5rem); }
    .fc-copy p { color: var(--muted); font-size: 0.94rem; margin-top: 5px; }
    .fc-actions { display: flex; gap: 12px; flex-wrap: wrap; }

    /* ---- main grid ---- */
    .foot-grid {
      display: grid; grid-template-columns: 1.6fr 0.85fr 0.95fr 1.35fr;
      gap: 44px; padding: 62px 0 34px; position: relative; z-index: 1;
      align-items: start;
    }
    .foot-brand { display: flex; gap: 14px; align-items: center; margin-bottom: 16px; }
    .foot-brand img { width: 62px; height: 62px; border-radius: 50%; filter: drop-shadow(0 0 16px rgba(201, 162, 39, 0.3)); }
    .foot-brand b { font-family: var(--font-display); font-size: 1.2rem; display: block; color: var(--gold-2); }
    .foot-brand span { font-size: 0.7rem; color: var(--clay); letter-spacing: 0.22em; text-transform: uppercase; }
    .foot-about { font-size: 0.91rem; color: var(--muted); max-width: 340px; line-height: 1.7; }

    .foot-trust { list-style: none; display: flex; flex-direction: column; gap: 9px; margin-top: 18px; }
    .foot-trust li { display: flex; align-items: center; gap: 9px; font-size: 0.86rem; color: var(--muted); }
    .foot-trust app-icon { color: var(--gold); }

    .fcol h4 {
      color: var(--gold-2); font-size: 0.88rem; margin-bottom: 18px;
      letter-spacing: 0.16em; text-transform: uppercase; font-family: var(--font-body); font-weight: 700;
      position: relative; padding-bottom: 10px;
    }
    .fcol h4::after {
      content: ''; position: absolute; left: 0; bottom: 0; width: 26px; height: 2px;
      background: var(--gold-grad); border-radius: 2px;
      box-shadow: 34px 0 0 -0.4px var(--gold);
    }

    .foot-nav { list-style: none; display: flex; flex-direction: column; gap: 11px; font-size: 0.93rem; }
    .foot-nav a { position: relative; display: inline-block; transition: transform 0.18s ease; }
    .foot-nav a::before {
      content: '›'; position: absolute; left: -13px; opacity: 0; color: var(--gold-2);
      transition: opacity 0.18s ease;
    }
    .foot-nav a:hover { transform: translateX(11px); }
    .foot-nav a:hover::before { opacity: 1; }

    .foot-lines { margin-bottom: 0; }
    .fline { display: flex; gap: 10px; font-size: 0.88rem; color: var(--muted); margin-bottom: 11px; line-height: 1.55; }
    .fline app-icon { flex-shrink: 0; margin-top: 3px; color: var(--gold); }

    .foot-connect {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;
      padding-bottom: 44px; position: relative; z-index: 1;
    }

    /* ---- bottom bar ---- */
    .foot-bottom { position: relative; z-index: 1; background: rgba(0, 0, 0, 0.4); }
    .foot-bottom::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent, rgba(228, 199, 102, 0.45), transparent);
    }
    .fb-inner { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 15px 0; font-size: 0.82rem; color: #7E7660; flex-wrap: wrap; }
    .fb-tag { font-family: var(--font-display); letter-spacing: 0.14em; color: var(--clay); }
    .to-top {
      display: inline-flex; align-items: center; gap: 6px;
      background: transparent; border: 1px solid var(--line); color: var(--gold-2);
      border-radius: 999px; padding: 6px 15px; font-weight: 700; font-size: 0.8rem; cursor: pointer;
      font-family: var(--font-body);
      transition: background 0.15s ease, transform 0.15s ease;
    }
    .to-top app-icon { transform: rotate(-45deg); }
    .to-top:hover { background: var(--leaf-soft); transform: translateY(-2px); }

    /* ---- tablet: brand becomes a full-width band, link columns stay side by side ---- */
    @media (max-width: 1080px) {
      .foot-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 34px 40px; padding-top: 54px; }
      .fcol-brand {
        grid-column: 1 / -1;
        display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
        gap: 10px 40px; align-items: start;
        padding-bottom: 26px; border-bottom: 1px dashed var(--line-soft);
      }
      .foot-brand { grid-column: 1; margin-bottom: 10px; }
      .foot-about { grid-column: 1; max-width: none; }
      .foot-trust { grid-column: 2; grid-row: 1 / span 2; margin-top: 6px; }
      .fcol-reach { grid-column: 1 / -1; }
      .foot-lines { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 32px; }
      .foot-connect { grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 820px) {
      .foot-connect { grid-template-columns: 1fr; gap: 12px; }
      .foot-lines { grid-template-columns: 1fr; }
    }
    /* ---- phone: single calm column, no watermark, full-width actions ---- */
    @media (max-width: 660px) {
      .foot { margin-top: 76px; }
      .foot-grid { grid-template-columns: 1fr; gap: 30px; padding-top: 44px; }
      .fcol-brand { display: block; padding-bottom: 22px; }
      .foot-trust { margin-top: 16px; }
      .wm { display: none; }
      .fc-inner { padding: 22px 0; flex-direction: column; align-items: stretch; text-align: left; }
      .fc-actions { width: 100%; }
      .fc-actions .btn { flex: 1 1 auto; justify-content: center; }
      .fb-inner { flex-direction: column; text-align: center; gap: 10px; padding: 18px 0; }
    }
  `]
})
export class FooterComponent {
  farm = FARM;
  socials = SOCIAL_ICONS;
  wa = waLink();
  year = new Date().getFullYear();

  toTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
