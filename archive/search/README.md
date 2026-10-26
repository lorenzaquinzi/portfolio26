# Archived: site search

A header search icon opened an overlay with on-device AI search over the site's own pages (Transformers.js,
all-MiniLM-L6-v2, running in a Web Worker; no server or API key). Removed from the site; nothing here is published.

To bring it back:
1. Copy `search.js`, `search-worker.js` and `search.css` to the project root and add them to the `cp` line in
   `.github/workflows/pages.yml`.
2. On every page, add `<link rel="stylesheet" href="search.css" />` after `styles.css`, `<script src="search.js"></script>`
   after `script.js`, and this button in the header, before the theme toggle:
   `<button class="index-nav__search" data-search-open type="button" aria-haspopup="dialog" aria-label="Search my work">` + a magnifier SVG + `</button>`.
3. In `styles.css`, the cursor dot needs `z-index` above the overlay (it is 260 now, which is fine), and the
   interaction-system rules for `.sr__item`, `.sr__chip` and `.index-nav__search` (see this folder's `search.css`).

How it works: on first open it fetches the site's pages, cuts them into chunks, ranks by keywords right away, and
once the model has loaded (about 23 MB, cached) ranks by meaning. Chunk vectors are cached in localStorage.
`SUGGESTIONS` at the top of `search.js` sets the suggestion chips; `indexPage()` sets what gets indexed.
