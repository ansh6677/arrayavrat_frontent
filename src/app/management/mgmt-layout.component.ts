import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { FARM } from '../core/farm';
import { IconComponent, IconName } from '../shared/icon.component';

/** Above this width the sidebar sits beside the content instead of over it. */
const DESKTOP_QUERY = '(min-width: 901px)';

/** Remembers the desktop expanded/rail choice between visits. */
const NAV_KEY = 'aryavart.mgmt.nav';

interface NavItem {
  link: string;
  icon: IconName;
  label: string;
  exact?: boolean;
  badge?: () => number | null;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-mgmt-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="mgmt" [class.rail]="!navOpen()">
      @if (navOpen()) { <div class="mgmt-scrim no-print" (click)="navOpen.set(false)"></div> }

      <aside class="mgmt-side no-print" [class.open]="navOpen()">
        <div class="side-head">
          <a routerLink="/management/panel" class="mgmt-brand" (click)="closeOnMobile()"
             [attr.title]="navOpen() ? null : farm.name">
            <img [src]="farm.logo" alt="" width="44" height="44" />
            <div class="mb-text">
              <b>Aryavart<sup class="tm">™</sup></b>
              <span>Management</span>
            </div>
          </a>
          <button type="button" class="side-toggle" (click)="toggleNav()"
                  [attr.aria-label]="navOpen() ? 'Collapse sidebar' : 'Expand sidebar'"
                  [attr.title]="navOpen() ? 'Collapse sidebar' : 'Expand sidebar'"
                  [attr.aria-expanded]="navOpen()">
            <app-icon name="arrow-right" [size]="16" [stroke]="2" />
          </button>
        </div>

        <div class="role-chip" [class.view]="auth.isViewer()">
          {{ auth.isFullAdmin() ? '● Full access' : '● View only' }}
        </div>

        <nav (click)="closeOnMobile()" aria-label="Management">
          @for (item of visibleItems(); track item.link) {
            <a [routerLink]="item.link" routerLinkActive="on"
               [routerLinkActiveOptions]="{ exact: item.exact === true }"
               [attr.title]="navOpen() ? null : item.label">
              <span class="ni-ic"><app-icon [name]="item.icon" [size]="18" /></span>
              <span class="ni-label">{{ item.label }}</span>
              @if (item.badge && item.badge() !== null) {
                <span class="ni-badge">{{ item.badge() }}</span>
              }
            </a>
          }
        </nav>

        <div class="mgmt-side-foot">
          <a routerLink="/" class="side-link" [attr.title]="navOpen() ? null : 'View website'">
            <app-icon name="arrow-right" [size]="15" /> <span>View website</span>
          </a>
        </div>
      </aside>

      <div class="mgmt-main">
        <header class="mgmt-top no-print">
          <button type="button" class="mgmt-burger" (click)="toggleNav()"
                  aria-label="Open menu" [attr.aria-expanded]="navOpen()">
            <app-icon name="menu" [size]="20" [stroke]="2" />
          </button>
          <div class="mt-title">{{ farm.name }}</div>
          <div class="mgmt-user">
            <span class="mu-name"><app-icon name="user" [size]="16" /> {{ auth.user()?.name }}</span>
            <button type="button" class="btn btn-outline btn-sm" (click)="logout()">
              <app-icon name="logout" [size]="15" /> Logout
            </button>
          </div>
        </header>
        <div class="mgmt-content">
          <router-outlet />
        </div>
      </div>
    </div>
  `,
  styles: [`
    nav a {
      position: relative;
      display: flex; align-items: center; gap: 12px;
      padding: 11px 14px; margin: 2px 8px;
      border-radius: 12px;
      color: var(--muted); font-weight: 600; font-size: 0.94rem;
      transition: background 0.16s ease, color 0.16s ease, padding-left 0.16s ease;
    }
    nav a::before {
      content: ''; position: absolute; left: -8px; top: 22%; bottom: 22%;
      width: 3px; border-radius: 3px; background: var(--gold-grad);
      opacity: 0; transform: scaleY(0.4); transition: opacity 0.18s ease, transform 0.18s ease;
    }
    nav a:hover { color: var(--ivory); background: rgba(228, 199, 102, 0.06); padding-left: 18px; }
    nav a.on {
      color: var(--gold-2);
      background: linear-gradient(90deg, rgba(228, 199, 102, 0.13), rgba(228, 199, 102, 0.03));
    }
    nav a.on::before { opacity: 1; transform: scaleY(1); }
    .ni-ic { display: inline-flex; opacity: 0.85; }
    nav a.on .ni-ic { opacity: 1; filter: drop-shadow(0 0 6px rgba(228, 199, 102, 0.45)); }
    .ni-label { flex: 1; }
    .ni-badge {
      min-width: 22px; height: 20px; padding: 0 7px;
      display: inline-grid; place-items: center;
      background: var(--gold-grad); color: #171307;
      border-radius: 999px; font-size: 0.7rem; font-weight: 800;
    }
    .side-link {
      display: inline-flex; align-items: center; gap: 8px;
      color: var(--muted); font-size: 0.9rem; font-weight: 600; padding: 8px 14px;
    }
    .side-link app-icon { transform: rotate(180deg); }
    .side-link:hover { color: var(--gold-2); }
    .mu-name { display: inline-flex; align-items: center; gap: 7px; }
  `]
})
export class MgmtLayoutComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);
  farm = FARM;

  /**
   * One flag drives the sidebar in both layouts.
   *
   * Below 901px it is the off-canvas drawer: closed by default, opened over a
   * scrim by the header burger. From 901px up the sidebar always sits beside the
   * content, so "closed" means collapsed to an icon rail — the logo and the nav
   * icons stay, everything that needs a line of text drops out. There the arrow
   * beside the logo does the collapsing, not the burger, so the control lives on
   * the thing it moves; the choice is remembered, because a panel that snapped
   * back to full width on every navigation would be worse than not collapsing.
   */
  navOpen = signal(this.storedNavOpen());

  /** Tracks which side of the breakpoint we are on, so a resize only resets the
   *  sidebar when the layout actually changes mode. */
  private desktop = this.isDesktop();

  /** Live counters shown as sidebar badges (best-effort; silent on failure). */
  customerCount = signal<number | null>(null);
  todayEntries = signal<number | null>(null);

  /** The sidebar is data-driven — add an item here and it appears everywhere. */
  items: NavItem[] = [
    { link: '/management/panel', icon: 'chart', label: 'Dashboard', exact: true, badge: () => this.todayEntries() },
    { link: '/management/panel/customers', icon: 'users', label: 'Customers', badge: () => this.customerCount() },
    { link: '/management/panel/extra-sales', icon: 'cart', label: 'Extra Sells' },
    { link: '/management/panel/expenses', icon: 'wallet', label: 'Expenses' },
    { link: '/management/panel/products', icon: 'bottle', label: 'Products' },
    { link: '/management/panel/staff', icon: 'key', label: 'Login Management', adminOnly: true }
  ];

  visibleItems(): NavItem[] {
    return this.items.filter(i => !i.adminOnly || this.auth.isFullAdmin());
  }

  ngOnInit() {
    this.api.getStats().subscribe({
      next: st => {
        this.customerCount.set(st.customerCount);
        this.todayEntries.set(st.todayEntryCount > 0 ? st.todayEntryCount : null);
      },
      error: () => { /* badges are optional */ }
    });
  }

  /** Burger: opens/closes the drawer on a phone, collapses the rail on desktop. */
  toggleNav() {
    const open = !this.navOpen();
    this.navOpen.set(open);
    if (this.desktop) {
      try {
        localStorage.setItem(NAV_KEY, open ? 'open' : 'rail');
      } catch { /* private mode — the sidebar just forgets */ }
    }
  }

  /** Tapping a link closes the drawer; on desktop the rail is not a drawer, so
   *  navigating must not collapse it. */
  closeOnMobile() {
    if (!this.desktop) {
      this.navOpen.set(false);
    }
  }

  @HostListener('window:resize')
  onResize() {
    const desktop = this.isDesktop();
    if (desktop === this.desktop) {
      return;
    }
    this.desktop = desktop;
    this.navOpen.set(desktop ? this.storedNavOpen() : false);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeOnMobile();
  }

  private isDesktop(): boolean {
    return typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches;
  }

  /** Expanded unless this browser last left it as a rail. A phone always starts
   *  with the drawer shut, whatever the desktop preference was. */
  private storedNavOpen(): boolean {
    if (!this.isDesktop()) {
      return false;
    }
    try {
      return localStorage.getItem(NAV_KEY) !== 'rail';
    } catch {
      return true;
    }
  }

  logout() {
    this.auth.logout(false);
    this.router.navigate(['/management']);
  }
}
