# Product photo library

Every photo in this folder is free for commercial use with **no attribution
required** — sourced from Wikimedia Commons and Openverse under CC0 or
Public Domain, or created for this project.

| File | Used for |
|---|---|
| `prod-milk.jpg` | Pure A2 Cow Milk (branded bottle) |
| `prod-curd.jpg`, `CURD3.jpg` | Curd / Dahi |
| `prod-paneer.jpg` | Paneer |
| `prod-ghee.jpg`, `hero-ghee.jpg` | Desi Ghee |
| `prod-buttermilk.jpg` | Buttermilk — clay pots |
| `prod-buttermilk-bottle.jpg` | Buttermilk — glass bottle |
| `prod-lassi.jpg` | Lassi |
| `prod-butter.jpg` | White butter / Makhan |
| `prod-khoya.jpg` | Khoya / Mawa / Malai |
| `prod-mushroom.jpg` | Mushrooms |
| `prod-spices.jpg` | Whole spices / Masala |
| `prod-turmeric.jpg` | Turmeric / Haldi |
| `prod-honey.jpg` | Honey |
| `prod-eggs.jpg` | Farm eggs |
| `prod-sweets.jpg` | Indian sweets / Mithai |
| `prod-vegetables.jpg` | Farm vegetables |
| `hero-*.jpg`, `farm-*.jpg` | Home page slider and section backgrounds |

## Adding your own photo

1. Save it here as `prod-<name>.jpg`, sized **1200x900** (4:3) so cards keep
   the same shape.
2. Add one line to `STOCK_PHOTOS` in `src/app/core/farm.ts` and it appears in
   the management panel's photo picker.

Products with no photo chosen fall back automatically based on their name —
that mapping is `CATEGORY_PHOTOS` in the same file.
