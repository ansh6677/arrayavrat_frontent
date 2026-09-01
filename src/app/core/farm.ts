/** Backend API base URL — set your server URL in production. */
const FORCE_API = '';
const IS_LOCAL = typeof location !== 'undefined'
  && (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

/*
 * 127.0.0.1 — not "localhost" — on purpose: Chrome sometimes force-upgrades
 * http://localhost to https (HSTS) and the plain-HTTP dev backend then fails
 * with ERR_SSL_PROTOCOL_ERROR. The raw IP is never upgraded.
 */
export const API_URL = FORCE_API
  || (IS_LOCAL ? 'http://127.0.0.1:8080/api' : 'https://arryavrat-backend.onrender.com/api');

export const FARM = {
  name: 'Aryavart Dairy Farm',
  shortName: 'ADF',
  tagline: 'Unmixed, Unprocessed, Unmatched…',
  tagline2: 'Pure A2. Pure Health.',
  description:
    'Pure farm-fresh A2 milk, curd, paneer, desi ghee and buttermilk — from our farm to your home within 2 hours of milking.',

  /**
   * Brand mark for the web UI: the farm's own emblem, cropped tight to the
   * medallion and masked to a circle by `tools/build-images.py`.
   */
  logo: 'assets/brand/logo-mark.png',

  /** Untouched original artwork — used for the bill PDF, which needs a JPEG. */
  logoPrint: 'assets/brand/mainlogo.jpeg',

  /**
   * Photography. Every file here is produced by `tools/build-images.py` from the
   * masters in `photo-masters/`, so heroes are all 16:9 and products all 4:3
   * with one shared colour grade. Re-run that script after changing a master.
   */
  photos: {
    heroFarm: 'assets/photos/hero-farm.jpg',
    heroMilk: 'assets/photos/hero-milk.jpg',
    heroCraft: 'assets/photos/hero-craft.jpg',
    heroGhee: 'assets/photos/hero-ghee.jpg',
    heroSunrise: 'assets/photos/farm-sunrise.jpg',
    milkBottle: 'assets/photos/prod-milk.jpg',
    farmGolden: 'assets/photos/farm-golden.jpg',
    farmSunrise: 'assets/photos/farm-sunrise.jpg',
    farmPasture: 'assets/photos/farm-pasture.jpg',
    quoteBand: 'assets/photos/hero-golden.jpg'
  },

  /** Number listed on the website. */
  phone: '9631022006',

  /**
  
   * The site lists 9631022006 — change the value below to '919631022006'
   * if orders should go there instead.
   */
  /**
   * WhatsApp needs the country code — without the leading 91 the wa.me link
   * silently fails on laptops. The number shown on the site stays 9631022006.
   */
  whatsappOrderNumber: '919631022006',

  email: 'aryavardairyfarm@gmail.com',
  fssai: '20426061000097',

  /**
   * Social proof, shown in the hero chip, the home reviews section and the
   * footer trust list. Update these two values and every badge updates.
   */
  rating: 4.4,
  ratingOutOf: 5,
  customersServed: '500+',
  /** UPI payment details printed on every bill (the scan-and-pay box). */
  upiId: '8789816971@ptsbi',
  upiName: 'Sourabh Kumar Singh',
  founderInstagram: 'https://www.instagram.com/sourabh_ms_singh?igsh=MTg3dXVoMTZwaGg0ZA==',
  address:
    'Jiyalal Rai Road, Near New Apartment, Ahiyapur Chowk – Safalta Coaching, Zero Mile, Muzaffarpur, Bihar, India – 842002',
  addressShort: 'Zero Mile, Muzaffarpur, Bihar – 842002',
  mapEmbed:
    'https://maps.google.com/maps?ll=26.145906,85.388088&q=26.145677,85.388453&z=17&output=embed',
  mapLink: 'https://www.google.com/maps/dir/?api=1&destination=26.145677,85.388453',
  instagram: 'https://www.instagram.com/aryavart_farm',
  /** The live site — printed (and tappable) on every bill. */
  website: 'https://www.aryavartdairyfarm.com/',
  websiteLabel: 'www.aryavartdairyfarm.com',
  youtube: 'https://youtube.com/@aryavartdairyfarm',
  timing: 'Fresh delivery every morning & evening — within 2 hours of milking'
};

/** One WhatsApp deep link builder, so every button phrases the opener the same way. */
export function waLink(message = 'I want to place an order.'): string {
  return `https://wa.me/${FARM.whatsappOrderNumber}?text=${encodeURIComponent(
    `Hello ${FARM.name},\n${message}`
  )}`;
}

export interface SocialLink {
  /** Identity of the channel; also drives the card's accent colour (`is-<key>`). */
  key: 'instagram' | 'youtube' | 'whatsapp' | 'phone' | 'email' | 'map';
  /** Glyph name in IconComponent — not always the same word as `key`. */
  icon: string;
  label: string;
  handle: string;
  note: string;
  url: string;
  external: boolean;
}

/**
 * Every way to reach the farm, in one list.
 *
 * The site used to scatter these across a text link in the top bar, three bare
 * icons in the footer and four emoji tiles on the contact page, each with its
 * own markup. Driving them all from one list keeps the handles correct in every
 * place at once and lets them render as the same card everywhere.
 */
export const SOCIALS: SocialLink[] = [
  {
    key: 'whatsapp',
    icon: 'whatsapp',
    label: 'WhatsApp',
    handle: '+91 96310 22006',
    note: 'Order in one message · confirmed in 30 min',
    url: waLink(),
    external: true
  },
  {
    key: 'instagram',
    icon: 'instagram',
    label: 'Instagram',
    handle: '@aryavart_farm',
    note: 'Daily from the farm — milking, matka curd, bilona',
    url: FARM.instagram,
    external: true
  },
  {
    key: 'youtube',
    icon: 'youtube',
    label: 'YouTube',
    handle: '@aryavartdairyfarm',
    note: 'Watch how every batch is actually made',
    url: FARM.youtube,
    external: true
  },
  {
    key: 'phone',
    icon: 'phone',
    label: 'Call the farm',
    handle: '+91 ' + FARM.phone,
    note: 'Bulk orders, subscriptions & anything else',
    url: 'tel:' + FARM.phone,
    external: false
  },
  {
    key: 'email',
    icon: 'mail',
    label: 'Email',
    handle: FARM.email,
    note: 'Wholesale, events and partnership enquiries',
    url: 'mailto:' + FARM.email,
    external: false
  },
  {
    key: 'map',
    icon: 'pin',
    label: 'Visit us',
    handle: FARM.addressShort,
    note: 'Open in Google Maps for directions',
    url: FARM.mapLink,
    external: true
  }
];

/** Social-only subset, for the compact icon rows in the header and footer. */
export const SOCIAL_ICONS = SOCIALS.filter(s =>
  s.key === 'instagram' || s.key === 'youtube' || s.key === 'whatsapp'
);

/* =====================================================================
   Customer reviews — shown in the home page "Loved by our families" section.
   ===================================================================== */

export interface Review {
  name: string;
  area: string;
  stars: 4 | 5;
  text: string;
}

export const REVIEWS: Review[] = [
  {
    name: 'Ramesh Prasad',
    area: 'Ahiyapur, Muzaffarpur',
    stars: 5,
    text: 'Milk reaches our home every morning before 7 — still fresh from milking. The cream on top reminds me of my village days.'
  },
  {
    name: 'Sunita Devi',
    area: 'Mithanpura',
    stars: 5,
    text: 'My kids only drink Aryavart A2 milk now. The matka curd is thick and naturally sweet — no comparison with packet dahi.'
  },
  {
    name: 'Amit Kumar Jha',
    area: 'Bela Industrial Area',
    stars: 4,
    text: 'Ordered bilona ghee for the whole family on WhatsApp. Confirmed in minutes, delivered the same evening. Aroma is amazing.'
  },
  {
    name: 'Pooja Singh',
    area: 'Brahmpura',
    stars: 5,
    text: 'The monthly bill PDF on WhatsApp makes hisaab so easy. Pure milk, honest billing — exactly what a family needs.'
  },
  {
    name: 'Vikash Choudhary',
    area: 'Saraiyaganj',
    stars: 4,
    text: 'Paneer is soft and fresh, clearly made the same day. Evening delivery slot suits our shop timings perfectly.'
  },
  {
    name: 'Nisha Kumari',
    area: 'Kalambagh Road',
    stars: 5,
    text: 'We even asked for the lab certificate — they shared it happily. That confidence is why 500+ families trust this farm.'
  }
];

/* =====================================================================
   Delivery slots — the farm delivers twice a day, so orders can be
   scheduled for the Morning (6–10 AM) or Evening (6–10 PM) window.
   ===================================================================== */

export interface DeliverySlot {
  key: 'morning' | 'evening';
  label: string;
  /** Human window printed on buttons and in the WhatsApp message. */
  window: string;
  /**
   * Last hour (24h) at which the slot can still be booked for TODAY —
   * a 9 AM cutoff for the 6–10 AM round, 8 PM for the 6–10 PM round,
   * so the farm always has time to pack the order.
   */
  cutoffHour: number;
}

export const DELIVERY_SLOTS: DeliverySlot[] = [
  { key: 'morning', label: 'Morning', window: '6:00 – 10:00 AM', cutoffHour: 9 },
  { key: 'evening', label: 'Evening', window: '6:00 – 10:00 PM', cutoffHour: 20 }
];

/** Can this slot still be booked for the given date? (Past dates: never.) */
export function slotAvailable(dateIso: string, key: DeliverySlot['key'], now: Date = new Date()): boolean {
  const slot = DELIVERY_SLOTS.find(s => s.key === key);
  if (!slot || !dateIso) return false;
  const today = isoDate(now);
  if (dateIso < today) return false;          // past date
  if (dateIso > today) return true;           // any future day — both slots open
  return now.getHours() < slot.cutoffHour;    // today — respect the cutoff
}

/**
 * Sensible default when the cart opens: the earliest slot that is still
 * bookable — today's morning, then today's evening, else tomorrow morning.
 */
export function defaultSlotChoice(now: Date = new Date()): { date: string; slot: DeliverySlot['key'] } {
  const today = isoDate(now);
  if (slotAvailable(today, 'morning', now)) return { date: today, slot: 'morning' };
  if (slotAvailable(today, 'evening', now)) return { date: today, slot: 'evening' };
  const t = new Date(now);
  t.setDate(t.getDate() + 1);
  return { date: isoDate(t), slot: 'morning' };
}

/** "Tue, 02 Sep 2026" — how the chosen delivery day reads in the WhatsApp order. */
export function niceDay(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * True on phones/tablets, where upi:// and wa.me open the actual apps.
 * On a laptop the UPI deep link does nothing, so callers show a
 * copy-the-id fallback instead of navigating to a dead link.
 */
export function isProbablyPhone(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/android|iphone|ipod|windows phone/i.test(ua)) return true;
  // iPadOS 13+ reports itself as macOS — the touch points give it away.
  return /ipad|macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1;
}

/**
 * Local photo for each product category.
 *
 * Products carry an `imageUrl` from the backend, but it can be blank — a newly
 * added product, or a row whose image was never set. Falling back by category
 * means a card always shows a real photograph of the right thing instead of an
 * emoji on a pale tile, which was the main reason the grid looked mismatched.
 */
const CATEGORY_PHOTOS: ReadonlyArray<readonly [RegExp, string]> = [
  [/mushroom|khumb/i, 'assets/photos/prod-mushroom.jpg'],
  [/turmeric|haldi/i, 'assets/photos/prod-turmeric.jpg'],
  [/spice|masala|chilli|mirch|coriander|dhania|cumin|jeera/i, 'assets/photos/prod-spices.jpg'],
  [/honey|shahad|madhu/i, 'assets/photos/prod-honey.jpg'],
  [/egg|anda/i, 'assets/photos/prod-eggs.jpg'],
  [/vegetable|sabzi|sabji|greens|produce/i, 'assets/photos/prod-vegetables.jpg'],
  [/sweet|mithai|barfi|burfi|peda|laddu|ladoo|rasgulla|kalakand/i, 'assets/photos/prod-sweets.jpg'],
  [/khoya|khoa|mawa/i, 'assets/photos/prod-khoya.jpg'],
  [/lassi/i, 'assets/photos/prod-lassi.jpg'],
  [/butter\s*milk|chaach|chhach|chaas/i, 'assets/photos/prod-buttermilk-bottle.jpg'],
  [/ghee/i, 'assets/photos/prod-ghee.jpg'],
  [/makhan|white\s*butter|butter/i, 'assets/photos/prod-butter.jpg'],
  [/paneer|cheese/i, 'assets/photos/prod-paneer.jpg'],
  [/curd|dahi|yogh?urt/i, 'assets/photos/prod-curd.jpg'],
  [/cream|malai/i, 'assets/photos/prod-khoya.jpg'],
  [/milk|doodh|dudh/i, 'assets/photos/prod-milk.jpg']
];

const FALLBACK_PHOTO = 'assets/photos/prod-milk.jpg';

/**
 * The product photographs that ship with the site, offered as one-click picks
 * in the management panel so staff can correct a mismatched image without
 * having to know the asset paths.
 */
export const STOCK_PHOTOS: ReadonlyArray<{ label: string; url: string }> = [
  { label: 'A2 Milk', url: 'assets/photos/prod-milk.jpg' },
  { label: 'Curd', url: 'assets/photos/prod-curd.jpg' },
  { label: 'Curd bowl', url: 'assets/photos/CURD3.jpg' },
  { label: 'Paneer', url: 'assets/photos/prod-paneer.jpg' },
  { label: 'Ghee', url: 'assets/photos/prod-ghee.jpg' },
  { label: 'Ghee pot', url: 'assets/photos/hero-ghee.jpg' },
  { label: 'Buttermilk (pots)', url: 'assets/photos/prod-buttermilk.jpg' },
  { label: 'Buttermilk (bottle)', url: 'assets/photos/prod-buttermilk-bottle.jpg' },
  { label: 'Lassi', url: 'assets/photos/prod-lassi.jpg' },
  { label: 'White butter', url: 'assets/photos/prod-butter.jpg' },
  { label: 'Khoya / Malai', url: 'assets/photos/prod-khoya.jpg' },
  { label: 'Mushrooms', url: 'assets/photos/prod-mushroom.jpg' },
  { label: 'Whole spices', url: 'assets/photos/prod-spices.jpg' },
  { label: 'Turmeric', url: 'assets/photos/prod-turmeric.jpg' },
  { label: 'Honey', url: 'assets/photos/prod-honey.jpg' },
  { label: 'Farm eggs', url: 'assets/photos/prod-eggs.jpg' },
  { label: 'Sweets', url: 'assets/photos/prod-sweets.jpg' },
  { label: 'Vegetables', url: 'assets/photos/prod-vegetables.jpg' },
  { label: 'Milk pour', url: 'assets/photos/hero-milk.jpg' },
  { label: 'Cow in pasture', url: 'assets/photos/farm-pasture.jpg' },
  { label: 'Farm at sunrise', url: 'assets/photos/farm-sunrise.jpg' }
];

/** Best available photo for a product — never returns empty. */
export function productPhoto(p: { imageUrl?: string; category?: string; name?: string }): string {
  if (p.imageUrl && p.imageUrl.trim()) return p.imageUrl.trim();
  const haystack = `${p.category || ''} ${p.name || ''}`;
  for (const [pattern, photo] of CATEGORY_PHOTOS) {
    if (pattern.test(haystack)) return photo;
  }
  return FALLBACK_PHOTO;
}

/** Local-timezone-safe YYYY-MM-DD (for input[type=date]). */
export function isoDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * "2026-07" -> "Jul 2026" — the human label for an old-payment billing cycle.
 * Falls back to the raw string when it is not a parseable YYYY-MM.
 */
export function monthLabel(ym?: string | null): string {
  if (!ym) return '';
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return ym;
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const idx = Number(m[2]) - 1;
  if (idx < 0 || idx > 11) return ym;
  return names[idx] + ' ' + m[1];
}

/** Current month as YYYY-MM (max for the old-payment month picker). */
export function isoMonth(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Unique id for one save action, sent as `requestId` so the backend can
 * ignore an accidental duplicate submit (double tap / network retry).
 * Falls back to time+random when crypto.randomUUID is unavailable
 * (non-HTTPS contexts on old browsers).
 */
export function newRequestId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through to the manual id */
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** First day of the current month (YYYY-MM-DD). */
/** "just now", "5m ago", "3h ago", "Yesterday", "12 Aug" — feed-style times. */
/**
 * A UPI deep link with the exact amount pre-filled — one tap opens
 * GPay/PhonePe/Paytm ready to pay. Works wherever the link is tapped on a
 * phone (PDF, WhatsApp, the site); on a desktop it simply does nothing,
 * which callers should handle with a copy-the-id fallback.
 */
export function upiPayLink(amount: number, note = `${FARM.name} bill`): string {
  return 'upi://pay?' + upiParams(amount, note);
}

/** Query string shared by every UPI deep link — always the farm's UPI ID. */
function upiParams(amount: number, note: string): string {
  const amt = (Math.round(amount * 100) / 100).toFixed(2);
  return 'pa=' + encodeURIComponent(FARM.upiId)
    + '&pn=' + encodeURIComponent(FARM.upiName)
    + '&am=' + amt
    + '&cu=INR'
    + '&tn=' + encodeURIComponent(note.slice(0, 40));
}

/** True on iPhones/iPads (incl. iPadOS pretending to be macOS). */
export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  return /macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1;
}

export interface UpiAppLink { id: string; label: string; href: string; }

/**
 * Direct per-app UPI links for the pay sheet. Android's generic upi:// opens
 * the system chooser with EVERY installed UPI app — perfect. But iOS hands
 * the whole upi:// scheme to a single app (whichever registered it last;
 * for many people that is WhatsApp), so iPhones were landing in WhatsApp Pay.
 * The fix: on iOS the customer taps their app and we use that app's own
 * scheme — GPay tez://, PhonePe phonepe://, Paytm paytmmp:// — all carrying
 * the same UPI ID (8789816971@ptsbi) and amount.
 */
export function upiAppLinks(amount: number, note = `${FARM.name} bill`)
  : { generic: string; apps: UpiAppLink[] } {
  const q = upiParams(amount, note);
  return {
    generic: 'upi://pay?' + q,
    apps: [
      { id: 'gpay', label: 'Google Pay', href: 'tez://upi/pay?' + q },
      { id: 'phonepe', label: 'PhonePe', href: 'phonepe://pay?' + q },
      { id: 'paytm', label: 'Paytm', href: 'paytmmp://pay?' + q }
    ]
  };
}

export function relTime(iso?: string | null): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function monthStart(): string {
  const d = new Date();
  return isoDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

/** dd-mm-yyyy for display. */
export function niceDate(iso: string): string {
  if (!iso) return '';
  const parts = iso.split('-');
  return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : iso;
}