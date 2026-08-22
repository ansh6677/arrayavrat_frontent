import { Component, HostListener, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { CartService } from '../core/cart.service';
import { FARM, SOCIAL_ICONS, waLink } from '../core/farm';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent],
  template: `
    <a class="skip no-print" href="#main">Skip to content</a>

    <!--
      One bar, not two. The old utility strip above the nav repeated the email
      address, the social icons and the delivery promise that already appear in
      the footer, on the contact page and inside the drawer — so it was three
      rows of duplicated links competing with the actual navigation.
    -->
    <header class="nav no-print" [class.scrolled]="scrolled">
      <a routerLink="/" class="brand" aria-label="Aryavart Dairy Farm — home">
        <img [src]="farm.logo" alt="" width="54" height="54" />
        <span class="brand-name">Aryavart<sup class="tm">™</sup> <em>Dairy Farm</em></span>
      </a>

      <nav class="links" aria-label="Primary">
        <a class="link" routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">Home</a>
        <a class="link" routerLink="/about" routerLinkActive="on">About</a>
        <a class="link" routerLink="/products" routerLinkActive="on">Products</a>
        <a class="link" routerLink="/contact" routerLinkActive="on">Contact</a>
      </nav>

      <div class="actions">
        @if (!auth.isLoggedIn()) {
          <a routerLink="/login" class="acct" title="Customer login" aria-label="Customer login">
            <app-icon name="user" [size]="17" /> <span>Login</span>
          </a>
        } @else {
          <a [routerLink]="auth.isStaff() ? '/management/panel' : '/dashboard'" class="acct"
             [attr.title]="auth.isStaff() ? 'Management panel' : 'My bills'"
             [attr.aria-label]="auth.isStaff() ? 'Management panel' : 'My bills'">
            <app-icon name="user" [size]="17" />
            <span>{{ auth.isStaff() ? 'Panel' : 'My Bills' }}</span>
          </a>
          <button type="button" class="icon-only" (click)="auth.logout()" title="Log out" aria-label="Log out">
            <app-icon name="logout" [size]="17" />
          </button>
        }

        <a routerLink="/cart" class="cart" [class.bump]="bump"
           [attr.aria-label]="cart.count() > 0 ? 'View cart, ' + cart.count() + ' items' : 'View cart'">
          <app-icon name="cart" [size]="21" />
          @if (cart.count() > 0) { <span class="badge">{{ cart.count() }}</span> }
        </a>

        <a [href]="wa" target="_blank" rel="noopener" class="btn btn-primary btn-sm cta">
          <app-icon name="whatsapp" [size]="15" /> Order Now
        </a>

        <button type="button" class="burger" (click)="setOpen(true)"
                aria-label="Open menu" [attr.aria-expanded]="open">
          <app-icon name="menu" [size]="23" [stroke]="2" />
        </button>
      </div>
    </header>

    <!-- ======= mobile drawer ======= -->
    @if (open) {
      <div class="drawer-back no-print" (click)="setOpen(false)"></div>
      <aside class="drawer no-print" role="dialog" aria-modal="true" aria-label="Menu">
        <div class="dr-head">
          <a routerLink="/" class="dr-brand" (click)="setOpen(false)">
            <img [src]="farm.logo" alt="" width="46" height="46" />
            <span>Aryavart<sup class="tm">™</sup> <em>Dairy Farm</em></span>
          </a>
          <button type="button" class="dr-close" (click)="setOpen(false)" aria-label="Close menu">
            <app-icon name="close" [size]="18" [stroke]="2" />
          </button>
        </div>

        <p class="dr-promise"><app-icon name="truck" [size]="14" /> Doorstep within 2 hours of milking</p>

        <nav class="dr-links" (click)="setOpen(false)" aria-label="Mobile">
          <a routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">Home</a>
          <a routerLink="/about" routerLinkActive="on">About</a>
          <a routerLink="/products" routerLinkActive="on">Products</a>
          <a routerLink="/cart" routerLinkActive="on">
            Cart @if (cart.count() > 0) { <b class="dr-count">{{ cart.count() }}</b> }
          </a>
          <a routerLink="/contact" routerLinkActive="on">Contact</a>
        </nav>

        <div class="dr-auth" (click)="setOpen(false)">
          <a [href]="'tel:' + farm.phone" class="btn btn-ghost btn-block">
            <app-icon name="phone" [size]="16" /> Call +91 {{ farm.phone }}
          </a>
          @if (!auth.isLoggedIn()) {
            <a routerLink="/login" class="btn btn-outline btn-block">Customer Login</a>
            <a routerLink="/register" class="btn btn-primary btn-block">Register</a>
          } @else if (auth.isStaff()) {
            <a routerLink="/management/panel" class="btn btn-primary btn-block">Management Panel</a>
            <button type="button" class="btn btn-ghost btn-block" (click)="auth.logout()">Logout</button>
          } @else {
            <a routerLink="/dashboard" class="btn btn-primary btn-block">My Bills</a>
            <button type="button" class="btn btn-ghost btn-block" (click)="auth.logout()">Logout</button>
          }
        </div>

        <div class="dr-social">
          @for (s of socials; track s.key) {
            <a [class]="'link-card compact is-' + s.key"
               [href]="s.url" target="_blank" rel="noopener">
              <span class="lc-ic"><app-icon [name]="s.icon" [size]="17" /></span>
              <span>
                <span class="lc-label">{{ s.label }}</span>
                <span class="lc-handle">{{ s.handle }}</span>
              </span>
              <span class="lc-go"><app-icon name="arrow-up-right" [size]="16" /></span>
            </a>
          }
        </div>

        <div class="dr-foot">{{ farm.tagline2 }}</div>
      </aside>
    }
  `,
  styles: [`
    .skip {
      position: fixed; top: 8px; left: 8px; z-index: 200;
      transform: translateY(-160%); transition: transform 0.2s ease;
      background: var(--gold-2); color: #171307; font-weight: 700;
      padding: 9px 16px; border-radius: 999px; font-size: 0.85rem;
    }
    .skip:focus { transform: none; color: #171307; }

    /* ---------- one-row header ---------- */
    .nav {
      position: sticky; top: 0; z-index: 60;
      display: flex; align-items: center; gap: 28px;
      padding: 12px min(4vw, 44px);
      background: rgba(10, 9, 6, 0.82);
      backdrop-filter: blur(14px) saturate(150%);
      border-bottom: 1px solid transparent;
      transition: background 0.25s ease, border-color 0.25s ease, padding 0.25s ease, box-shadow 0.25s ease;
    }
    .nav.scrolled {
      background: rgba(8, 7, 5, 0.97);
      border-bottom-color: var(--line-soft);
      padding: 7px min(4vw, 44px);
      box-shadow: 0 14px 34px -20px rgba(0, 0, 0, 0.9);
    }
    .nav::after {
      content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px;
      background: linear-gradient(90deg, transparent 4%, var(--gold) 30%, var(--gold-2) 50%, var(--gold) 70%, transparent 96%);
      opacity: 0; transition: opacity 0.3s ease; pointer-events: none;
    }
    .nav.scrolled::after { opacity: 0.75; }

    /* brand */
    .brand { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
    .brand img {
      width: 54px; height: 54px; border-radius: 50%;
      filter: drop-shadow(0 0 14px rgba(201, 162, 39, 0.34));
      transition: width 0.25s ease, height 0.25s ease, filter 0.25s ease, box-shadow 0.25s ease;
    }
    .brand:hover img { filter: drop-shadow(0 0 20px rgba(201, 162, 39, 0.62)); box-shadow: 0 0 0 2px rgba(228, 199, 102, 0.35); }
    .nav.scrolled .brand img { width: 44px; height: 44px; }
    .brand-name {
      font-family: var(--font-display); font-size: 1.2rem; color: var(--gold-2);
      line-height: 1.1; letter-spacing: 0.03em; white-space: nowrap;
    }
    .brand-name em {
      font-style: normal; color: var(--muted); display: block;
      font-size: 0.65rem; letter-spacing: 0.26em; text-transform: uppercase;
    }

    /* primary links, centred in the leftover space */
    .links { display: flex; align-items: center; gap: 30px; margin-inline: auto; }
    .link {
      position: relative; padding: 9px 2px;
      font-size: 0.79rem; font-weight: 700; letter-spacing: 0.17em; text-transform: uppercase;
      color: var(--ivory); white-space: nowrap;
    }
    .link::after {
      content: ''; position: absolute; left: 0; right: 0; bottom: 2px; height: 2px;
      background: var(--gold-grad); border-radius: 2px;
      transform: scaleX(0); transform-origin: left; transition: transform 0.28s ease;
    }
    .link:hover { color: var(--gold-2); }
    .link:hover::after, .link.on::after { transform: scaleX(1); }
    .link.on { color: var(--gold-2); }

    /* right-hand actions */
    .actions { display: flex; align-items: center; gap: 16px; flex-shrink: 0; }

    .acct {
      display: inline-flex; align-items: center; gap: 7px;
      font-size: 0.82rem; font-weight: 700; color: var(--muted);
      letter-spacing: 0.03em; white-space: nowrap;
      transition: color 0.15s ease;
    }
    .acct:hover { color: var(--gold-2); }

    .icon-only {
      background: none; border: none; cursor: pointer; padding: 4px;
      color: var(--muted); display: inline-flex; border-radius: 8px;
    }
    .icon-only:hover { color: var(--gold-2); background: rgba(255, 255, 255, 0.05); }

    .cart { position: relative; color: var(--ivory); display: inline-flex; padding: 4px; }
    .cart:hover { color: var(--gold-2); }
    .badge {
      position: absolute; top: -4px; right: -7px;
      background: var(--gold-grad); color: #171307;
      font-size: 0.66rem; font-weight: 800;
      min-width: 17px; height: 17px; border-radius: 999px;
      display: grid; place-items: center; padding: 0 4px;
    }

    .burger {
      display: none; background: none; cursor: pointer; padding: 6px;
      color: var(--gold-2); border: 1px solid var(--line-soft); border-radius: 10px;
    }
    .burger:hover { border-color: var(--gold); background: rgba(201, 162, 39, 0.1); }

    /* gold sheen sweeping across the Order Now pill */
    .cta { position: relative; overflow: hidden; isolation: isolate; }
    .cta::after {
      content: ''; position: absolute; top: -20%; bottom: -20%; left: -60%; width: 38%;
      background: linear-gradient(105deg, transparent, rgba(255, 255, 255, 0.5), transparent);
      transform: skewX(-18deg); pointer-events: none; transition: left 0.55s ease;
    }
    .cta:hover::after { left: 135%; }

    /* badge pops whenever the cart count changes */
    .cart.bump .badge { animation: badgePop 0.45s cubic-bezier(0.2, 1.6, 0.4, 1); }
    @keyframes badgePop { 0% { transform: scale(0.4); } 60% { transform: scale(1.3); } 100% { transform: scale(1); } }

    .link:focus-visible, .cart:focus-visible, .acct:focus-visible, .cta:focus-visible {
      outline: 2px solid var(--gold); outline-offset: 4px; border-radius: 8px;
    }

    /* Shed one control at a time rather than collapsing everything at once. */
    @media (max-width: 1240px) { .links { gap: 22px; } .brand-name em { display: none; } }
    /* Only the account *label* goes here — the logout button has to survive until
       the burger appears, or a signed-in user between 900 and 1000px has no way
       out at all. */
    @media (max-width: 1000px) { .acct span { display: none; } }
    @media (max-width: 900px) {
      .links { display: none; }
      .acct, .icon-only { display: none; }
      .burger { display: inline-flex; }
      .actions { margin-left: auto; }
    }
    @media (max-width: 540px) {
      .cta { display: none; }
      .brand-name { font-size: 1.02rem; }
      .brand img, .nav.scrolled .brand img { width: 42px; height: 42px; }
    }

    /* ---------- drawer ---------- */
    .drawer-back { position: fixed; inset: 0; background: rgba(4, 3, 1, 0.72); backdrop-filter: blur(3px); z-index: 90; }
    .drawer {
      position: fixed; top: 0; right: 0; bottom: 0; width: min(348px, 88vw); z-index: 95;
      background: linear-gradient(180deg, #0D0B07, #080704);
      border-left: 1px solid var(--line);
      display: flex; flex-direction: column; gap: 4px;
      padding: 18px 20px 22px; overflow-y: auto;
      animation: slideIn 0.28s ease;
    }
    @keyframes slideIn { from { transform: translateX(30px); opacity: 0; } to { transform: none; opacity: 1; } }
    .dr-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .dr-brand { display: flex; align-items: center; gap: 11px; }
    .dr-brand img { width: 46px; height: 46px; border-radius: 50%; }
    .dr-brand span { font-family: var(--font-display); font-size: 1.02rem; color: var(--gold-2); line-height: 1.1; }
    .dr-brand em { font-style: normal; display: block; font-size: 0.62rem; letter-spacing: 0.24em; text-transform: uppercase; color: var(--muted); }
    .dr-close {
      background: none; border: 1px solid var(--line-soft); color: var(--muted);
      width: 36px; height: 36px; border-radius: 50%; cursor: pointer;
      display: grid; place-items: center; flex-shrink: 0;
    }
    .dr-close:hover { color: var(--gold-2); border-color: var(--gold); }
    .dr-promise {
      display: flex; align-items: center; gap: 8px;
      font-size: 0.78rem; font-weight: 600; color: var(--clay);
      background: rgba(201, 162, 39, 0.07); border: 1px solid var(--line-soft);
      border-radius: 999px; padding: 7px 14px; margin-bottom: 12px; width: fit-content;
    }
    .dr-promise app-icon { color: var(--gold); }

    .dr-links { display: flex; flex-direction: column; }
    .dr-links a {
      display: flex; align-items: center; gap: 8px;
      padding: 13px 4px; color: var(--ivory);
      font-family: var(--font-display); font-size: 1.2rem;
      border-bottom: 1px solid var(--line-soft);
      transition: padding-left 0.2s ease, color 0.2s ease;
    }
    .dr-links a:hover, .dr-links a.on { color: var(--gold-2); padding-left: 8px; }
    .dr-count {
      background: var(--gold-grad); color: #171307; font-family: var(--font-body);
      font-size: 0.7rem; font-weight: 800; border-radius: 999px; padding: 1px 8px;
    }

    .dr-auth { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
    .dr-social { display: flex; flex-direction: column; gap: 8px; margin-top: 20px; }
    .dr-foot {
      margin-top: auto; padding-top: 20px; text-align: center;
      font-family: var(--font-display); letter-spacing: 0.28em; text-transform: uppercase;
      font-size: 0.7rem; color: var(--clay);
    }
  `]
})
export class NavbarComponent {
  auth = inject(AuthService);
  cart = inject(CartService);
  farm = FARM;
  socials = SOCIAL_ICONS;
  wa = waLink();

  open = false;
  scrolled = false;

  /** True for ~half a second after the cart count changes — pops the badge. */
  bump = false;
  private bumpTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    let first = true;
    effect(() => {
      this.cart.count();
      if (first) { first = false; return; }
      if (this.bumpTimer) clearTimeout(this.bumpTimer);
      this.bump = false;
      requestAnimationFrame(() => (this.bump = true));
      this.bumpTimer = setTimeout(() => (this.bump = false), 500);
    });
  }

  /** Locks the page behind the drawer so the body does not scroll under it. */
  setOpen(open: boolean) {
    this.open = open;
    document.body.style.overflow = open ? 'hidden' : '';
  }

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled = window.scrollY > 24;
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.open) this.setOpen(false);
  }
}
