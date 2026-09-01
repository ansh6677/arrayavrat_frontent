import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { CartService } from '../core/cart.service';
import { FARM, REVIEWS, SOCIALS, waLink } from '../core/farm';
import { Product } from '../core/models';
import { IconComponent } from '../shared/icon.component';
import { ProductImage } from '../shared/product-image';

interface Slide {
  img: string;
  /** Cover-crop focal point on wide screens, e.g. '62% 12%' (x y). */
  pos?: string;
  /** Focal point on narrow (phone) screens, where the crop is tall and only x matters. */
  posM?: string;
  eyebrow: string;
  t1: string;
  t2: string;
  sub: string;
  cta: string;
  link: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <!-- ================= HERO SLIDER ================= -->
    <section class="hero" (mouseenter)="pause()" (mouseleave)="resume()" aria-label="Featured">
      <div class="hero-media" aria-hidden="true">
        @for (s of slides; track s.img; let i = $index) {
          <div class="slide" [class.on]="i === current" [style.background-image]="'url(' + s.img + ')'"
               [style.--pos]="s.pos || 'center'"
               [style.--pos-m]="s.posM || s.pos || 'center'"></div>
        }
        <div class="hero-shade"></div>
      </div>

      <div class="container hero-content">
        @for (s of slides; track s.img; let i = $index) {
          @if (i === current) {
            <div class="hero-text fade-up">
              <span class="eyebrow">{{ s.eyebrow }}</span>
              <h1>{{ s.t1 }} <span class="hl">{{ s.t2 }}</span></h1>
              <p class="hero-sub">{{ s.sub }}</p>
              <div class="hero-cta">
                <a [routerLink]="s.link" class="btn btn-primary">{{ s.cta }}</a>
                <a [href]="wa" target="_blank" rel="noopener" class="btn btn-wa">
                  <app-icon name="whatsapp" [size]="17" /> Order on WhatsApp
                </a>
              </div>
              <ul class="hero-chips">
                <li class="chip-rate"><app-icon name="star" [size]="15" /> {{ farm.rating }} rated · {{ farm.customersServed }} happy customers</li>
                <li><app-icon name="truck" [size]="15" /> Doorstep in 2 hours</li>
                <li><app-icon name="leaf" [size]="15" /> 100% A2 desi cows</li>
                <li><app-icon name="shield" [size]="15" /> Lab certificate on request</li>
              </ul>
            </div>
          }
        }
      </div>

      <button type="button" class="hero-arrow left" (click)="prev()" aria-label="Previous slide">‹</button>
      <button type="button" class="hero-arrow right" (click)="next()" aria-label="Next slide">›</button>

      <div class="hero-dots">
        @for (s of slides; track s.img; let i = $index) {
          <button type="button" [class.on]="i === current" (click)="go(i)"
                  [attr.aria-label]="'Slide ' + (i + 1) + ' of ' + slides.length"
                  [attr.aria-current]="i === current"></button>
        }
      </div>
    </section>

    <!-- ================= LOGO MEDALLION DIVIDER ================= -->
    <div class="medallion">
      <hr class="gold-rule" />
      <img [src]="farm.logo" alt="Aryavart Dairy Farm emblem" width="86" height="86" />
      <hr class="gold-rule" />
      <p>{{ farm.tagline2 }}</p>
    </div>

    <!-- ================= PRODUCTS PREVIEW ================= -->
    <section class="section section-alt">
      <div class="container">
        <div class="section-head">
          <span class="section-label">From our farm</span>
          <h2>Fresh from the <span class="hl">morning milking</span></h2>
          <p>Add to cart and send your entire order in a single WhatsApp message.</p>
        </div>

        @if (loading) {
          <div class="prev-grid">
            @for (s of [1, 2, 3, 4]; track s) { <div class="skeleton" style="height: 320px;"></div> }
          </div>
        } @else if (products.length > 0) {
          <!--
            A native scroll-snap track rather than a transform carousel: it gets
            touch swiping, keyboard scrolling and the responsive card count for
            free, and auto-advance is then just a smooth scrollBy of one page.
          -->
          <div class="slider-wrap"
               (mouseenter)="holdSlider = true" (mouseleave)="holdSlider = false"
               (focusin)="holdSlider = true" (focusout)="holdSlider = false">
            <div #track class="slider" (scroll)="measure()"
                 role="region" aria-label="Our products" tabindex="0">
              @for (p of products; track p.id) {
                <article class="prev-card p-slide">
                  <a routerLink="/products" class="media" [attr.aria-label]="p.name">
                    <img [src]="img.src(p)" [alt]="p.name" loading="lazy"
                         width="1200" height="900" (error)="img.failed(p)" />
                    <span class="prev-cat">{{ p.category }}</span>
                  </a>
                  <div class="prev-body">
                    <h3>{{ p.name }}</h3>
                    <div class="prev-price">₹{{ p.price | number: '1.0-2' }} <span>/ {{ p.unit }}</span></div>
                    <button type="button" class="btn btn-outline btn-sm prev-add" (click)="quickAdd(p)">
                      @if (added[p.id!]) {
                        <app-icon name="check" [size]="15" [stroke]="2.4" /> Added
                      } @else {
                        <app-icon name="plus" [size]="15" [stroke]="2.4" /> Add to cart
                      }
                    </button>
                  </div>
                </article>
              }
            </div>

            @if (pages > 1) {
              <button type="button" class="s-arrow left" (click)="scrollPage(-1)" aria-label="Previous products">‹</button>
              <button type="button" class="s-arrow right" (click)="scrollPage(1)" aria-label="Next products">›</button>
            }
          </div>

          <div class="slider-foot">
            @if (pages > 1) {
              <div class="s-dots">
                @for (d of dots(); track d) {
                  <button type="button" [class.on]="d === page" (click)="goPage(d)"
                          [attr.aria-label]="'Go to product page ' + (d + 1)"
                          [attr.aria-current]="d === page"></button>
                }
              </div>
            }
            <a routerLink="/products" class="btn btn-outline">See all products <app-icon name="arrow-right" [size]="16" /></a>
          </div>
        } @else {
          <p class="muted">Today's fresh listing is being prepared — please check back in a moment.</p>
        }
      </div>
    </section>

    <!-- ================= WHY US ================= -->
    <section class="section">
      <div class="container">
        <div class="section-head">
          <span class="section-label">Why Aryavart</span>
          <h2>Purity you can taste, <span class="hl">promises we keep</span></h2>
          <p>Every product follows one simple principle — quality over quantity.</p>
        </div>
        <div class="feat-grid">
          @for (f of features; track f.title) {
            <div class="card feat">
              <span class="feat-ic"><app-icon [name]="f.icon" [size]="22" /></span>
              <h3>{{ f.title }}</h3>
              <p>{{ f.body }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- ================= CUSTOMER REVIEWS ================= -->
    <section class="section section-alt" aria-label="Customer reviews">
      <div class="container">
        <div class="section-head">
          <span class="section-label">Loved across Muzaffarpur</span>
          <h2>Rated {{ farm.rating }} by <span class="hl">{{ farm.customersServed }} happy customers</span></h2>
          <p>Real families, real mornings — this is what they tell us.</p>
        </div>

        <div class="rate-band card">
          <div class="rate-big">
            <span class="rate-num">{{ farm.rating }}</span>
            <span class="rate-of">/ {{ farm.ratingOutOf }}</span>
          </div>
          <div class="rate-meta">
            <span class="stars" [style.--fill.%]="(farm.rating / farm.ratingOutOf) * 100" aria-hidden="true">
              <span class="stars-back">★★★★★</span>
              <span class="stars-front">★★★★★</span>
            </span>
            <span class="rate-note">Average rating from {{ farm.customersServed }} customers served</span>
          </div>
          <div class="rate-tags">
            <span><app-icon name="users" [size]="15" /> {{ farm.customersServed }} families</span>
            <span><app-icon name="truck" [size]="15" /> Morning & evening delivery</span>
            <span><app-icon name="whatsapp" [size]="15" /> Orders on WhatsApp</span>
          </div>
        </div>

        <div class="rev-grid">
          @for (r of reviews; track r.name) {
            <figure class="card rev">
              <span class="stars stars-sm" [style.--fill.%]="(r.stars / 5) * 100"
                    [attr.aria-label]="r.stars + ' out of 5 stars'">
                <span class="stars-back">★★★★★</span>
                <span class="stars-front">★★★★★</span>
              </span>
              <blockquote>“{{ r.text }}”</blockquote>
              <figcaption>
                <b>{{ r.name }}</b>
                <span>{{ r.area }}</span>
              </figcaption>
            </figure>
          }
        </div>
      </div>
    </section>

    <!-- ================= MILK SPOTLIGHT ================= -->
    <section class="section">
      <div class="container ghee-grid">
        <div class="ghee-media">
          <img [src]="farm.photos.milkBottle" alt="Aryavart pure A2 milk bottle"
               loading="lazy" width="1200" height="900" />
        </div>
        <div>
          <span class="section-label">Our flagship</span>
          <h2>Pure A2 Milk — <span class="hl">nothing added, nothing taken away</span></h2>
          <p class="ghee-copy">
            Milked at dawn from our own desi cows, cooled the moment it leaves the shed and sent out the
            same morning. No powder, no dilution, no preservatives — just whole A2 milk with the cream
            still sitting on top.
          </p>
          <ul class="ghee-points">
            <li>Whole A2 milk — cream and all</li>
            <li>Never powdered, never diluted</li>
            <li>Lab certificate available on request</li>
          </ul>
          <a routerLink="/products" class="btn btn-gold mt">Order milk</a>
        </div>
      </div>
    </section>

    <!-- ================= FARM QUOTE BAND ================= -->
    <section class="farm-band" [style.background-image]="'url(' + farm.photos.quoteBand + ')'">
      <div class="fb-overlay"></div>
      <div class="container fb-content">
        <img [src]="farm.logo" alt="" width="78" height="78" />
        <blockquote>“Quality over quantity — that is the promise we milk by, every single morning.”</blockquote>
        <hr class="gold-rule" />
      </div>
    </section>

    <!-- ================= CONNECT ================= -->
    <section class="section">
      <div class="container">
        <div class="section-head">
          <span class="section-label">Stay close to the farm</span>
          <h2>Follow the milking, <span class="hl">message us anytime</span></h2>
          <p>Every batch, every morning — posted as it happens. Tap any card to open it.</p>
        </div>
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
      </div>
    </section>

    <!-- ================= FOUNDERS ================= -->
    <section class="section section-alt">
      <div class="container">
        <div class="section-head">
          <span class="section-label">Our founders' thought</span>
          <h2>Built with a <span class="hl">big heart</span></h2>
        </div>
        <div class="grid-2">
          <figure class="card quote">
            <div class="qmark">“</div>
            <blockquote>
              I believe food should be pure, honest, and made with care. Aryavart Dairy Farm is our promise to bring
              families milk and dairy the way nature intended — fresh, safe, and full of love. Small beginnings, but a
              big heart behind every product.
            </blockquote>
            <figcaption>—
              <a [href]="farm.founderInstagram" target="_blank" rel="noopener" class="founder-link">Sourabh Singh</a>, Founder
            </figcaption>
          </figure>
          <figure class="card quote">
            <div class="qmark">“</div>
            <blockquote>
              Our goal is simple — deliver fresh, natural, and trustworthy dairy to every home. This farm is our way of
              keeping tradition alive and giving families the food they can truly trust. Pure, honest, and made with
              care.
            </blockquote>
            <figcaption>— Prince Kumar, Founder</figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- ================= FAQ ================= -->
    <section class="section">
      <div class="container faq-wrap">
        <div class="section-head">
          <span class="section-label">FAQ</span>
          <h2>Frequently asked questions</h2>
        </div>
        @for (f of faqs; track f.q) {
          <details class="faq">
            <summary>{{ f.q }}<span class="faq-sign"></span></summary>
            <p>{{ f.a }}</p>
          </details>
        }
      </div>
    </section>

    <!-- ================= CTA BAND ================= -->
    <section class="cta-band">
      <div class="container cta-inner">
        <div>
          <h2>Farm-fresh A2 dairy, delivered to your door</h2>
          <p>Order on WhatsApp — confirmed within 30 minutes.</p>
        </div>
        <a [href]="wa" target="_blank" rel="noopener" class="btn cta-btn">
          <app-icon name="whatsapp" [size]="17" /> Order on WhatsApp
        </a>
      </div>
    </section>

    <!-- ================= WELCOME POPUP ================= -->
    @if (welcomeOpen) {
      <div class="wl-back" (click)="closeWelcome()">
        <div class="wl-card fade-up" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-label="Welcome">
          <img [src]="farm.logo" alt="" />
          <h3>Welcome to Aryavart<sup class="tm">™</sup></h3>
          <p>Kindly login or register to see your bills, track payments and order faster.</p>
          <div class="wl-actions">
            <a routerLink="/login" class="btn btn-primary" (click)="closeWelcome()">Login</a>
            <a routerLink="/register" class="btn btn-outline" (click)="closeWelcome()">Register</a>
          </div>
          <button type="button" class="wl-skip" (click)="closeWelcome()">Skip — I'll do it later</button>
        </div>
      </div>
    }
  `,
  styles: [`
    .wl-back {
      position: fixed; inset: 0; z-index: 120;
      background: rgba(5, 4, 2, 0.72); backdrop-filter: blur(5px);
      display: grid; place-items: center; padding: 20px;
    }
    .wl-card {
      width: min(400px, 100%); text-align: center;
      background: #12100A; border: 1px solid var(--line); border-radius: var(--radius);
      box-shadow: var(--shadow); padding: 34px 30px 24px;
    }
    .wl-card img {
      width: 86px; height: 86px; border-radius: 50%; margin: 0 auto 16px;
      border: 2px solid var(--gold); box-shadow: 0 0 26px rgba(201, 162, 39, 0.4);
    }
    .wl-card h3 { font-size: 1.5rem; color: var(--gold-2); margin-bottom: 8px; }
    .wl-card p { color: var(--muted); font-size: 0.94rem; margin-bottom: 20px; }
    .wl-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
    .wl-actions .btn { min-width: 120px; }
    .wl-skip {
      margin-top: 16px; background: none; border: none; cursor: pointer;
      color: var(--muted); font-size: 0.82rem; text-decoration: underline dotted;
      font-family: var(--font-body);
    }
    .wl-skip:hover { color: var(--gold-2); }
    .founder-link { color: var(--gold-2); text-decoration: underline dotted; text-underline-offset: 3px; }
    .founder-link:hover { color: #F2DE9B; }

    /* ---------- hero slider ---------- */
    /* A 780px-tall hero on a 1905px-wide screen is a 2.4:1 box holding a 16:9
       photograph, so cover was throwing away nearly a third of every image's
       height — which is what cut the cow's head and back off. Letting the hero
       grow taller brings the box ratio back towards the pictures' own. */
    .hero { position: relative; overflow: hidden;
      height: clamp(540px, 80vh, 880px);
      height: clamp(540px, 80svh, 880px); /* svh: steady on iOS while the URL bar collapses */
    }
    .hero-media { position: absolute; inset: 0; }
    .slide {
      position: absolute; inset: 0;
      background-size: cover; background-position: var(--pos, center);
      opacity: 0; transition: opacity 1.1s ease;
      filter: brightness(1.16) saturate(1.06);
    }
    .slide.on { opacity: 1; animation: kenburns 8s ease forwards; }
    @keyframes kenburns { from { transform: scale(1.09); } to { transform: scale(1); } }
    /* The old wash started at 94% black on the left, which buried whatever the
       photograph had on that side. Now the darkness is concentrated in an
       ellipse behind the copy instead of smeared across the whole left half,
       and the headline carries its own shadow — so the text stays legible while
       the picture is actually visible. */
    .hero-shade {
      position: absolute; inset: 0;
      background:
        radial-gradient(58% 82% at 24% 50%, rgba(7, 6, 4, 0.68) 0%, rgba(7, 6, 4, 0.18) 62%, transparent 100%),
        linear-gradient(90deg, rgba(9, 8, 5, 0.40) 0%, rgba(9, 8, 5, 0.16) 46%, rgba(9, 8, 5, 0.04) 74%, rgba(9, 8, 5, 0.22) 100%),
        linear-gradient(0deg, rgba(9, 8, 5, 0.58) 0%, transparent 24%);
    }
    .hero-content { position: relative; height: 100%; display: flex; align-items: center; }
    .hero-text { max-width: 640px; padding: 40px 0 76px; }
    .hero-text h1 { text-shadow: 0 2px 22px rgba(0, 0, 0, 0.8), 0 1px 4px rgba(0, 0, 0, 0.75); }
    .hero-text .eyebrow { text-shadow: 0 1px 6px rgba(0, 0, 0, 0.9); }
    .hero-sub {
      margin: 18px 0 28px; font-size: 1.08rem; color: #E2DCC8; max-width: 540px;
      text-shadow: 0 1px 10px rgba(0, 0, 0, 0.85);
    }
    .hero-cta { display: flex; gap: 14px; flex-wrap: wrap; }
    .hero-chips { list-style: none; display: flex; gap: 10px; flex-wrap: wrap; margin-top: 28px; }
    .hero-chips li {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(13, 12, 9, 0.62); backdrop-filter: blur(4px);
      border: 1px solid var(--line-soft); border-radius: 999px;
      padding: 7px 15px; font-size: 0.84rem; font-weight: 600; color: var(--clay);
    }
    .hero-chips app-icon { color: var(--gold-2); }
    .hero-arrow {
      position: absolute; top: 50%; transform: translateY(-50%); z-index: 5;
      width: 46px; height: 46px; border-radius: 50%;
      background: rgba(13, 12, 9, 0.55); color: var(--gold-2);
      border: 1px solid var(--line); font-size: 1.7rem; line-height: 1;
      cursor: pointer; backdrop-filter: blur(4px);
      transition: background 0.15s ease;
      display: grid; place-items: center; padding-bottom: 4px;
    }
    .hero-arrow:hover { background: rgba(201, 162, 39, 0.25); }
    .hero-arrow.left { left: 18px; }
    .hero-arrow.right { right: 18px; }
    .hero-dots { position: absolute; bottom: 24px; left: 0; right: 0; display: flex; justify-content: center; gap: 10px; z-index: 5; }
    .hero-dots button {
      width: 30px; height: 4px; border-radius: 999px; border: none; cursor: pointer; padding: 0;
      background: rgba(228, 199, 102, 0.32); transition: background 0.2s ease, width 0.2s ease;
    }
    .hero-dots button.on { background: var(--gold-2); width: 46px; }

    /* ---------- medallion divider ---------- */
    .medallion { text-align: center; padding: 34px 0 8px; }
    .medallion img {
      width: 86px; height: 86px; border-radius: 50%; margin: -14px auto;
      position: relative; z-index: 1; display: inline-block;
      filter: drop-shadow(0 10px 26px rgba(0, 0, 0, 0.7)) drop-shadow(0 0 22px rgba(201, 162, 39, 0.4));
    }
    .medallion .gold-rule { margin: 0 auto; }
    .medallion p {
      font-family: var(--font-display); letter-spacing: 0.34em; text-transform: uppercase;
      color: var(--gold-2); font-size: 0.9rem; margin-top: 20px;
    }

    /* ---------- why us ---------- */
    .feat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(235px, 1fr)); gap: 18px; }
    .feat { transition: transform 0.2s ease, border-color 0.2s ease; }
    .feat:hover { transform: translateY(-4px); border-color: var(--line); }
    .feat-ic {
      width: 46px; height: 46px; border-radius: 13px; display: grid; place-items: center;
      background: var(--leaf-soft); border: 1px solid var(--line-soft); color: var(--gold-2);
      margin-bottom: 14px;
    }
    .feat h3 { margin-bottom: 6px; color: var(--gold-2); font-size: 1.06rem; }
    .feat p { color: var(--muted); font-size: 0.94rem; }

    /* ---------- customer reviews ---------- */
    .chip-rate { border-color: var(--line); }
    .chip-rate app-icon { color: var(--gold-2); }

    .rate-band {
      display: flex; align-items: center; gap: 26px; flex-wrap: wrap;
      padding: 22px 26px; margin-bottom: 26px;
      background: linear-gradient(115deg, rgba(201, 162, 39, 0.12), rgba(201, 162, 39, 0.03) 60%), var(--surface);
    }
    .rate-big { display: flex; align-items: baseline; gap: 6px; }
    .rate-num { font-family: var(--font-display); font-size: 3.2rem; line-height: 1; color: var(--gold-2); }
    .rate-of { color: var(--muted); font-size: 1.05rem; }
    .rate-meta { display: flex; flex-direction: column; gap: 4px; }
    .rate-note { color: var(--muted); font-size: 0.88rem; }
    .rate-tags { display: flex; gap: 10px; flex-wrap: wrap; margin-left: auto; }
    .rate-tags span {
      display: inline-flex; align-items: center; gap: 7px;
      border: 1px solid var(--line-soft); border-radius: 999px;
      padding: 7px 14px; font-size: 0.82rem; font-weight: 600; color: var(--clay);
      background: rgba(13, 12, 9, 0.5);
    }
    .rate-tags app-icon { color: var(--gold-2); }

    /* Partial star fill: two identical star rows stacked; the gold front row
       is clipped to --fill% (88% for 4.4/5) — pixel-accurate on every browser,
       no images, no masks. */
    .stars {
      position: relative; display: inline-block; line-height: 1;
      font-size: 1.35rem; letter-spacing: 3px; user-select: none;
    }
    .stars-back { color: rgba(228, 199, 102, 0.25); }
    .stars-front {
      position: absolute; inset: 0; overflow: hidden; white-space: nowrap;
      width: var(--fill, 100%); color: var(--gold-2);
      text-shadow: 0 0 14px rgba(228, 199, 102, 0.35);
    }
    .stars-sm { font-size: 1rem; letter-spacing: 2.5px; }

    .rev-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 18px; }
    .rev { display: flex; flex-direction: column; gap: 12px; }
    .rev blockquote { color: var(--ivory); font-size: 0.96rem; line-height: 1.6; flex: 1; }
    .rev figcaption { display: flex; flex-direction: column; border-top: 1px dashed var(--line-soft); padding-top: 12px; }
    .rev figcaption b { color: var(--gold-2); font-size: 0.95rem; }
    .rev figcaption span { color: var(--muted); font-size: 0.82rem; }

    @media (max-width: 700px) {
      .rate-band { gap: 14px; }
      .rate-tags { margin-left: 0; }
      .rev-grid { grid-template-columns: 1fr; }
    }

    /* ---------- product preview / slider ---------- */
    .prev-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 18px; }

    .slider-wrap { position: relative; }
    .slider {
      display: flex; gap: 18px;
      overflow-x: auto; overscroll-behavior-x: contain;
      scroll-snap-type: x mandatory; scroll-behavior: smooth;
      scrollbar-width: none; -ms-overflow-style: none;
      padding: 4px 2px;
    }
    .slider::-webkit-scrollbar { display: none; }
    .slider:focus-visible { outline: 2.5px solid var(--gold-2); outline-offset: 4px; border-radius: 6px; }
    /* four across, then three, two, one — the track paginates by its own width,
       so the dots stay correct at every breakpoint without extra maths */
    .p-slide { flex: 0 0 calc((100% - 54px) / 4); scroll-snap-align: start; }
    @media (max-width: 1100px) { .p-slide { flex-basis: calc((100% - 36px) / 3); } }
    @media (max-width: 820px)  { .p-slide { flex-basis: calc((100% - 18px) / 2); } }
    @media (max-width: 560px)  { .p-slide { flex-basis: 100%; } }

    .s-arrow {
      position: absolute; top: 38%; transform: translateY(-50%); z-index: 3;
      width: 42px; height: 42px; border-radius: 50%;
      background: rgba(13, 12, 9, 0.82); color: var(--gold-2);
      border: 1px solid var(--line); font-size: 1.6rem; line-height: 1;
      cursor: pointer; backdrop-filter: blur(4px);
      display: grid; place-items: center; padding-bottom: 4px;
      transition: background 0.15s ease, transform 0.15s ease;
    }
    .s-arrow:hover { background: rgba(201, 162, 39, 0.28); }
    .s-arrow.left { left: -14px; }
    .s-arrow.right { right: -14px; }
    @media (max-width: 900px) { .s-arrow { display: none; } }

    .slider-foot {
      display: flex; align-items: center; justify-content: space-between;
      gap: 16px; flex-wrap: wrap; margin-top: 22px;
    }
    .s-dots { display: flex; gap: 8px; }
    .s-dots button {
      width: 26px; height: 4px; border-radius: 999px; border: none; padding: 0; cursor: pointer;
      background: rgba(228, 199, 102, 0.28); transition: background 0.2s ease, width 0.2s ease;
    }
    .s-dots button.on { background: var(--gold-2); width: 40px; }
    .slider-foot .btn { margin-left: auto; }
    .prev-card {
      background: var(--surface); border: 1px solid var(--line-soft);
      border-radius: var(--radius); overflow: hidden;
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
      display: flex; flex-direction: column;
    }
    .prev-card:hover { transform: translateY(-4px); box-shadow: var(--shadow); border-color: var(--line); }
    .prev-cat {
      position: absolute; top: 10px; left: 10px; z-index: 1;
      background: rgba(9, 8, 5, 0.8); color: var(--gold-2); border: 1px solid var(--line);
      font-size: 0.66rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
      padding: 3px 10px; border-radius: 999px; backdrop-filter: blur(3px);
    }
    .prev-body { padding: 16px 18px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
    .prev-body h3 { font-size: 1.02rem; }
    .prev-price { font-family: var(--font-display); font-size: 1.2rem; color: var(--gold-2); }
    .prev-price span { font-family: var(--font-body); font-size: 0.82rem; color: var(--muted); font-weight: 600; }
    .prev-add { margin-top: auto; }

    /* ---------- craft spotlight ---------- */
    .ghee-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 44px; align-items: center; }
    .ghee-media { border-radius: var(--radius); overflow: hidden; border: 1px solid var(--line); box-shadow: var(--shadow); }
    .ghee-media img { width: 100%; height: 100%; object-fit: cover; }
    .ghee-copy { color: var(--muted); margin: 14px 0 16px; }
    .ghee-points { list-style: none; display: flex; flex-direction: column; gap: 9px; }
    .ghee-points li { padding-left: 26px; position: relative; color: var(--ivory); }
    .ghee-points li::before { content: '✦'; position: absolute; left: 0; color: var(--gold-2); }

    /* ---------- farm quote band ---------- */
    .farm-band { position: relative; background-size: cover; background-position: center; padding: 96px 0; }
    /* A flat 78% black wash hid the photograph almost completely. This keeps the
       contrast where the words actually sit and lets the picture read elsewhere. */
    .fb-overlay {
      position: absolute; inset: 0;
      background:
        radial-gradient(58% 68% at 50% 50%, rgba(6, 5, 3, 0.58) 0%, rgba(6, 5, 3, 0.20) 100%),
        linear-gradient(180deg, rgba(8, 7, 4, 0.22) 0%, rgba(8, 7, 4, 0.36) 100%);
    }
    .fb-content { position: relative; text-align: center; max-width: 760px; }
    .fb-content img { width: 78px; height: 78px; border-radius: 50%; margin: 0 auto 22px; filter: drop-shadow(0 0 24px rgba(201, 162, 39, 0.45)); }
    .fb-content blockquote {
      font-family: var(--font-display); font-size: clamp(1.25rem, 2.6vw, 1.7rem);
      color: var(--ivory); line-height: 1.5; margin-bottom: 24px;
      text-shadow: 0 2px 18px rgba(0, 0, 0, 0.85), 0 1px 3px rgba(0, 0, 0, 0.7);
    }

    /* ---------- founders ---------- */
    .quote { position: relative; padding-top: 34px; }
    .qmark { position: absolute; top: 6px; left: 18px; font-family: var(--font-display); font-size: 3.4rem; color: var(--gold); opacity: 0.55; line-height: 1; }
    .quote blockquote { font-family: var(--font-display); font-size: 1.04rem; line-height: 1.6; color: var(--ivory); }
    .quote figcaption { margin-top: 14px; font-weight: 700; color: var(--clay); }

    /* ---------- faq ---------- */
    .faq-wrap { max-width: 800px; }
    .faq {
      background: var(--surface); border: 1px solid var(--line-soft); border-radius: 12px;
      padding: 4px 20px; margin-bottom: 10px; transition: border-color 0.2s ease;
    }
    .faq[open] { border-color: var(--line); }
    .faq summary {
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      font-weight: 700; cursor: pointer; color: var(--gold-2); padding: 15px 0; list-style: none;
    }
    .faq summary::-webkit-details-marker { display: none; }
    .faq-sign { position: relative; width: 14px; height: 14px; flex-shrink: 0; }
    .faq-sign::before, .faq-sign::after {
      content: ''; position: absolute; background: var(--gold-2); border-radius: 2px;
      transition: transform 0.25s ease, opacity 0.25s ease;
    }
    .faq-sign::before { inset: 6px 0 6px 0; height: 2px; }
    .faq-sign::after { inset: 0 6px 0 6px; width: 2px; }
    .faq[open] .faq-sign::after { transform: rotate(90deg); opacity: 0; }
    .faq p { color: var(--muted); padding-bottom: 16px; }

    /* ---------- cta band ---------- */
    .cta-band { background: var(--gold-grad); padding: 48px 0; margin-top: 24px; }
    .cta-inner { display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
    .cta-inner h2, .cta-inner p { color: #171307; }
    .cta-inner p { margin-top: 4px; font-weight: 600; }
    .cta-btn { background: #14110A; color: var(--gold-2); }
    .cta-btn:hover { background: #000; color: var(--gold-2); }

    @media (max-width: 880px) {
      .hero { height: clamp(560px, 88vh, 720px); }
      .hero-arrow { display: none; }
      /* Tall phone crop: the image fills by height, so the horizontal focal
         point decides what you see — each slide sets its own via --pos-m. */
      .slide { background-position: var(--pos-m, var(--pos, center)); }
      .ghee-grid { grid-template-columns: 1fr; }
      .farm-band { padding: 70px 0; }
    }
    @media (max-width: 640px) {
      .hero { height: clamp(500px, 82vh, 640px); height: clamp(500px, 82svh, 640px); }
    }
  `]
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private api = inject(ApiService);
  auth = inject(AuthService);
  cart = inject(CartService);

  farm = FARM;
  socials = SOCIALS;
  reviews = REVIEWS;
  wa = waLink();
  img = new ProductImage();

  products: Product[] = [];
  loading = true;
  added: Record<string, boolean> = {};

  // ---- product slider ----
  @ViewChild('track') private track?: ElementRef<HTMLDivElement>;
  pages = 1;
  page = 0;
  holdSlider = false;
  private slideTimer: ReturnType<typeof setInterval> | null = null;

  current = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private paused = false;

  /**
   * Four distinct photographs. The slider used to reuse the very same files as
   * the milk, ghee and paneer product cards, so the page opened by showing you
   * the pictures it was about to show you again further down.
   */
  slides: Slide[] = [
    {
      img: FARM.photos.heroFarm,
      pos: '62% 12%',
      posM: '10% center',
      eyebrow: 'Grass-fed · Desi A2 cows',
      t1: 'From our pastures,',
      t2: 'to your table.',
      sub: 'Ethically raised cows, unhurried mornings, and milk at your doorstep within two hours of milking.',
      cta: 'Explore products',
      link: '/products'
    },
    {
      img: FARM.photos.heroMilk,
      pos: 'center 30%',
      posM: '22% center',
      eyebrow: 'Muzaffarpur · Bihar',
      t1: 'Unmixed. Unprocessed.',
      t2: 'Unmatched.',
      sub: 'Pure A2 milk with nothing added and nothing taken away — honest dairy, the way nature intended.',
      cta: 'Shop A2 milk',
      link: '/products'
    },
    {
      img: FARM.photos.heroCraft,
      pos: 'center 35%',
      posM: '28% center',
      eyebrow: 'Small batches · Bilona method',
      t1: 'Slow-crafted, the',
      t2: 'traditional way.',
      sub: 'Matka-set curd and hand-churned bilona ghee, made fresh in small batches every single day.',
      cta: 'Discover our craft',
      link: '/about'
    },
    {
      img: FARM.photos.heroSunrise,
      pos: 'center 45%',
      posM: '25% center',
      eyebrow: 'Every morning & evening',
      t1: 'Milked at dawn,',
      t2: 'delivered by breakfast.',
      sub: 'Two deliveries a day, every day — so what reaches your kitchen is never yesterday’s stock.',
      cta: 'See today’s listing',
      link: '/products'
    }
  ];

  features = [
    { icon: 'truck', title: '2-Hour Fresh Delivery', body: 'Milk reaches your doorstep within two hours of milking — maximum freshness, full nutrition.' },
    { icon: 'shield', title: '100% Pure & Chemical-Free', body: 'No preservatives, no shortcuts. Ask for a lab certificate and verify the purity yourself.' },
    { icon: 'sunrise', title: 'Fresh Every Single Day', body: 'Only freshly collected milk goes out each morning — never yesterday’s stock.' },
    { icon: 'pot', title: 'Traditional Bilona Methods', body: 'Curd, ghee and buttermilk crafted the old village way, in small unhurried batches.' }
  ];

  faqs = [
    { q: 'Do you really deliver within 2 hours of milking?', a: 'Yes — to preserve maximum freshness and purity, we deliver milk within two hours of milking.' },
    { q: 'Is the milk pure and chemical-free?', a: 'Absolutely. Our milk is 100% pure with no chemicals or preservatives — and you can request a lab certificate to verify it yourself.' },
    { q: 'How do I place an order?', a: 'Add items to your cart and send the whole order in one WhatsApp message — or quick-order any single product using the WhatsApp button on its card.' },
    { q: 'Are your products made using traditional methods?', a: 'Yes — curd, ghee and buttermilk are all prepared using time-honoured village methods, in small daily batches.' }
  ];

  /** First-visit nudge: shown once per browser session to logged-out visitors. */
  welcomeOpen = false;

  closeWelcome() {
    this.welcomeOpen = false;
    try { sessionStorage.setItem('adf_welcome_seen', '1'); } catch { /* private mode */ }
  }

  ngOnInit() {
    if (!this.auth.isLoggedIn() && !sessionStorage.getItem('adf_welcome_seen')) {
      setTimeout(() => (this.welcomeOpen = true), 700);
    }
    this.api.getProducts().subscribe({
      next: list => {
        // The home strip is a quick "buy today" shelf, so upcoming and sold-out
        // items stay on the Products page where their status is explained.
        this.products = list.filter(x => x.available && !x.comingSoon);
        this.loading = false;
        // the track only has a width once the cards have actually rendered
        setTimeout(() => this.measure());
      },
      error: () => (this.loading = false)
    });
    this.timer = setInterval(() => {
      if (!this.paused) this.next();
    }, 6000);
  }

  ngAfterViewInit() {
    this.measure();
    // Respect the OS setting: an auto-advancing carousel is exactly the kind of
    // motion "reduce motion" is asking us not to start.
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.slideTimer = setInterval(() => {
        if (!this.holdSlider) this.scrollPage(1);
      }, 4500);
    }
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.slideTimer) clearInterval(this.slideTimer);
  }

  /**
   * Width of one "page" — a whole number of cards.
   *
   * Paging by the raw track width would land between snap points, and with
   * `scroll-snap-type: mandatory` the browser then pulls the track to whichever
   * card is nearest. That drifts further out of step with the dots the more
   * products there are, so the step is rounded down to whole cards and always
   * lands exactly on a snap point.
   */
  private step(): number {
    const el = this.track?.nativeElement;
    const first = el?.firstElementChild as HTMLElement | undefined;
    if (!el || !first) return 0;
    const card = first.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    if (!card) return 0;
    const perPage = Math.max(1, Math.floor((el.clientWidth + gap) / (card + gap)));
    return perPage * (card + gap);
  }

  /** Recomputes how many card-pages the track holds and which one is showing. */
  measure() {
    const el = this.track?.nativeElement;
    const step = this.step();
    if (!el || !step) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    this.pages = Math.max(1, Math.ceil(maxScroll / step - 0.02) + 1);
    this.page = Math.max(0, Math.min(this.pages - 1, Math.round(el.scrollLeft / step)));
  }

  @HostListener('window:resize')
  onResize() {
    this.measure();
  }

  dots(): number[] {
    return Array.from({ length: this.pages }, (_, i) => i);
  }

  goPage(i: number) {
    const el = this.track?.nativeElement;
    if (el) el.scrollTo({ left: i * this.step(), behavior: 'smooth' });
  }

  /** Advances by one visible page, wrapping round at either end. */
  scrollPage(dir: number) {
    const el = this.track?.nativeElement;
    const step = this.step();
    if (!el || !step) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    let next = el.scrollLeft + dir * step;
    if (next > maxScroll - 4) next = dir > 0 && el.scrollLeft >= maxScroll - 4 ? 0 : maxScroll;
    if (next < 0) next = dir < 0 && el.scrollLeft <= 4 ? maxScroll : 0;
    el.scrollTo({ left: next, behavior: 'smooth' });
  }

  next() { this.current = (this.current + 1) % this.slides.length; }
  prev() { this.current = (this.current - 1 + this.slides.length) % this.slides.length; }
  go(i: number) { this.current = i; }
  pause() { this.paused = true; }
  resume() { this.paused = false; }

  quickAdd(p: Product) {
    this.cart.add(p, 1);
    this.added[p.id!] = true;
    setTimeout(() => (this.added[p.id!] = false), 1300);
  }
}
