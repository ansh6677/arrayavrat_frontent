import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FARM } from '../core/farm';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="container page-head">
      <span class="section-label">About us</span>
      <h1>We don't just deliver dairy — <span class="hl">we deliver trust</span></h1>
      <p>{{ farm.name }} is a small farm in Muzaffarpur, Bihar, with a big heart and an old-fashioned respect for tradition.</p>
    </div>

    <section class="section" style="padding-top: 36px;">
      <div class="container story-grid">
        <div class="story-media">
          <figure class="shot">
            <img [src]="farm.photos.farmGolden" alt="Golden hour at the farm"
                 loading="lazy" width="1400" height="933" />
            <figcaption>Golden hour over the fields</figcaption>
          </figure>
          <figure class="shot">
            <img [src]="farm.photos.farmPasture" alt="Our cows out on the pasture"
                 loading="lazy" width="1400" height="933" />
            <figcaption>Our cows out on the pasture</figcaption>
          </figure>
        </div>
        <div>
          <span class="section-label">Our story</span>
          <h2>Back to the way <span class="hl">milk used to be</span></h2>
          <p class="story-p">
            Aryavart began with a simple thought — families deserve the same milk that villages once knew:
            fresh, pure, and completely unadulterated. Our desi cows are cared for like family, and their
            milk reaches your home within two hours of milking.
          </p>
          <p class="story-p">
            From that same pure A2 milk we set thick, traditional curd, hand-churn fragrant bilona ghee,
            and prepare fresh buttermilk every day — exactly the way our grandparents made it.
          </p>
          <ul class="vals">
            <li><b>Quality over quantity</b> — we would rather make less, and make it right.</li>
            <li><b>Traditional methods</b> — curd, ghee and buttermilk, all village-style.</li>
            <li><b>Strict hygiene</b> — care and cleanliness at every single step.</li>
            <li><b>No additives, no shortcuts</b> — ask for a lab certificate anytime.</li>
            <li><b>Customers are family</b> — every product is made with care and dedication.</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="section section-alt">
      <div class="container">
        <div class="section-head">
          <span class="section-label">Farm to home</span>
          <h2>A journey of just <span class="hl">two hours</span></h2>
        </div>
        <ol class="steps">
          @for (s of steps; track s.title; let i = $index) {
            <li class="card step">
              <span class="s-no">{{ '0' + (i + 1) }}</span>
              <span class="s-ic"><app-icon [name]="s.icon" [size]="21" /></span>
              <h3>{{ s.title }}</h3>
              <p>{{ s.body }}</p>
            </li>
          }
        </ol>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <span class="section-label">The people</span>
          <h2>Founders</h2>
        </div>
        <div class="grid-2">
          @for (f of founders; track f.name) {
            <div class="card founder">
              <span class="f-mono">{{ f.initials }}</span>
              <div>
                <h3>{{ f.name }}</h3>
                <p class="muted f-role">{{ f.role }}</p>
                <p class="f-quote">“{{ f.quote }}”</p>
              </div>
            </div>
          }
        </div>
        <div class="mt right">
          <a routerLink="/products" class="btn btn-primary">
            Explore our products <app-icon name="arrow-right" [size]="16" />
          </a>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .story-grid { display: grid; grid-template-columns: 1fr 1.05fr; gap: 54px; align-items: center; }

    /* Two separate photographs, stacked with a gap. They used to be a collage —
       the pasture shot pinned over the bottom-right corner of the field shot,
       with the emblem over the top-left — which hid part of both pictures. */
    .story-media { display: flex; flex-direction: column; gap: 20px; }
    .shot { margin: 0; }
    .shot img {
      width: 100%; display: block;
      border-radius: var(--radius);
      border: 1px solid var(--line);
      box-shadow: var(--shadow);
    }
    .shot figcaption {
      margin-top: 9px; font-size: 0.82rem; color: var(--muted);
      letter-spacing: 0.04em;
    }
    .story-p { color: var(--muted); margin-bottom: 14px; line-height: 1.75; }
    .vals { list-style: none; display: flex; flex-direction: column; gap: 12px; margin-top: 18px; }
    .vals li { padding-left: 26px; position: relative; color: var(--muted); }
    .vals li b { color: var(--ivory); }
    .vals li::before { content: '✦'; position: absolute; left: 0; color: var(--gold-2); font-weight: 900; }

    .steps { list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(215px, 1fr)); gap: 16px; }
    .step { position: relative; transition: transform 0.2s ease, border-color 0.2s ease; }
    .step:hover { transform: translateY(-4px); border-color: var(--line); }
    .s-no { position: absolute; top: 14px; right: 18px; font-family: var(--font-display); font-size: 1.6rem; color: var(--line); }
    .s-ic {
      width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center;
      background: var(--leaf-soft); border: 1px solid var(--line-soft); color: var(--gold-2);
      margin-bottom: 12px;
    }
    .step h3 { color: var(--gold-2); font-size: 1.04rem; }
    .step p { color: var(--muted); font-size: 0.91rem; margin-top: 4px; }

    .founder { display: flex; gap: 18px; align-items: flex-start; }
    .f-mono {
      width: 56px; height: 56px; border-radius: 50%; flex-shrink: 0;
      display: grid; place-items: center;
      font-family: var(--font-display); font-size: 1.2rem; color: #171307;
      background: var(--gold-grad);
    }
    .founder h3 { margin-bottom: 2px; color: var(--gold-2); }
    .f-role { font-size: 0.85rem; }
    .f-quote { margin-top: 10px; font-family: var(--font-display); line-height: 1.6; color: var(--ivory); }

    @media (max-width: 900px) {
      .story-grid { grid-template-columns: 1fr; gap: 44px; }
    }
  `]
})
export class AboutComponent {
  farm = FARM;

  steps = [
    { icon: 'sunrise', title: 'Morning milking', body: 'Fresh milk from healthy, grass-fed desi cows.' },
    { icon: 'shield', title: 'Immediate handling', body: 'Hygienic collection with zero processing.' },
    { icon: 'truck', title: 'Straight to you', body: 'At your doorstep within two hours.' },
    { icon: 'pot', title: 'In your kitchen', body: 'From morning chai to festive kheer — real taste.' }
  ];

  founders = [
    {
      name: 'Sourabh Singh',
      initials: 'SS',
      role: 'Co-founder',
      quote: 'Food should be pure, honest, and made with care. Small beginnings, but a big heart behind every product.'
    },
    {
      name: 'Prince Kumar',
      initials: 'PK',
      role: 'Co-founder',
      quote: 'Deliver fresh, natural, and trustworthy dairy to every home — keeping tradition alive.'
    }
  ];
}
