# Lorenza Quinzi — Portfolio

A static site. No build step, no framework — just `index.html` (home: hero +
Selected Work grid), `experience.html`, `about.html`, `styles.css`,
`script.js`, and a set of case-study pages. Open `index.html` in a browser to
preview it locally, or deploy the whole folder as-is (see **Deploying** below).
The one extra is the optional Spotify "Now Playing" line, which is refreshed by
a GitHub Actions workflow — see **Now Playing (Spotify)** below.

## What's real vs. placeholder

**Real / final:**
- All copy about your role, experience list (Circuit, Lemon Energia, Work & Co,
  Nubank, Fjord), the "8+ years" / industries stats, and your contact links
  (LinkedIn, Instagram, email) — pulled from your current site.
- Structure, layout, typography, light/dark toggle, and accessibility basics
  (skip link, focus states, semantic headings, alt text, reduced-motion support).

**Placeholder — needs your input:**
- **All images are gray boxes** for now (project cards, case-study covers and
  galleries, the About portrait, the hero). `assets/` is empty. To add a real
  image, save it in `assets/` and put an `<img src="assets/your-file.jpg" alt="…">`
  inside the gray box in the HTML (inside `.work-grid__thumb`, `.cs-cover` or
  `.about-grid__portrait`) — `styles.css` already makes it fill the box. For a
  case-study gallery box, replace the `<span class="cs-gallery__box">` with
  `<img class="cs-gallery__img" …>`. Always write a real `alt`.
- The home page's "Selected Work" is a 2-column grid of 6 cards: the 4 case
  studies (Circuit, Lemon Energia, Work & Co, Nubank — real dates,
  gray boxes for now), Fjord (a real link), and one open slot
  ("Project 06").
- The four case-study detail pages have placeholder titles, outcome copy,
  and body text, marked with `[Placeholder]`. Replace with your real
  problem / approach / outcome and metrics.
- The home page hero is a **test with five interchangeable variants** (all
  placeholders): **Photo** (your photo or GIF in black and white with film
  grain; the cursor is a soft light that brings the colour back), **Zine** (the
  same image as a photocopied halftone; the cursor is a loupe that resolves it
  into fine detail), **Skate** (a free-roaming skateboard that rides the
  headline's letters as solid terrain when the cursor goes over them), **Spotify** (the hero glows in
  your current song's cover colours, with the cover spinning like a record) and
  **Dots** (the original dot field). Switch with the pill in the hero or
  `?hero=photo|zine|skate|spotify|dots` in the URL. Code: `hero.js` +
  `hero.css`. **Photo and Zine read `assets/hero-media.gif`** (or
  `hero-media.jpg`) — until you add one they show a plain gray box. Keep it
  under ~3 MB, roughly 16:9 and at least ~1600 px wide (the hero is wide). When you pick one
  variant, delete the others from `variants` in `hero.js` (and their blocks in
  `hero.css`), then remove the switcher + "Placeholder — hero test" tag from
  `index.html`. The Spotify variant shows clearly labelled demo data until the
  site is on GitHub Pages with the Spotify secrets set (see **Now Playing
  (Spotify)**).
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

`index.html`'s grid links to four separate pages:
`case-study-circuit.html`, `case-study-lemon-energia.html`,
`case-study-work-co.html`, `case-study-nubank.html`.

They all share the same structure (hero → cover image → meta grid → problem →
approach → supporting images → outcome → next-project link) and still use the
previous floating-pill nav — they haven't been redesigned to match the new
home page yet (that's the next thing to iterate on). If you add a fifth case
study, duplicate one of these files, update the content, and add a matching
`<li class="work-grid__item">` card to the grid in `index.html`.

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
  4.8:1). Project imagery is the one exception — thumbnails and case-study
  covers stay full color, so the work itself provides the visual
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
