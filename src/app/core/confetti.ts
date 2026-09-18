/**
 * The "patakha" — a short confetti burst for the moment a coupon lands.
 *
 * Deliberately dependency-free: one canvas laid over the page, ~1.4s of paper
 * bits, then it removes itself. Nothing is left behind to leak or to repaint,
 * which matters because this fires on a page the customer keeps editing.
 *
 * Colours come from the brand ramp (gold → ivory) with one green for the
 * "you saved something" note, so the burst reads as part of the site rather
 * than a party trick borrowed from somewhere else.
 */

const COLORS = ['#C9A227', '#E4C766', '#F1E9D4', '#8F7519', '#9CC08B'];

interface Bit {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  spin: number;
  angle: number;
  color: string;
}

/** Someone who asked the OS for less motion gets the coupon, not the show. */
function motionOk(): boolean {
  try {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
}

/**
 * @param origin viewport coordinates the burst flies out from. Defaults to the
 *               middle of the upper half — where a phone holder is looking.
 * @param count  number of bits; the default suits a coupon, more suits an order.
 */
export function burstConfetti(origin?: { x: number; y: number }, count = 90): void {
  if (typeof document === 'undefined' || !motionOk()) return;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  document.body.appendChild(canvas);

  const cx = origin?.x ?? w / 2;
  const cy = origin?.y ?? h * 0.38;

  const bits: Bit[] = Array.from({ length: count }, () => {
    // A cone that leans upward: gravity brings it down, which is what makes it
    // read as a burst rather than a fountain.
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.1;
    const speed = 5 + Math.random() * 8;
    return {
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed * (0.8 + Math.random() * 0.6),
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 6,
      spin: (Math.random() - 0.5) * 0.4,
      angle: Math.random() * Math.PI,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    };
  });

  const start = performance.now();
  const LIFE = 1400;

  function frame(now: number) {
    const elapsed = now - start;
    if (elapsed > LIFE) {
      canvas.remove();
      return;
    }
    // Fading the whole canvas near the end beats fading each bit: no bit ever
    // blinks out mid-flight while its neighbours are still bright.
    ctx!.clearRect(0, 0, w, h);
    ctx!.globalAlpha = elapsed > LIFE * 0.6 ? 1 - (elapsed - LIFE * 0.6) / (LIFE * 0.4) : 1;

    for (const b of bits) {
      b.vy += 0.28;              // gravity
      b.vx *= 0.99;              // air drag
      b.x += b.vx;
      b.y += b.vy;
      b.angle += b.spin;

      ctx!.save();
      ctx!.translate(b.x, b.y);
      ctx!.rotate(b.angle);
      ctx!.fillStyle = b.color;
      ctx!.fillRect(-b.size / 2, -b.size / 4, b.size, b.size / 2);
      ctx!.restore();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/** Burst from the middle of the element that was tapped. */
export function burstFrom(el: Element | null | undefined, count?: number): void {
  if (!el) { burstConfetti(undefined, count); return; }
  const r = el.getBoundingClientRect();
  burstConfetti({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, count);
}
