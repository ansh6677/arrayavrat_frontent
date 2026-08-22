#!/usr/bin/env python3
"""
Aryavart Dairy Farm — asset image pipeline.

Takes the untouched master photographs in ``photo-masters/`` and produces the
web-ready set in ``src/assets/photos/``:

  * every product shot is cropped to the same 4:3 frame at the same pixel size,
    so the product cards line up instead of each one being a different shape;
  * every hero is cropped to the same cinematic 16:9 frame;
  * one shared colour grade ("house look") is applied to all of them, so the
    bright-white curd shot and the moody dark milk shot finally read as
    one photographic system on the black-and-gold theme;
  * the buttermilk studio cut-out is lifted off its white background and placed
    on a warm dark backdrop, matching the rest of the set.

Requires only Pillow. Re-run after dropping new masters in::

    python3 tools/build-images.py
"""

from __future__ import annotations

import os
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASTERS = os.path.join(ROOT, 'photo-masters')
OUT = os.path.join(ROOT, 'src', 'assets', 'photos')

PRODUCT_SIZE = (1200, 900)    # 4:3  — product cards, cart thumbnails
HERO_SIZE = (1920, 1080)      # 16:9 — home slider, quote band (1:1 on a desktop-width hero)
STORY_SIZE = (1400, 933)      # 3:2  — about-page story images

# Warm brown the shadows are tinted towards — sampled from --coal-2 / --surface.
SHADOW_TINT = (36, 26, 12)

# How hard the cut-out matte ramps up as a pixel darkens away from the white
# studio background. 5 puts luma 205 fully opaque and luma 250 at ~2%.
DEFRINGE_GAIN = 5.0


# --------------------------------------------------------------------------
# colour grading
# --------------------------------------------------------------------------

KNEE = 0.55   # where the highlight rolloff starts


def _curve(contrast: float, brightness: float, gamma: float, top: float = 1.0) -> list[int]:
    """256-entry LUT: gamma, contrast around mid-grey, brightness, highlight rolloff.

    ``top`` is the value pure white lands on. Setting it below 1 per channel is
    the only way to rescue a blown-out shot: no amount of contrast can pull
    detail out of clipped whites, but rolling the top end down — further on blue
    than on red — turns glaring paper-white into warm cream.
    """
    lut = []
    for i in range(256):
        v = (i / 255.0) ** gamma
        v = (v - 0.5) * contrast + 0.5 + brightness
        v = max(0.0, min(1.0, v))
        if top < 1.0 and v > KNEE:
            v = KNEE + (v - KNEE) * (top - KNEE) / (1.0 - KNEE)
        lut.append(max(0, min(255, round(v * 255))))
    return lut


def _vignette(size: tuple[int, int], strength: float) -> Image.Image:
    """Smooth radial falloff, computed small and scaled up so it stays gradient-clean."""
    w, h = size
    sw, sh = 96, max(1, round(96 * h / w))
    small = Image.new('L', (sw, sh))
    px = small.load()
    cx, cy = (sw - 1) / 2, (sh - 1) / 2
    for y in range(sh):
        for x in range(sw):
            # normalised distance from centre, 0 at middle, 1 at the corners
            dx, dy = (x - cx) / cx, (y - cy) / cy
            d = min(1.0, ((dx * dx + dy * dy) / 2.0) ** 0.5)
            px[x, y] = round(255 * (1.0 - strength * d * d))
    return small.resize(size, Image.BICUBIC)


def _foliage_shift(im: Image.Image, amount: float) -> Image.Image:
    """Swing green foliage towards golden-olive, leaving everything else alone.

    A plain warm grade cannot fix a flat midday pasture: the green channel is
    what dominates, and lifting red only makes it yellow-green. This isolates
    the pixels where green actually leads and blends just those towards a warm
    harvest tone, so the grass turns golden while a black-and-white cow, milk or
    clay pot in the same frame is untouched.
    """
    r, g, b = im.split()
    # how strongly green leads the other two channels
    lead = ImageChops.subtract(g, ImageChops.lighter(r, b))
    mask = lead.point(lambda v: min(255, round(v * 5.5 * amount)))

    warm = Image.merge('RGB', (
        r.point(_curve(1.0, 0.06, 0.80)),   # lift red
        g.point(_curve(1.0, -0.02, 1.20)),  # pull green down
        b.point(_curve(1.0, -0.01, 1.35)),  # pull blue down harder
    ))
    return Image.composite(warm, im, mask)


def grade(im: Image.Image, *, contrast=1.10, brightness=0.0, warmth=1.0,
          saturation=1.05, tint=0.10, vignette=0.22, foliage=0.0,
          highlights=(1.0, 1.0, 1.0), sharpen=True) -> Image.Image:
    """Apply the house look.

    ``warmth`` scales how far red is lifted and blue pulled down; 0 leaves the
    original white balance alone, 1 is the standard grade, >1 pushes golden.
    ``foliage`` additionally swings green vegetation towards golden hour, and
    ``highlights`` sets the per-channel white point (see :func:`_curve`).
    """
    im = im.convert('RGB')

    if foliage > 0:
        im = _foliage_shift(im, foliage)

    hr, hg, hb = highlights
    r, g, b = im.split()
    r = r.point(_curve(contrast, brightness, 1.0 - 0.055 * warmth, hr))
    g = g.point(_curve(contrast, brightness, 1.0, hg))
    b = b.point(_curve(contrast, brightness, 1.0 + 0.085 * warmth, hb))
    im = Image.merge('RGB', (r, g, b))

    if saturation != 1.0:
        im = ImageEnhance.Color(im).enhance(saturation)

    if tint > 0:
        # blend the shadows (and only the shadows) towards warm brown
        lum = im.convert('L')
        mask = lum.point(lambda v: round(((255 - v) / 255.0) ** 2 * 255 * tint))
        im = Image.composite(Image.new('RGB', im.size, SHADOW_TINT), im, mask)

    if vignette > 0:
        v = _vignette(im.size, vignette)
        im = ImageChops.multiply(im, Image.merge('RGB', (v, v, v)))

    if sharpen:
        im = im.filter(ImageFilter.UnsharpMask(radius=1.4, percent=58, threshold=3))

    return im


def frame(src: str, box: tuple[int, int, int, int], size: tuple[int, int]) -> Image.Image:
    """Crop a master to ``box`` then resize to the exact output ``size``."""
    im = Image.open(os.path.join(MASTERS, src)).convert('RGB')
    im = im.crop(box)
    return im.resize(size, Image.LANCZOS)


# --------------------------------------------------------------------------
# buttermilk: white studio cut-out -> warm dark backdrop
# --------------------------------------------------------------------------

def backdrop(size: tuple[int, int]) -> Image.Image:
    """Warm dark studio sweep with a soft pool of light behind the subject."""
    w, h = size
    sw, sh = 160, max(1, round(160 * h / w))
    small = Image.new('RGB', (sw, sh))
    px = small.load()
    cx, cy = sw / 2, sh * 0.52
    for y in range(sh):
        for x in range(sw):
            dx, dy = (x - cx) / (sw * 0.62), (y - cy) / (sh * 0.72)
            d = min(1.0, (dx * dx + dy * dy) ** 0.5)
            k = (1.0 - d) ** 1.7          # 1 in the middle, 0 at the edges
            px[x, y] = (
                round(14 + 39 * k),
                round(12 + 31 * k),
                round(8 + 16 * k),
            )
    return small.resize(size, Image.BICUBIC)


def cutout(src: str, size: tuple[int, int], *, fill=0.86, drop=0.55,
           threshold=214, defringe=0, box=None, anchor='center') -> Image.Image:
    """Knock the white background out of a studio pack-shot and re-light it.

    The background is found by flood-filling inwards from the border rather than
    by thresholding, so the white *milk* inside the pots survives. ``threshold``
    sits well below pure white so the anti-aliased rim of the subject counts as
    background too — otherwise every edge keeps a white halo once the shot is
    dropped onto a dark backdrop. Push it near 255 for a subject with
    transparent parts (a glass bottle neck), or the fill escapes through them
    and eats the subject; pair that with `defringe` to clean up the soft shadow
    edge a high threshold leaves behind.
    """
    im = Image.open(os.path.join(MASTERS, src)).convert('RGB')
    full_w = im.width
    im.thumbnail((2200, 2200), Image.LANCZOS)
    shrink = im.width / full_w

    # near-white -> 255, everything else -> 0
    flat = im.convert('L').point(lambda v: 255 if v >= threshold else 0)
    flat = flat.filter(ImageFilter.MedianFilter(3))
    seed = Image.new('L', (flat.width + 2, flat.height + 2), 255)
    seed.paste(flat, (1, 1))
    ImageDraw.floodfill(seed, (0, 0), 128, thresh=0)
    bg = seed.crop((1, 1, flat.width + 1, flat.height + 1))

    alpha = bg.point(lambda v: 0 if v == 128 else 255)
    alpha = alpha.filter(ImageFilter.MaxFilter(3))          # close pinholes
    alpha = alpha.filter(ImageFilter.MinFilter(3))          # choke back off the fringe

    if defringe:
        # A high threshold is needed so the flood fill cannot creep through a
        # transparent glass neck — but it also hands the subject the pale outer
        # half of the studio's contact shadow, which reads as a ragged white rim
        # once the shot sits on a dark backdrop. Eroding it away does not work:
        # the band is thicker than any choke that leaves the cork intact.
        #
        # Instead, only the eroded *core* stays unconditionally opaque. Between
        # the core and the silhouette edge the matte is driven by how far the
        # pixel is from the white background, so dark glass edges stay solid
        # while the pale shadow falls off to near-transparent and reads as a
        # soft shadow rather than a torn edge.
        core = alpha.filter(ImageFilter.MinFilter(defringe * 2 + 1))
        falloff = im.convert('L').point(
            lambda v: max(0, min(255, round((255 - v) * DEFRINGE_GAIN))))
        soft = ImageChops.darker(alpha, falloff)
        alpha = ImageChops.lighter(core, soft)

    alpha = alpha.filter(ImageFilter.GaussianBlur(1.1))     # feather the edge

    if box:
        # Frame the subject rather than accept its full height: a tall bottle
        # centred in a 4:3 card is mostly empty backdrop and its label is
        # unreadable at card size, so the crop pushes in on the pack.
        #
        # This has to happen *after* the knockout, never before. Cropping first
        # exposes the subject's interior along the cut edge, and the bottle's
        # own cream highlights are bright enough to pass the near-white test —
        # so the flood fill walks straight in through the cut and eats holes out
        # of the middle of the bottle.
        crop = tuple(round(v * shrink) for v in box)
        im, alpha = im.crop(crop), alpha.crop(crop)

    bbox = alpha.getbbox() or (0, 0, im.width, im.height)
    im, alpha = im.crop(bbox), alpha.crop(bbox)

    # scale the subject to `fill` of the frame, keeping its aspect
    ow, oh = size
    scale = min(ow * fill / im.width, oh * fill / im.height)
    tw, th = max(1, round(im.width * scale)), max(1, round(im.height * scale))
    im = im.resize((tw, th), Image.LANCZOS)
    alpha = alpha.resize((tw, th), Image.LANCZOS)

    canvas = backdrop(size)

    if anchor == 'bottom':
        # For a subject the crop deliberately cuts through, sit the cut edge on
        # the frame's bottom so it reads as continuing past the card rather than
        # as a sliced object floating in mid-air. No contact shadow either —
        # there is no base in frame for one to fall from.
        canvas.paste(im, ((ow - tw) // 2, oh - th), alpha)
        return canvas

    pos = ((ow - tw) // 2, round((oh - th) * 0.46))

    # contact shadow so the pots sit on the surface instead of floating
    shadow = Image.new('L', size, 0)
    sw_, sh_ = round(tw * 0.82), round(th * 0.13)
    ImageDraw.Draw(shadow).ellipse(
        [(ow - sw_) // 2, pos[1] + th - sh_ // 2, (ow + sw_) // 2, pos[1] + th + sh_ // 2],
        fill=round(255 * drop))
    shadow = shadow.filter(ImageFilter.GaussianBlur(round(th * 0.045) or 1))
    canvas = Image.composite(Image.new('RGB', size, (5, 4, 3)), canvas, shadow)

    canvas.paste(im, pos, alpha)
    return canvas


# --------------------------------------------------------------------------
# brand mark
# --------------------------------------------------------------------------

def brand_mark(size: int = 512) -> Image.Image:
    """Crop the supplied logo tight to its engraved medallion, on transparency.

    ``mainlogo.jpeg`` is the farm's own artwork and is never altered, but it
    carries ~12% dead black padding around the emblem. Rendered small with a
    ``border-radius: 50%`` and a gold border, that padding produced a second
    gold ring floating outside the medallion's own ring. Cropping to the real
    bounds and masking to a circle makes the emblem meet its frame exactly.
    """
    im = Image.open(os.path.join(ROOT, 'src', 'assets', 'brand', 'mainlogo.jpeg')).convert('RGB')

    bbox = im.convert('L').point(lambda v: 255 if v > 26 else 0).getbbox()
    left, top, right, bottom = bbox
    cx, cy = (left + right) / 2, (top + bottom) / 2
    half = max(right - left, bottom - top) / 2 * 1.03
    im = im.crop((round(cx - half), round(cy - half), round(cx + half), round(cy + half)))
    im = im.resize((size, size), Image.LANCZOS)

    # circular alpha, anti-aliased by drawing it 4x up and scaling down
    mask = Image.new('L', (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    mask = mask.resize((size, size), Image.LANCZOS)

    out = im.convert('RGBA')
    out.putalpha(mask)
    return out


# --------------------------------------------------------------------------
# the asset list
# --------------------------------------------------------------------------

# name -> (master, crop box, output size, grade overrides)
PRODUCTS = {
    # the farm's own bottle: a white-background pack shot, so it is knocked out
    # and re-lit onto the dark backdrop by cutout() in build() rather than cropped
    'prod-milk.jpg': None,
    # the farm's matka of thick set curd. The master hangs the pot against its
    # right edge behind a wide, empty band of leaves and wood down the left, so
    # the crop pans right — trimming that dead band away — and the pot lands
    # centred with even margins either side. It cannot pan any further: the
    # pot's own belly sits ~80px off the master's right edge. The grade stays
    # light on purpose; anything heavier greys the white curd, which is the one
    # thing the card has to sell.
    'prod-curd.jpg': ('curd-matka.png', (140, 40, 1448, 1021), PRODUCT_SIZE,
                      dict(contrast=1.06, brightness=-0.02, warmth=0.7, saturation=1.0,
                           tint=0.10, vignette=0.20, highlights=(1.0, 0.97, 0.92))),
    # the farm's own paneer on a board, knocked off white by cutout() in build()
    'prod-paneer.jpg': None,
    # real ghee at last: matka, pouring spoon and a grazing desi cow behind.
    # Framed to hold the whole pot AND its lid with margin — nothing clipped.
    # A light grade — the shot is already golden — plus a highlight rolloff so
    # the hazy sky does not out-glare the darker cards beside it. Deliberately
    # no foliage shift: unlike hero-farm, turning this pasture golden makes the
    # grass read as dry, which undercuts the grass-fed claim the photo is making.
    'prod-ghee.jpg': ('ghee-matka.jpg', (150, 0, 1602, 1089), PRODUCT_SIZE,
                      dict(contrast=1.10, brightness=-0.05, warmth=0.9, saturation=1.05,
                           tint=0.16, vignette=0.34, highlights=(0.98, 0.93, 0.82))),
    # studio cut-out, re-lit onto the dark backdrop by cutout() below
    'prod-buttermilk.jpg': None,
}

HEROES = {
    # flat midday snapshot: pushed hard towards golden hour so it can carry a hero
    'hero-farm.jpg': ('hero-farm.jpg', (0, 60, 1600, 960), HERO_SIZE,
                      dict(contrast=1.22, brightness=-0.05, warmth=2.4,
                           saturation=0.86, tint=0.26, vignette=0.42, foliage=1.0)),
    'hero-milk.jpg': ('hero-milk.jpg', (0, 600, 1600, 1500), HERO_SIZE,
                      dict(contrast=1.10, warmth=0.9, saturation=1.04,
                           tint=0.10, vignette=0.28)),
    'hero-craft.jpg': ('hero-craft.jpg', (0, 84, 1600, 984), HERO_SIZE,
                       dict(contrast=1.13, warmth=1.7, saturation=1.10,
                            tint=0.13, vignette=0.30)),
    # 16:9 version for the home page's "A2 Desi Ghee - the bilona way" spotlight,
    # which until now illustrated ghee with a photograph of butter
    'hero-ghee.jpg': ('ghee-matka.jpg', (32, 0, 1968, 1089), HERO_SIZE,
                      dict(contrast=1.10, brightness=-0.05, warmth=0.9, saturation=1.05,
                           tint=0.16, vignette=0.34, highlights=(0.98, 0.93, 0.82))),
    'hero-golden.jpg': ('farm-golden.jpg', (0, 40, 1600, 940), HERO_SIZE,
                        dict(contrast=1.14, warmth=1.2, saturation=1.06,
                             tint=0.12, vignette=0.30)),
}

SCENES = {
    'farm-sunrise.jpg': ('farm-sunrise.jpg', (0, 0, 1600, 900), HERO_SIZE,
                         dict(contrast=1.12, warmth=1.1, saturation=1.05,
                              tint=0.12, vignette=0.32)),
    'farm-golden.jpg': ('farm-golden.jpg', (60, 0, 1460, 933), STORY_SIZE,
                        dict(contrast=1.14, warmth=1.2, saturation=1.06, tint=0.12)),
    # the about page's "our cows out on the pasture". The old box started at
    # x=240, which sliced the cow's ear off and left her muzzle breathing on the
    # frame edge, and ended at y=943, which cut her front hoof. Panning left and
    # dropping the bottom edge moves her right, off the edge, and holds the whole
    # animal — ear to tail, hooves included. It cannot pan further left than 80
    # or right past 1480: the master has a second cow's head waiting at ~1520.
    'farm-pasture.jpg': ('hero-farm.jpg', (80, 80, 1480, 1013), STORY_SIZE,
                         dict(contrast=1.20, brightness=-0.04, warmth=2.2,
                              saturation=0.88, tint=0.24, vignette=0.30, foliage=1.0)),
}


def build() -> None:
    os.makedirs(OUT, exist_ok=True)
    written = []

    for group in (PRODUCTS, HEROES, SCENES):
        for name, spec in group.items():
            if spec is None:
                continue
            src, box, size, opts = spec
            im = grade(frame(src, box, size), **opts)
            path = os.path.join(OUT, name)
            im.save(path, 'JPEG', quality=82, optimize=True, progressive=True)
            written.append(path)

    mark = brand_mark()
    for name, px in (('logo-mark.png', 512), ('logo-icon.png', 96)):
        path = os.path.join(ROOT, 'src', 'assets', 'brand', name)
        art = mark if px == 512 else mark.resize((px, px), Image.LANCZOS)
        # gold-on-black needs nowhere near truecolour; a 128-entry palette is
        # visually identical at a sixth of the bytes
        art.quantize(colors=128, method=Image.FASTOCTREE).save(path, 'PNG', optimize=True)
        written.append(path)

    # ---- studio pack shots, knocked off white onto the dark backdrop ----
    cutouts = [
        ('prod-buttermilk.jpg',
         dict(src='prod-buttermilk.png', threshold=214, fill=0.92, defringe=0),
         dict(contrast=1.06, warmth=1.4, saturation=1.06, tint=0.08, vignette=0.10)),
        # A glass bottle needs a threshold right up against pure white, or the
        # flood fill escapes through the transparent neck and eats the subject;
        # defringe then dissolves the studio contact shadow that survives.
        # The grade stays near-neutral on purpose: the label's blue and green
        # brand type would go muddy under the warm grade the photographs get.
        # the WHOLE bottle, base included. An earlier version cropped to the
        # label and bled off the card bottom, which read better as a poster but
        # cut the product in half.
        ('prod-milk.jpg',
         dict(src='milk-bottle.jpg', threshold=252, fill=0.94, defringe=10),
         dict(contrast=1.04, warmth=0.4, saturation=0.98, tint=0.05, vignette=0.12)),
        # Real paneer on a board, supplied by the farm. threshold=250 is the
        # narrow window that works: lower and the flood fill treats the block's
        # own bright top as background and punches holes through it; higher and
        # the anti-aliased rim survives as a white halo. defringe must stay off
        # for the same reason — the luminance matte would eat the near-white
        # edges of the paneer itself.
        ('prod-paneer.jpg',
         dict(src='paneer-board.jpg', threshold=250, fill=0.94, defringe=0),
         dict(contrast=1.05, warmth=0.6, saturation=1.02, tint=0.06, vignette=0.12,
              highlights=(1.0, 0.98, 0.94))),
    ]
    for name, cut, tone in cutouts:
        art = grade(cutout(cut.pop('src'), PRODUCT_SIZE, **cut), sharpen=True, **tone)
        path = os.path.join(OUT, name)
        art.save(path, 'JPEG', quality=82, optimize=True, progressive=True)
        written.append(path)

    total = 0
    for p in sorted(written):
        kb = os.path.getsize(p) / 1024
        total += kb
        print(f'  {os.path.basename(p):22s} {Image.open(p).size[0]:>5}x'
              f'{Image.open(p).size[1]:<5} {kb:7.1f} KB')
    print(f'  {"":22s} {"":11s} {total:7.1f} KB total')


if __name__ == '__main__':
    build()
