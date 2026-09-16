import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { ConfirmComponent } from './shared/confirm.component';
import { NavbarComponent } from './shared/navbar.component';
import { ToastsComponent } from './shared/toasts.component';
import { LoadingBarComponent } from './shared/loading-bar.component';
import { FooterComponent } from './shared/footer.component';
import { WhatsappFabComponent } from './shared/whatsapp-fab.component';
import { OfferStripComponent } from './shared/offer-strip.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, ToastsComponent, LoadingBarComponent, ConfirmComponent, WhatsappFabComponent, OfferStripComponent],
  template: `
    <app-loading-bar />
    <app-toasts />
    <app-confirm />
    @if (!isManagement()) { <app-navbar /> }
    <!-- Offers ticker sits directly under the header, where a promo bar is expected -->
    @if (!isManagement()) { <app-offer-strip /> }
    <main id="main"><router-outlet /></main>
    @if (!isManagement()) { <app-footer /> }
    <!-- Floating WhatsApp button — public site only, admin panel stays clean -->
    @if (!isManagement()) { <app-whatsapp-fab /> }
  `
})
export class AppComponent {
  private router = inject(Router);
  private url = signal(this.router.url);

  isManagement = computed(() => this.url().startsWith('/management/panel'));

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => this.url.set(e.urlAfterRedirects));
  }
}
