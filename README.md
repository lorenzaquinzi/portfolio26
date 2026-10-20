# Lorenza Quinzi — Portfolio

A static site. No build step, no framework — just `index.html` (home: hero +
Selected Work grid), `experience.html`, `about.html`, `styles.css`,
`script.js`, and a set of case-study pages. Open `index.html` in a browser to
preview it locally, or deploy the whole folder as-is (see **Deploying** below).
The one extra is the optional Spotify "Now Playing" line, which is refreshed by
a GitHub Actions workflow — see **Now Playing (Spotify)** below.

## What's real vs. placeholder

**Real / final:**
- The hero phrase, the About page and the Experience page (roles, dates, places, highlights and the
  10+ years / 5 companies stats) are written from your CV (`Lorenza Quinzi-CV.pdf`, Oct 2026), plus
  your contact links (LinkedIn, Instagram, email). The About portrait is one of the photo-wall
  photos (`assets/hero-photos/p22.jpg`) — swap it for a larger one when you have it.
- Structure, layout, typography, light/dark toggle, and accessibility basics
  (skip link, focus states, semantic headings, alt text, reduced-motion support).

**Placeholder — needs your input:**
- The About portrait is a small photo from the photo wall — swap it for a larger one. For any
  other image, save it in `assets/` and use `<img src="assets/your-file.jpg" alt="…">`
  (inside `.cs-cover` or `.about-grid__portrait`, `styles.css` already makes it fill the box).
  Always write a real `alt`.
- The home page's "Selected Work" is a plain list of 8 projects (no thumbnails), all adapted from your Figma
  presentation: **Address Scanner**, **Dynamic Island**, **Driver Profile**, **Redesign: Edit
  stop view** and **Redesign: Menu** (Circuit, now Spoke), **Bill 2.0** (Lemon Energy), **íon** and
  **NBA Live game experience** (Work & Co). Company years on the cards come from the Experience page.
- The home page hero is a **test with six interchangeable variants** (all placeholders):
  **Skate** (a free-roaming skateboard that rides the headline's letters as solid terrain when the
  cursor goes over them), **Game** (a Chrome-dino-style endless runner: skate down a street and jump
  the obstacles with space / ↑ / click / tap; press Start first), **Spotify** (the hero glows in your
  current song's cover colours, with the cover spinning like a record), **Dots** (the original dot
  field), **Type** ("Quinzi" set in many odd typefaces as a typographic series: a sheet of tiles, black on white; hover inverts a tile, click changes its typeface, and one tile changes on its own every few seconds; fonts come from Google Fonts only for this variant) and **Photo wall** (the 24 photos from the deck's second slide in `assets/hero-photos/`, as
  slowly drifting black-and-white columns that turn to colour on hover; this is the default). Switch
  with the pill in the hero or `?hero=skate|game|spotify|dots|wall|type` in the URL. Code: `hero.js` +
  `hero.css`. When you pick one variant, delete the others from `variants` in `hero.js` (and their
  blocks in `hero.css`), then remove the switcher + "Placeholder — hero test" tag from `index.html`.
  The Spotify variant shows clearly labelled demo data until the site is on GitHub Pages with the
  Spotify secrets set (see **Now Playing (Spotify)**).
- There is no social-share image yet (no `og:image` tag). When you have one,
  export it at 1200×630, save it in `assets/`, and add
  `<meta property="og:image" content="https://YOUR-ADDRESS/assets/og-image.jpg" />`
  to the `<head>` of each page — it must be a full `https://` address.

Look for the lilac **"Placeholder"** tag on images and `[Placeholder]`
in copy to find everything that still needs your real content.

## Now Playing (Spotify)

The footer shows a small "Now playing" / "Last played" line with your
current Spotify track, and the hero's **Spotify** variant uses the same data.
There's no server: a GitHub Actions workflow
(`.github/workflows/pages.yml`) runs about every 5 minutes, asks Spotify what
you're listening to using credentials stored as **GitHub secrets** (they never
appear in the site's code), writes `now-playing.json`, and redeploys the site
to GitHub Pages. The page just reads that file (`script.js`, once a minute).

What to expect:
- It's a snapshot, not live: GitHub's scheduler often runs late, so figure
  5–15 minutes of lag. A "now playing" snapshot older than 15 minutes is shown
  as "Last played" instead.
- GitHub **pauses scheduled workflows after 60 days with no activity in the
  repo** (it emails you). Re-enable it from the Actions tab, or push any commit.
- Every refresh is a full redeploy of the site — free, but you'll see lots of
  runs in the Actions tab. That's normal.
- Everything is free (Spotify API, GitHub Actions and Pages on a public repo).

**One-time setup, start to finish:**

1. **Create a Spotify app.** Go to the
   [Spotify Developer Dashboard](https://developer.spotify.com/dashboard),
   log in with your Spotify account, and click **Create app**. Any name/
   description works. For **Redirect URI**, add
   `http://127.0.0.1:8888/callback` (only used once, for step 2 below —
   nothing listens on this port permanently). Save, then open the app and
   copy the **Client ID** and **Client Secret**.

2. **Authorize it once to get a refresh token.** This is the only manual
   step — it proves to Spotify that *you* are allowing this app to read
   *your* currently-playing track. The easy way is the helper script
   (Node 18+, no installs). In Terminal, from this folder:
   ```
   export SPOTIFY_CLIENT_ID="paste-your-client-id"
   ```
   ```
   read -s "SPOTIFY_CLIENT_SECRET?Client secret: " && export SPOTIFY_CLIENT_SECRET
   ```
   ```
   node scripts/spotify-token.mjs
   ```
   It opens Spotify's consent page; click **Agree**. The terminal then prints
   your **refresh token** (it doesn't expire under normal use). The client
   secret is only read from the environment — never printed or saved.

   <details><summary>Doing it by hand instead</summary>

   - Visit this URL, replacing `YOUR_CLIENT_ID`:
     ```
     https://accounts.spotify.com/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://127.0.0.1:8888/callback&scope=user-read-currently-playing%20user-read-recently-played
     ```
   - Click **Agree**. You'll land on a `127.0.0.1` page that fails to load —
     that's expected. Copy the `code=...` value from the address bar.
   - Exchange it for a refresh token:
     ```
     curl -X POST https://accounts.spotify.com/api/token \
       -u YOUR_CLIENT_ID:YOUR_CLIENT_SECRET \
       -d grant_type=authorization_code \
       -d code=THE_CODE_YOU_COPIED \
       -d redirect_uri=http://127.0.0.1:8888/callback
     ```
   - The JSON response includes a `refresh_token`.
   </details>

3. **Add the three values as GitHub secrets.** In your repo: Settings →
   Secrets and variables → Actions → **New repository secret**, three times:
   `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`.
   Never commit them to the repo.

4. **Turn on GitHub Pages from Actions.** Settings → Pages → Build and
   deployment → Source: **GitHub Actions**. Then push to `main` (or Actions →
   "Deploy site" → **Run workflow**). The first run publishes the site; the
   workflow keeps `now-playing.json` fresh after that.

If the secrets are missing or Spotify can't be reached, the workflow still
deploys and just writes an empty `now-playing.json`: the footer line stays
hidden and the Spotify hero shows its labelled demo data. Locally
(`python3 -m http.server`) there's no `now-playing.json`, so you'll see the same.

## How the case studies are wired

**Address Scanner** (`case-study-address-scanner.html`) is the first real one
and the template for the rest. Layout: a big rounded stage with the finished
flow playing, a title + summary row (tags, company, role, platforms), then
sections with the text on the left (sticky) and the media on the right — Problem,
Overview, Adding stops, Finding stops, Wrong address?, Highlights, Package photo,
Impact. Styles are the `cs2-*` block at the end of `styles.css`.

Its media lives in `assets/address-scanner/` (~10 MB):
- The four phone recordings are exactly the ones in the Figma presentation (matched
  by file hash: `add stop.mov`, `find stop2.mov`, `wrong-address2.mov`, `photo of package.mov`
  from `~/Downloads/Videos`), compressed to MP4 (H.264, no audio, 640 px wide) with a
  `.jpg` poster each. `script.js` plays them muted and looped only while on
  screen, adds a play/pause button, and leaves them on the poster for
  reduced-motion visitors. To swap one, re-encode the new recording, e.g.
  `ffmpeg -i in.mov -an -vf scale=640:-2,fps=30 -c:v libx264 -crf 26 -pix_fmt yuv420p -movflags +faststart out.mp4`,
  and take a poster with `ffmpeg -ss 3 -i out.mp4 -frames:v 1 out.jpg`.
- Screenshots (Problem) are JPGs exported from the Figma slides; the Impact chart is an inline SVG (data traced from the deck's analytics chart).
- `hero.jpg` is the same three frames on dark gray, used only as the page's social-share `og:image` (composed once with Pillow). The page itself has no hero image; it opens on the title.

The other seven projects use the same page structure, with these extra layouts (all `cs2-*`
classes in `styles.css`): phone video in a stage, stacked Dynamic Island strips, dark slide
screenshots (`cs2-shot`), captioned phone pairs, a video playing inside a phone frame (íon) and a
video with sound and controls (the Driver Profile pitch). Their pages, in order (each page's
"Next project" link follows this order): `case-study-address-scanner.html` →
`case-study-dynamic-island.html` → `case-study-driver-profile.html` →
`case-study-circuit-edit-stop.html` → `case-study-circuit-menu.html` →
`case-study-lemon-bill.html` → `case-study-ion.html` → `case-study-nba-live-game.html`.

Where the media came from (all under `assets/<project>/`): videos were matched to the deck by file
hash and compressed with ffmpeg; the mockups are renders of the deck's slides.
**Not on the site yet:** the "dance-cam" video of the NBA project's Dance & Kiss cam — it isn't
on this computer, so that section shows the two widget screens only.

## The `/scripts` folder

`scripts/make_placeholders.py` and `scripts/make_case_studies.py` are the
generator scripts used to build the placeholder images and duplicate the
case-study template. You don't need them once you've replaced the content —
safe to delete the whole `/scripts` folder.

## Design notes

- **Type:** a single family, [Inter](https://fonts.google.com/specimen/Inter),
  for everything — nav, headings, body, labels. One weight family
  everywhere is a deliberate, restrained choice (styled after
  [everton.work](https://everton.work)), not a placeholder waiting for a
  second typeface.
- **Color:** the UI itself is monochrome — near-black text on off-white in
  light mode, off-white text on near-black in dark mode (toggle in the nav,
  respects system preference on first load, remembers your choice after).
  No accent hue; emphasis comes from type size, weight, and spacing instead.
  Every text/background pairing checks out at AA contrast or better
  (verified — the lightest pairing, muted gray-on-white, still clears
  4.8:1). Project imagery is the one exception — the media on the case-study
  pages stays full color, so the work itself provides the visual
  contrast against the monochrome chrome around it.
- **Home page layout:** styled after [everton.work](https://everton.work) —
  an always-visible, plain-text nav (name + section links + a light/dark
  dot, no pill, no border, no blur) above plain grids of rounded 16:9
  project cards (16px corners, 8px gutter, a small centered title + year
  under each). "Selected Work" runs two across;
  hovering a card zooms its image very slightly.
- **Signature detail:** a small dot that follows your cursor and blooms
  when it's over a link (desktop only; turns off automatically for anyone
  with reduced-motion set, matching the rest of the site's motion).
- **Accessibility:** semantic landmarks, a skip-to-content link, visible focus
  states, `prefers-reduced-motion` support throughout (cursor, preview,
  reveal animations, and hover transitions all respect it), alt text on every
  image (including placeholders, so you don't forget to write real ones), and
  body type sized for readability rather than just aesthetics.

## Deploying

**GitHub Pages (the setup this repo is built for):**

1. Create a GitHub repo and push this folder to its `main` branch (commands
   below). `.gitignore` already keeps `.claude/`, `qa_final/` and other
   local-only files out.
2. Settings → Pages → Source: **GitHub Actions** (see step 4 above).
3. Add the Spotify secrets if you want Now Playing (steps 1–3 above).
4. For your own domain (`lorenzaquinzi.com`): Settings → Pages → Custom
   domain, then add the DNS records GitHub shows you. All the site's links are
   relative, so it works both at `username.github.io/repo/` and on a custom
   domain.

First push, from this folder (replace `YOUR-USER` and `YOUR-REPO` with the empty repo you created on github.com):

```
git init -b main
git add .
git commit -m "Portfolio"
git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
git push -u origin main
```

The workflow publishes only the site files (`*.html`, `styles.css`,
`hero.css`, `script.js`, `hero.js`, `assets/`) — not this README, the
`scripts/` folder or anything under `.github/`. If you add a new top-level
file the site needs (say a `favicon.ico`), add it to the `cp` line in
`.github/workflows/pages.yml`.

Other static hosts (Netlify, Vercel, your current host) also work for the
plain site: drag-and-drop the files. You'd lose the refreshed Now Playing
data, since `now-playing.json` is produced by the GitHub workflow.

## Local preview

Any static server works, e.g. from this folder:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
