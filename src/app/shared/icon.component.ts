import { Component, Input } from '@angular/core';

/**
 * One inline SVG set for the whole site.
 *
 * The same phone / mail / Instagram / YouTube / WhatsApp / cart paths used to be
 * pasted into the navbar, the footer, the contact page and the product cards,
 * which is how they drifted apart in size and stroke weight. Shapes are declared
 * as data and rendered through a template, so nothing needs `innerHTML` and the
 * sanitizer never has to be bypassed.
 */
type Shape =
  | { t: 'path'; d: string; fill?: boolean }
  | { t: 'circle'; cx: number; cy: number; r: number; fill?: boolean }
  | { t: 'rect'; x: number; y: number; w: number; h: number; rx: number };

const ICONS: Record<string, Shape[]> = {
  phone: [{ t: 'path', d: 'M5 4h3l2 5-2.5 1.5a12 12 0 0 0 5 5L14 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z' }],
  mail: [
    { t: 'rect', x: 3, y: 5, w: 18, h: 14, rx: 2.5 },
    { t: 'path', d: 'm3.5 7.5 8.5 5.5 8.5-5.5' }
  ],
  pin: [
    { t: 'path', d: 'M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11Z' },
    { t: 'circle', cx: 12, cy: 10, r: 2.6 }
  ],
  clock: [
    { t: 'circle', cx: 12, cy: 12, r: 9 },
    { t: 'path', d: 'M12 7v5l3.5 2' }
  ],
  instagram: [
    { t: 'rect', x: 3, y: 3, w: 18, h: 18, rx: 5 },
    { t: 'circle', cx: 12, cy: 12, r: 4 },
    { t: 'circle', cx: 17.2, cy: 6.8, r: 1.15, fill: true }
  ],
  youtube: [
    { t: 'path', d: 'M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.1 5 12 5 12 5s-6.1 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.9 19 12 19 12 19s6.1 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8Z' },
    { t: 'path', d: 'M10.2 15.2V8.8L15.6 12l-5.4 3.2Z', fill: true }
  ],
  whatsapp: [
    { t: 'path', fill: true, d: 'M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20Zm4.4-5.9c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.8c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.2-2.8c-.2-.4.2-.4.5-1 .1-.2 0-.4 0-.5l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1 0 0-.2-.1-.4-.2Z' }
  ],
  cart: [
    { t: 'path', d: 'M2.5 3.5h2l.6 2m0 0L7 15.2a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.7L19.6 7H5.1Z' },
    { t: 'circle', cx: 9.3, cy: 20.2, r: 1.4 },
    { t: 'circle', cx: 16.6, cy: 20.2, r: 1.4 }
  ],
  search: [
    { t: 'circle', cx: 11, cy: 11, r: 7 },
    { t: 'path', d: 'm20 20-3.2-3.2' }
  ],
  'arrow-up-right': [{ t: 'path', d: 'M8 16 16 8m0 0H9.5M16 8v6.5' }],
  'arrow-right': [{ t: 'path', d: 'M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5' }],
  close: [{ t: 'path', d: 'm6 6 12 12M18 6 6 18' }],
  menu: [{ t: 'path', d: 'M4 7h16M4 12h16M4 17h16' }],
  check: [{ t: 'path', d: 'm4.5 12.5 5 5 10-11' }],
  plus: [{ t: 'path', d: 'M12 5v14M5 12h14' }],
  minus: [{ t: 'path', d: 'M5 12h14' }],
  truck: [
    { t: 'path', d: 'M2.5 6.5h10v9h-10z' },
    { t: 'path', d: 'M12.5 9.5h4l3 3v3h-7z' },
    { t: 'circle', cx: 6.5, cy: 18, r: 1.8 },
    { t: 'circle', cx: 16.5, cy: 18, r: 1.8 }
  ],
  shield: [
    { t: 'path', d: 'M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6l7-3Z' },
    { t: 'path', d: 'm9 12 2 2 4-4.5' }
  ],
  sunrise: [
    { t: 'path', d: 'M3 18.6h18' },
    { t: 'path', d: 'M7.7 18.6a4.3 4.3 0 0 1 8.6 0' },
    { t: 'path', d: 'M12 4.6v2.4M6.1 7.4l1.7 1.7M17.9 7.4l-1.7 1.7M3.2 13.6h2.4M18.4 13.6h2.4' }
  ],
  pot: [
    { t: 'path', d: 'M8.3 4.6h7.4l1.4 2.6H6.9l1.4-2.6Z' },
    { t: 'path', d: 'M7.7 7.2C5.4 9 4.3 11.2 4.3 13.4c0 4.1 3.4 7.4 7.7 7.4s7.7-3.3 7.7-7.4c0-2.2-1.1-4.4-3.4-6.2' }
  ],
  leaf: [
    { t: 'path', d: 'M5 19c0-8 5-13 14-13 0 9-5 13-11 13H5Z' },
    { t: 'path', d: 'M9 15c2-3 5-5 8-6' }
  ],
  star: [{ t: 'path', d: 'm12 4 2.3 4.9 5.2.7-3.8 3.7.9 5.3-4.6-2.5-4.6 2.5.9-5.3L4.5 9.6l5.2-.7L12 4Z' }],
  chat: [{ t: 'path', d: 'M20 12a7.5 7.5 0 0 1-11 6.6L4.5 20l1.4-4.3A7.5 7.5 0 1 1 20 12Z' }],

  // ---- management panel ----
  chart: [
    { t: 'path', d: 'M4 3.6v16.8h16.4' },
    { t: 'path', d: 'M8.4 20.4v-5.2M12.6 20.4V9.4M16.8 20.4v-8.2' }
  ],
  users: [
    { t: 'circle', cx: 9, cy: 8, r: 3.4 },
    { t: 'path', d: 'M3 19.5a6 6 0 0 1 12 0' },
    { t: 'path', d: 'M16 5.4a3.4 3.4 0 0 1 0 5.2M17.6 14.4a6 6 0 0 1 3.4 5.1' }
  ],
  wallet: [
    { t: 'rect', x: 3, y: 5.8, w: 18, h: 12.6, rx: 2.6 },
    { t: 'path', d: 'M21 9.8h-4.2a2.2 2.2 0 0 0 0 4.4H21' },
    { t: 'circle', cx: 17.2, cy: 12, r: 1, fill: true }
  ],
  bottle: [
    { t: 'path', d: 'M10 3h4v3.2l2 2.6V19a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V8.8l2-2.6V3Z' },
    { t: 'path', d: 'M8 12.5h8' }
  ],
  key: [
    { t: 'circle', cx: 8, cy: 12, r: 3.6 },
    { t: 'path', d: 'M11.6 12H21M18 12v3M15 12v2.2' }
  ],
  user: [
    { t: 'circle', cx: 12, cy: 8, r: 3.6 },
    { t: 'path', d: 'M5 20a7 7 0 0 1 14 0' }
  ],
  logout: [
    { t: 'path', d: 'M14 5.5V4a1.5 1.5 0 0 0-1.5-1.5h-7A1.5 1.5 0 0 0 4 4v16a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 14 20v-1.5' },
    { t: 'path', d: 'M9.5 12H21m0 0-3.5-3.5M21 12l-3.5 3.5' }
  ],
  download: [
    { t: 'path', d: 'M12 4v11m0 0 4-4m-4 4-4-4' },
    { t: 'path', d: 'M4.5 18.5h15' }
  ],
  edit: [
    { t: 'path', d: 'M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z' },
    { t: 'path', d: 'm14.5 7.5 2.8 2.8' }
  ],
  trash: [
    { t: 'path', d: 'M4.5 6.5h15M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5' },
    { t: 'path', d: 'M6.5 6.5 7.4 19a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5l.9-12.5' }
  ]
};

/** Names accepted by the `name` input — useful for keeping call sites honest. */
export type IconName = keyof typeof ICONS;

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" [attr.stroke-width]="stroke"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      @for (s of shapes; track $index) {
        @switch (s.t) {
          @case ('path') {
            <path [attr.d]="$any(s).d"
                  [attr.fill]="s.fill ? 'currentColor' : 'none'"
                  [attr.stroke]="s.fill ? 'none' : 'currentColor'" />
          }
          @case ('circle') {
            <circle [attr.cx]="$any(s).cx" [attr.cy]="$any(s).cy" [attr.r]="$any(s).r"
                    [attr.fill]="s.fill ? 'currentColor' : 'none'"
                    [attr.stroke]="s.fill ? 'none' : 'currentColor'" />
          }
          @case ('rect') {
            <rect [attr.x]="$any(s).x" [attr.y]="$any(s).y"
                  [attr.width]="$any(s).w" [attr.height]="$any(s).h"
                  [attr.rx]="$any(s).rx" />
          }
        }
      }
    </svg>
  `,
  styles: [`:host { display: inline-flex; line-height: 0; }`]
})
export class IconComponent {
  @Input({ required: true }) set name(value: string) {
    this.shapes = ICONS[value] ?? [];
  }
  @Input() size = 18;
  @Input() stroke = 1.8;

  shapes: Shape[] = [];
}
