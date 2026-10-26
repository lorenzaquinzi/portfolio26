# Archived hero variants

The home page originally had six interchangeable hero variants for testing. The site now uses a
single hero (black and white, grain, a waveform from the song playing now), so these were archived
here. Nothing in this folder is published (the GitHub Pages workflow only copies the site files).

| File | What it is |
| --- | --- |
| `hero.js` | All variants: `skate`, `game`, `spotify` (the old colour-glow version), `dots`, `wall`, `type`, plus the switcher and `?hero=` handling |
| `hero.css` | Their styles |
| `index-hero-markup.html` | The old hero section markup, with the variant switcher |
| `hero-photos/` | The 24 photos used by the `wall` variant (`p01.jpg`–`p24.jpg`) |

## Bringing one back

1. Copy `hero.js` and `hero.css` over the ones in the project root (or paste a single variant into
   the current `hero.js`).
2. Move `hero-photos/` back to `assets/hero-photos/` (the `wall` variant loads from there).
3. Replace the hero `<section>` in `index.html` with `index-hero-markup.html`.
