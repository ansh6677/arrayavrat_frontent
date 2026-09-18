import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { ShopSettings } from '../core/models';
import { IconComponent } from '../shared/icon.component';

/**
 * The strip under the website header — the farm's noticeboard.
 *
 * It has no connection to the offers table: whatever is typed here is what
 * scrolls. If the farm wants to announce a coupon they can write the code as
 * a line like any other, but a holiday notice or a new arrival no longer
 * requires inventing an offer to carry it.
 */
@Component({
  selector: 'app-banner-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <div class="head-row">
      <div>
        <h2>Announcement strip</h2>
        <p class="muted">The gold bar under the header on the website. Jo likhoge wahi dikhega.</p>
      </div>
    </div>

    @if (loading) {
      <div class="panel"><span class="spinner"></span> Loading…</div>
    } @else {
      <div class="panel form-panel">
        <label class="switch">
          <input type="checkbox" [(ngModel)]="enabled" name="ben" />
          <span>Show the strip on the website</span>
        </label>

        <div class="field mt">
          <label>Lines <span class="hint-inline">ek se zyada honge to scroll karenge, ek hoga to stir rahega</span></label>
          @for (line of lines; track $index) {
            <div class="ln-row">
              <input [(ngModel)]="lines[$index]" [name]="'ln' + $index" maxlength="120"
                     placeholder="e.g. Ravivar ko delivery band rahegi" />
              <span class="ln-count">{{ lines[$index].length }}/120</span>
              <button type="button" class="ln-del" (click)="removeLine($index)"
                      [attr.aria-label]="'Remove line ' + ($index + 1)">✕</button>
            </div>
          }
          @if (lines.length < 6) {
            <button type="button" class="btn btn-outline btn-sm" (click)="addLine()">
              <app-icon name="plus" [size]="14" [stroke]="2.4" /> Add a line
            </button>
          } @else {
            <p class="hint">Six lines is the most the strip can carry before it takes too long to come around.</p>
          }
        </div>

        <div class="field">
          <label>Colour</label>
          <div class="tones" role="radiogroup" aria-label="Strip colour">
            @for (t of tones; track t.key) {
              <button type="button" class="tone" [class.on]="tone === t.key" role="radio"
                      [attr.aria-checked]="tone === t.key" (click)="tone = t.key">
                <i [class]="'sw sw-' + t.key"></i> {{ t.label }}
              </button>
            }
          </div>
        </div>

        <!-- The real strip, same markup and motion as the website. -->
        <p class="pv-head">Preview</p>
        @if (written().length === 0) {
          <p class="muted pv-empty">Koi line nahi — website pe kuch nahi dikhega.</p>
        } @else {
          <div class="pv-strip" [class.green]="tone === 'green'" [class.red]="tone === 'red'">
            @if (written().length === 1) {
              <p class="pv-one">&#10022; {{ written()[0] }}</p>
            } @else {
              <div class="pv-track">
                @for (l of written(); track $index) {
                  <span class="pv-item">&#10022; {{ l }}</span>
                }
              </div>
            }
          </div>
          @if (!enabled) { <p class="hint">Strip abhi band hai — upar wala switch on karo.</p> }
        }

        @if (canEdit) {
          <div class="actions">
            <button type="button" class="btn btn-gold" (click)="save()" [disabled]="saving">
              @if (saving) { <span class="spinner"></span> } Save
            </button>
            @if (updated) { <span class="muted saved">Last changed {{ updated }}</span> }
          </div>
        } @else {
          <p class="muted">You have view-only access, so this cannot be changed here.</p>
        }
      </div>
    }
  `,
  styles: [`
    .head-row { margin-bottom: 14px; }
    .head-row h2 { margin: 0 0 2px; }
    .form-panel { max-width: 760px; }
    .switch { display: flex; align-items: center; gap: 9px; cursor: pointer; font-size: 0.9rem; }
    .switch input { width: 17px; height: 17px; accent-color: var(--gold); cursor: pointer; }

    .ln-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .ln-row input { flex: 1; min-width: 0; }
    .ln-count { font-size: 0.7rem; color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
    .ln-del {
      flex: none; width: 28px; height: 28px; border: none; border-radius: 7px; cursor: pointer;
      background: var(--danger-soft); color: var(--danger); font-size: 0.85rem; line-height: 1;
    }
    .hint { font-size: 0.76rem; color: var(--muted); margin: 6px 0 0; }

    .tones { display: flex; gap: 8px; flex-wrap: wrap; }
    .tone {
      display: inline-flex; align-items: center; gap: 7px; cursor: pointer;
      padding: 7px 13px; border-radius: 999px; font-size: 0.82rem;
      border: 1px solid var(--line-soft); background: transparent; color: var(--muted);
      font-family: var(--font-body);
    }
    .tone.on { border-color: var(--gold); color: var(--ivory); background: var(--ghee-soft); }
    .sw { width: 13px; height: 13px; border-radius: 4px; display: inline-block; }
    .sw-gold { background: var(--gold-grad); }
    .sw-green { background: linear-gradient(120deg, #6E9C57, #9CC08B); }
    .sw-red { background: linear-gradient(120deg, #B4553F, #E4685A); }

    .pv-head { font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--clay); margin: 18px 0 7px; }
    .pv-empty { font-size: 0.84rem; }
    .pv-strip { overflow: hidden; border-radius: 8px; background: var(--gold-grad); color: #171307; }
    .pv-strip.green { background: linear-gradient(120deg, #6E9C57, #9CC08B 45%, #7ABA60); }
    .pv-strip.red { background: linear-gradient(120deg, #B4553F, #E4685A 45%, #C4543F); color: #FFF1EC; }
    .pv-one { margin: 0; padding: 11px 14px; text-align: center; }
    .pv-track { display: flex; overflow-x: auto; scrollbar-width: none; }
    .pv-track::-webkit-scrollbar { display: none; }
    .pv-one, .pv-item {
      font-size: 0.76rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; white-space: nowrap;
    }
    .pv-item { padding: 11px 0 11px 18px; }

    .actions { display: flex; align-items: center; gap: 12px; margin-top: 18px; }
    .saved { font-size: 0.76rem; }
  `]
})
export class BannerAdminComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);

  loading = true;
  saving = false;
  enabled = false;
  tone = 'gold';
  lines: string[] = [''];
  updated = '';

  tones = [
    { key: 'gold', label: 'Gold — normal' },
    { key: 'green', label: 'Green — good news' },
    { key: 'red', label: 'Red — heads up' }
  ];

  canEdit = this.auth.isFullAdmin();

  ngOnInit() {
    this.api.getShopSettings().subscribe({
      next: s => { this.apply(s); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  /** Only the lines that actually say something — what the strip would show. */
  written(): string[] {
    return this.lines.map(l => l.trim()).filter(l => l.length > 0);
  }

  addLine() {
    if (this.lines.length < 6) this.lines.push('');
  }

  removeLine(i: number) {
    this.lines.splice(i, 1);
    if (this.lines.length === 0) this.lines = [''];
  }

  save() {
    const messages = this.written();
    if (this.enabled && messages.length === 0) {
      this.toast.error('Switch on karne se pehle ek line likho.');
      return;
    }
    this.saving = true;
    this.api.saveBanner({ enabled: this.enabled, messages, tone: this.tone }).subscribe({
      next: s => {
        this.apply(s);
        this.saving = false;
        this.toast.success(this.enabled ? 'Strip updated — website pe dikh raha hai.' : 'Strip switched off.');
      },
      error: err => {
        this.saving = false;
        this.toast.error(err?.error?.message || err?.error?.error || 'Could not save.');
      }
    });
  }

  private apply(s: ShopSettings) {
    this.enabled = !!s.bannerEnabled;
    this.tone = s.bannerTone || 'gold';
    // Always leave one empty row to type into, so the form is never a dead end.
    this.lines = (s.bannerMessages && s.bannerMessages.length > 0) ? [...s.bannerMessages] : [''];
    this.updated = s.updatedAt ? new Date(s.updatedAt).toLocaleString('en-IN') : '';
  }
}
