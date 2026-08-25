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

/** First day of the current month (YYYY-MM-DD). */
/** "just now", "5m ago", "3h ago", "Yesterday", "12 Aug" — feed-style times. */
/**
 * A UPI deep link with the exact amount pre-filled — one tap opens
 * GPay/PhonePe/Paytm ready to pay. Works wherever the link is tapped on a
 * phone (PDF, WhatsApp, the site); on a desktop it simply does nothing,
 * which callers should handle with a copy-the-id fallback.
 */
export function upiPayLink(amount: number, note = `${FARM.name} bill`): string {
  const amt = (Math.round(amount * 100) / 100).toFixed(2);
  return 'upi://pay'
    + '?pa=' + encodeURIComponent(FARM.upiId)
    + '&pn=' + encodeURIComponent(FARM.upiName)
    + '&am=' + amt
    + '&cu=INR'
    + '&tn=' + encodeURIComponent(note.slice(0, 40));
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