import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { FARM, SOCIALS, waLink } from '../core/farm';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="container page-head">
      <span class="section-label">Contact us</span>
      <h1>A question, or an <span class="hl">order</span>?</h1>
      <p>From a single litre to bulk supply — call us, message us on WhatsApp, or drop by the office. We'd love to hear from you.</p>
    </div>

    <!-- ===== every way to reach us, as one set of cards ===== -->
    <section class="section" style="padding-top: 36px;">
      <div class="container">
        <div class="link-grid">
          @for (s of socials; track s.key) {
            <a [class]="'link-card is-' + s.key" [href]="s.url"
               [attr.target]="s.external ? '_blank' : null"
               [attr.rel]="s.external ? 'noopener' : null">
              <span class="lc-ic"><app-icon [name]="s.icon" [size]="21" /></span>
              <span>
                <span class="lc-label">{{ s.label }}</span>
                <span class="lc-handle">{{ s.handle }}</span>
                <span class="lc-note">{{ s.note }}</span>
              </span>
              <span class="lc-go"><app-icon name="arrow-up-right" [size]="17" /></span>
            </a>
          }
        </div>

        <div class="c-hours card">
          <span class="lc-ic"><app-icon name="clock" [size]="21" /></span>
          <div>
            <span class="lc-label">Delivery timing</span>
            <p>{{ farm.timing }}</p>
          </div>
          <a [href]="wa" target="_blank" rel="noopener" class="btn btn-wa">
            <app-icon name="whatsapp" [size]="17" /> Start an order
          </a>
        </div>
      </div>
    </section>

    <!-- ===== address + map ===== -->
    <section class="section section-alt">
      <div class="container addr-grid">
        <div>
          <span class="section-label">Office · Muzaffarpur, Bihar</span>
          <h2>Visit the farm office</h2>
          <p class="addr">
            <app-icon name="pin" [size]="17" [stroke]="1.9" />
            <span>{{ farm.address }}</span>
          </p>
          <div class="socials">
            <a class="btn btn-primary btn-sm" [href]="farm.mapLink" target="_blank" rel="noopener">
              <app-icon name="pin" [size]="15" /> Get directions
            </a>
            <a class="btn btn-outline btn-sm" [href]="'tel:' + farm.phone">
              <app-icon name="phone" [size]="15" /> Call the farm
            </a>
          </div>
        </div>
        <div class="map-wrap">
          <iframe
            [src]="mapUrl"
            title="Aryavart Dairy Farm office location"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            allowfullscreen>
          </iframe>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .c-hours {
      display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
      margin-top: 16px; padding: 20px 22px;
    }
    .c-hours > div { flex: 1; min-width: 220px; }
    .c-hours .lc-ic {
      width: 46px; height: 46px; border-radius: 13px; display: grid; place-items: center;
      color: var(--gold-2); background: var(--leaf-soft); border: 1px solid var(--line-soft); flex-shrink: 0;
    }
    .c-hours .lc-label { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); }
    .c-hours p { color: var(--ivory); margin-top: 3px; }

    .addr-grid { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 32px; align-items: center; }
    .addr { display: flex; gap: 10px; margin: 14px 0 20px; color: var(--muted); max-width: 440px; line-height: 1.6; }
    .addr app-icon { flex-shrink: 0; margin-top: 4px; color: var(--gold); }
    .socials { display: flex; gap: 10px; flex-wrap: wrap; }
    /* the embed is a third-party iframe; give it a dark bed so a slow or blocked
       map does not flash a full-width white block on the black page */
    .map-wrap {
      border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow);
      border: 1px solid var(--line); background: #12100A;
    }
    .map-wrap iframe { width: 100%; height: 360px; border: 0; display: block; background: #12100A; filter: grayscale(0.2) contrast(1.02); }
    @media (max-width: 800px) { .addr-grid { grid-template-columns: 1fr; } }
  `]
})
export class ContactComponent {
  farm = FARM;
  socials = SOCIALS;
  wa = waLink();
  mapUrl: SafeResourceUrl = inject(DomSanitizer).bypassSecurityTrustResourceUrl(FARM.mapEmbed);
}
