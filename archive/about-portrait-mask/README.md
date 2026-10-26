# Archived: About portrait masks and tile

The About photo was briefly masked in organic shapes inspired by the logo (a lumpy blob, a drippy blob, then a circle
with ten sharp spikes). The site now uses a plain circle (`border-radius: 50%`). `spiky-circle-mask.svg` is the last
mask. To use it again, move it back to `assets/about/` and on `.about-grid__portrait` replace `border-radius`/`overflow`
with `mask: url("assets/about/portrait-mask.svg") center / 100% 100% no-repeat;` (and `-webkit-mask`). Add `?v=N` to the
URL and bump it whenever the file changes, so browsers don't serve a cached shape.

Also tried: a black rounded tile behind a round photo, and the photo masked with `organic-blob-mask.svg` on that tile. The site now uses a plain square photo with rounded corners.
