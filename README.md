# DGAP Brownie Delight

A static, dependency-free brownie bakery website: vanilla HTML, CSS and ES modules. No build step, no backend, no database. It deploys straight to GitHub Pages from the `docs/` folder.

## Run locally

```bash
python -m http.server 4173 --directory docs
```

Then open http://localhost:4173. (ES modules need a web server; opening `index.html` as a file will not work.)

## Deploy (GitHub Pages)

1. Push to GitHub.
2. Repo **Settings → Pages → Build and deployment**: Source *Deploy from a branch*, branch `main`, folder `/docs`.
3. The site is served at `https://asal1989.github.io/dgap-brownie-delight/`. If the URL differs, update `SITE.url` in `docs/js/config.js` and the canonical/Open Graph URLs in `docs/index.html`, `docs/about.html`, `docs/robots.txt` and `docs/sitemap.xml`.

## What to edit

| File | Purpose |
|---|---|
| `docs/js/config.js` | Business details: **WhatsApp number**, phone, email, address, hours, Instagram/Facebook, announcement bar, hero text, box sizes and prices, FAQ answers, reviews, gallery, policies |
| `docs/js/products.js` | Products, categories, sizes, prices, labels, ingredients, allergens, availability |
| `docs/css/styles.css` | Colour palette and design tokens (top of file): forest green `#183A2C`, champagne gold `#D5B477`, ivory `#F8F2E8`, espresso `#30201B` |
| `docs/images/` | Photos (replace the temporary stock photos) |

### Before launch checklist

- **WhatsApp**: set `CONTACT.whatsappNumber` (digits with country code, e.g. `919876543210`). Until then, order buttons show a dialog with a copyable order message instead of opening WhatsApp. No number is hardcoded.
- **Prices**: every `price` is `null`, so the site shows "Ask for price" and says "to be confirmed" in order messages. Set a number (rupees) on a size to turn pricing on. Totals are shown only when every line in the order has a price.
- **Sizes**: the sizes ("Single piece", "Box of 4", "Box of 6") and box sizes (4/6/9) are placeholders. Edit them to match what you actually sell.
- **Dietary labels, ingredients, allergens**: left empty until verified. Add them in `products.js`; a safe "ask us" note shows meanwhile. Only the walnut brownie carries a "Contains nuts" label.
- **Eggless, delivery areas, storage**: FAQ answers do not claim anything the business has not confirmed. Replace them in `config.js`.
- **Reviews**: `REVIEWS` is empty, so the section shows an honest "coming soon" state. Add only real customer reviews.
- **Instagram**: set `SOCIAL.instagram` to link the gallery to the real profile.
- **Photos**: the images in `docs/images/` are temporary Unsplash stock, with a different lead photo per brownie. They are not photos of DGAP's own brownies, and the gift-box photo shows chocolates. Replace them with your own product photography, one per brownie.
- **Story and About page**: replace the placeholder copy in `config.js` (`STORY`) and `docs/about.html`.

## If JavaScript fails

`docs/index.html` ships a static brand header and brownie menu inside `#app`. The full site replaces it when the scripts run, so visitors with JavaScript off, an unsupported browser, or a script error still see the brand and the menu. If you add or rename a product in `products.js`, update the `.static-list` in `index.html` too.

## Structure

```
docs/
  index.html, about.html, robots.txt, sitemap.xml
  css/styles.css
  images/              # full-size + "-sm" thumbnails
  js/
    config.js          # business config
    products.js        # catalogue
    cart.js            # localStorage cart
    whatsapp.js        # message builder + totals
    utils.js           # DOM helper, icons, toast
    main.js            # page assembly, SEO structured data
    components/        # Header, Hero/Sections (Why, Gift, Story, Testimonials, Gallery,
                       # FAQ, Footer), ProductCard, ProductGrid, CategoryFilter,
                       # ProductModal, CustomBoxBuilder, CartDrawer,
                       # WhatsAppOrderButton, QuantityStepper, dialog
```

## Notes

- Orders are *requests*: every WhatsApp message states that DGAP will confirm availability, final charges, delivery and payment.
- JSON-LD (`Bakery`) includes only name, URL, description, city and any contact/social values filled in `config.js`.
- Accessibility: skip link, visible focus, focus-trapped dialogs, ARIA live updates, `prefers-reduced-motion` support.

## Photo credits (temporary stock, Unsplash License)

Photo sources and links: see `docs/images/CREDITS.md`. `hero-fudgie.jpg` is from the previous site.
