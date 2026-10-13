// Writes now-playing.json for the site.
//
// Runs in CI (see .github/workflows/pages.yml) with three secrets in the
// environment: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN.
// The site reads the resulting file; the secrets never reach the browser.
//
// Usage: node fetch-now-playing.mjs <output-path>
//
// This script never fails the deploy: if anything goes wrong it writes
// { "isPlaying": false } and the site simply hides the now-playing line.

import { writeFileSync } from "node:fs";

const out = process.argv[2] || "now-playing.json";
const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret, SPOTIFY_REFRESH_TOKEN: refresh } = process.env;

function save(data) {
  writeFileSync(out, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }) + "\n");
}

function shape(track, isPlaying) {
  return {
    isPlaying,
    title: track.name,
    artist: (track.artists || []).map((a) => a.name).join(", "),
    songUrl: track.external_urls && track.external_urls.spotify,
    albumArt: track.album && track.album.images && track.album.images[0] && track.album.images[0].url,
  };
}

async function main() {
  if (!id || !secret || !refresh) {
    console.log("Spotify secrets are not set — writing an empty now-playing.json");
    save({ isPlaying: false });
    return;
  }

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }),
  });
  if (!tokenRes.ok) throw new Error(`token refresh failed (HTTP ${tokenRes.status})`);
  const { access_token: token } = await tokenRes.json();
  const headers = { Authorization: `Bearer ${token}` };

  // 204 = nothing playing right now (not an error)
  const now = await fetch("https://api.spotify.com/v1/me/player/currently-playing", { headers });
  if (now.status === 200) {
    const d = await now.json();
    if (d && d.item && d.is_playing && d.currently_playing_type === "track") {
      save(shape(d.item, true));
      return;
    }
  }

  // otherwise show the last thing you played
  const recent = await fetch("https://api.spotify.com/v1/me/player/recently-played?limit=1", { headers });
  if (recent.ok) {
    const d = await recent.json();
    const track = d.items && d.items[0] && d.items[0].track;
    if (track) {
      save(shape(track, false));
      return;
    }
  }
  save({ isPlaying: false });
}

main().catch((err) => {
  console.error("now-playing:", err.message);
  save({ isPlaying: false });
});
