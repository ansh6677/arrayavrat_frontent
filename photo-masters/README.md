# Photo masters

Original, full-resolution photographs. **Nothing here is shipped to the browser** —
it sits outside `src/assets`, so the Angular build never copies it.

`tools/build-images.py` reads these files and writes the web-ready set into
`src/assets/photos/`:

* product shots → **1200×900 (4:3)**, so every product card is the same shape,
  and each one is framed to hold the **whole product inside the frame** — the
  card is the same 4:3 and renders with `object-fit: cover`, so the file is shown
  edge to edge exactly as it is built and anything cropped here stays cropped;
* heroes → **1600×900 (16:9)**;
* story images → **1400×933 (3:2)**;
* one shared warm colour grade across all of them, so a bright marble shot and a
  dark moody shot still read as one photographic set on the black-and-gold theme;
* the brand mark (`src/assets/brand/logo-mark.png`) cropped tight to the
  medallion and masked to a circle.

## Re-running it

```bash
pip install pillow        # the only dependency
python3 tools/build-images.py
```

Crops and per-image grade settings live in the `PRODUCTS` / `HEROES` / `SCENES`
tables near the bottom of that script. Each entry is
`(master file, crop box, output size, grade overrides)`.

## Swapping in your own photography

1. Drop the new file in here, keeping the same name as the master it replaces.
2. Adjust that entry's crop box in `tools/build-images.py` (the boxes are in
   master pixel coordinates, `left, top, right, bottom`).
3. Re-run the script.

Nothing in the app needs changing — `src/app/core/farm.ts` points at the
generated filenames, not the masters.

## Supplied by the farm

| Master | Used for | Notes |
| --- | --- | --- |
| `ghee-matka.jpg` | `prod-ghee.jpg`, `hero-ghee.jpg` | Ghee in a clay matka with a grazing desi cow behind. Arrived letterboxed inside a 2000×2000 canvas; the white bands are already trimmed off this master. Also drives the home page's "A2 Desi Ghee — the bilona way" spotlight, which used to illustrate ghee with a photo of butter. |
| `milk-bottle.jpg` | `prod-milk.jpg` | The farm's own labelled bottle, shot on white. `cutout()` knocks the white out and re-lights it on the dark backdrop. Needs `threshold=252` — anything lower and the flood fill escapes through the transparent glass neck and eats the bottle — plus `defringe=10` to dissolve the studio contact shadow that a threshold that high leaves attached. Graded almost neutrally on purpose: the label's blue and green brand type goes muddy under the warm grade the photographs get. |
| `curd-matka.png` | `prod-curd.jpg` | Thick set curd in a painted clay matka with a wooden spoon. The pot sits hard against the master's right edge behind a wide, empty band of leaves and wood down the left, so the crop pans right to trim that band and land the pot centred. It cannot pan further — the belly is only ~80px off the master's right edge — and the vertical trim comes off both edges so the rim keeps its headroom. Graded lightly: a heavier grade greys the white curd. |
| `paneer-board.jpg` | `prod-paneer.jpg` | Fresh paneer on a wooden board, shot on white. `threshold=250` is a narrow window: lower and the flood fill reads the block's own bright top as background and punches holes through it; higher and the anti-aliased rim survives as a white halo. `defringe` must stay **off** — the luminance matte would eat the near-white edges of the paneer itself. |

## Photographs that should still be replaced

These remain stand-ins and do not show Aryavart's own products or animals:

| File | Problem |
| --- | --- |
| `hero-farm.jpg` | A **Holstein Friesian** — the classic A1 breed — on a site that promises "100% A2 desi cows". Graded towards golden hour to sit with the rest of the set, but the breed is still wrong. |
| `hero-craft.jpg` | Churned butter. Still fine where it is used — hero slide 3, "slow-crafted, the traditional way" — but it is not Aryavart's butter. |
| `hero-paneer.jpg` | **Retired.** Aged cheese with a wine bottle and glass in frame; replaced by `paneer-board.jpg`. Kept only as an archive — nothing in the pipeline reads it any more. |
| `prod-curd.jpg` | **Retired.** Generic marble-and-teal bowl of yoghurt; replaced by `curd-matka.png`. Archive only — the pipeline no longer reads it. |
| `farm-golden.jpg` | An American barn and silo, not a Bihar farm. |
| `farm-sunrise.jpg` | Generic conifer landscape. |

Product images can also be overridden per-product from **Management → Products**,
which offers the shipped photos as one-click picks and previews exactly what the
site will show.
