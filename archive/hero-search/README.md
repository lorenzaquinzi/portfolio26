# Archived: search hero

The home page hero was briefly a large search bar with suggestion chips (the same search that now lives behind
the header icon). The hero was removed, so only the markup is kept here. The current `search.js` builds an
overlay instead of mounting into `[data-search]`; to bring the inline version back, mount the panel markup from
`search.js` into a `<div class="sr" data-search>` and restyle `.sr` as an inline block (pill field, results list
below) instead of the overlay panel.
