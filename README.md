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
  your contact links (LinkedIn, Instagram, email). The About portrait is `assets/about/portrait.jpg`.
- Structure, layout, typography, light/dark toggle, and accessibility basics
  (skip link, focus states, semantic headings, alt text, reduced-motion support).

**Placeholder — needs your input:**
- The About portrait is `assets/about/portrait.jpg`. For any other image, save it in `assets/` and use `<img src="assets/your-file.jpg" alt="…">`
  (inside `.cs-cover` or `.about-grid__portrait`, `styles.css` already makes it fill the box).
  Always write a real `alt`.
- The home page's "Selected Work" is a plain list of 7 entries (no thumbnails, no status column), all adapted from your Figma
  presentation: **Address Scanner Feature** and **Dynamic Island Feature** (Spoke, formerly Circuit) have a page each (the Driver Profile page is archived in `archive/driver-profile/`); **App Main Menu**, **Edit Stop View** (Spoke), **Digital Electricity Bill** (Lemon Energy), **Íon Investments** (Work & Co) and **Nuconta Onboarding** (Nubank) are "snippet" case studies, one page each, for projects without a full case study. They use the same layout as the other case pages (title, tags, lede, details, then sections) and are written from the Figma deck (`Archive`, `Cases w/ CRM` and `Lemon` pages) and the CV. The Driver Profile page is archived in `archive/driver-profile/`.
- The home page has **no hero for now**: it opens on two big lines, "Hey, I'm Lorenza." / "UX Designer at Google." ("Google" links to google.com; it's the `<h1>`, `.intro` in `styles.css`), then
  the "Selected Work" list.
- Earlier work that was removed is archived (not published) in `archive/`: `hero-variants/` (skate, game, colour-glow
  Spotify, dots, photo wall, typography series, plus the 24 wall photos), `hero-sound/` (black, white and grain, with
  a waveform from the song playing now), `hero-search/` (the inline search hero) and `search/` (the on-device AI site
  search that lived behind a header icon). Each folder has a README on bringing it back.

## Interaction system (what is tappable, and how you can tell)

Every tappable thing on the site is one of six patterns, so people learn the rules once. The same rules are
written at the bottom of `styles.css` ("INTERACTION SYSTEM"). If you add something new, make it fit one of these.

| # | Pattern | How it looks | Used for |
| - | ------- | ------------ | -------- |
| 1 | **Text link** | One style for every link inside a string: a **dotted underline** (same weight scale, offset and colour as the text). Hover: the underline turns solid and the text goes muted. No bold, colour or icon, whether it stays on the site or opens a new tab. Exception: the link inside the homepage headline is plain until hovered, then underlined, like the project titles below it. | "Google" in the headline, company names on Experience, the project index on Other projects, the About contact row |
| 2 | **Link group** | No underline (the position says "link"). Hover: muted. In the nav, an underline marks the **current page**. | Header nav, logo, footer links, now-playing |
| 3 | **Block link** | The whole row is the target and ends in an arrow (→ stays here, ↗ leaves). Hover/focus: the arrow nudges right and the title is underlined. | Selected-work rows, "Next project" |
| 4 | **Button / action** | A real `<button>` or an action link. Icon buttons have a 44px hit area on touch. **Email** copies the address and says "Copied" (it falls back to a normal `mailto:` if copying fails). | Theme toggle, play/pause on videos, Email |
| 5 | **Chip** | **Outlined** pill = tappable. **Filled pill with no outline** = a label, never tappable. | Filled: project tags, "Before/After" and "Redesign" panel names. (No outlined chips on the site right now.) |
| 6 | **Disclosure** | A row with a chevron that turns. | Experience |

Always the same: `cursor: pointer` on everything tappable and nothing else; the cursor dot grows over the same set
(including things added later); one focus ring (2px blue) everywhere; every control reaches
44px on touch screens without changing how it looks.

Where it lives: the rules are in `styles.css` (end of the file), the copy-email action and the cursor dot are in
`script.js`. The check we used: for every page, list every `a`, `button` and `summary` with its underline style and
cursor, and every outlined pill that is *not* tappable. The result must be: every text link has the same dotted
underline, link groups have none, nothing outlined that isn't a control.

## Now Playing (Spotify)

The footer shows a small "Now playing" / "Last played" line with your
current Spotify track.
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
hidden. Locally
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

The other pages use the same structure, with these extra layouts (all `cs2-*` classes in
`styles.css`): phone video in a stage, stacked Dynamic Island strips, dark slide screenshots
(`cs2-shot`), captioned phone pairs, a video playing inside a phone frame (íon) and a video with
sound and controls (the Driver Profile pitch, now archived). Their pages, in order (each page's "Next project"
link follows this order): `case-study-address-scanner.html` → `case-study-dynamic-island.html` →
`case-study-menu.html` → `case-study-edit-stop.html` → `case-study-bill.html` → `case-study-ion.html` → `case-study-nubank-onboarding.html` → back to Address Scanner. The old combined "Other projects" page is archived in `archive/other-projects/`.

Where the media came from (all under `assets/<project>/`; the íon monthly-report and check-up videos are the prototype recordings linked from the Figma slides (Google Drive), compressed with ffmpeg; the Nubank onboarding video (`assets/nubank-onboarding/onboarding.mp4`) was recorded by walking through the public Figma prototype in a browser and cross-fading the captured screens, played in the same generic device frame; the Bill 2.0 "After" phone is a scroll recording rendered from an export of the full-length bill screen in Figma, played inside the same generic device frame as the íon clip, `assets/device/device-frame.webp`, with the same play/pause control): videos were matched to the deck by file
hash and compressed with ffmpeg; the mockups are renders of the deck's slides.
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
`script.js`, `assets/`) — not this README, the
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
