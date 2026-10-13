// One-time helper: gets the Spotify refresh token for the "Now Playing" feature.
//
// Run it on YOUR computer (never in CI). It needs Node 18+ and no packages.
//
//   export SPOTIFY_CLIENT_ID="..."
//   read -s "SPOTIFY_CLIENT_SECRET?Client secret: " && export SPOTIFY_CLIENT_SECRET   # zsh
//   node scripts/spotify-token.mjs
//
// What it does: opens Spotify's consent page in your browser, catches the
// redirect on http://127.0.0.1:8888/callback, swaps the code for a refresh
// token and prints it. Copy that token into the GitHub secret
// SPOTIFY_REFRESH_TOKEN. The client secret is only read from the environment
// and is never printed or written anywhere.

import http from "node:http";
import crypto from "node:crypto";
import { execFile } from "node:child_process";

const PORT = 8888;
const REDIRECT = `http://127.0.0.1:${PORT}/callback`;
const SCOPE = "user-read-currently-playing user-read-recently-played";
const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = process.env;

if (!id || !secret) {
  console.error("Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET first (see the top of this file).");
  process.exit(1);
}

const state = crypto.randomBytes(16).toString("hex");
const authUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({ client_id: id, response_type: "code", redirect_uri: REDIRECT, scope: SCOPE, state }).toString();

function page(res, status, title, body) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!doctype html><meta charset="utf-8"><title>${title}</title>` +
    `<body style="font:16px system-ui;max-width:32rem;margin:15vh auto;padding:0 1rem"><h1>${title}</h1><p>${body}</p>`);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (url.pathname !== "/callback") { res.writeHead(404); res.end(); return; }

  if (url.searchParams.get("state") !== state) {
    page(res, 400, "Something's off", "The request didn't come from this script (state mismatch). Run it again.");
    return;
  }
  if (url.searchParams.get("error")) {
    page(res, 400, "Not authorized", `Spotify said: ${url.searchParams.get("error")}. You can close this tab.`);
    console.error("Spotify returned:", url.searchParams.get("error"));
    server.close();
    process.exitCode = 1;
    return;
  }

  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: url.searchParams.get("code") || "",
        redirect_uri: REDIRECT,
      }),
    });
    const data = await tokenRes.json();
    if (!tokenRes.ok || !data.refresh_token) throw new Error(data.error_description || data.error || `HTTP ${tokenRes.status}`);

    page(res, 200, "All set", "Your refresh token is in the terminal. You can close this tab.");
    console.log("\nYour refresh token (keep it secret — paste it into the GitHub secret SPOTIFY_REFRESH_TOKEN):\n");
    console.log(data.refresh_token + "\n");
  } catch (err) {
    page(res, 500, "Couldn't get the token", String(err.message).replace(/</g, "&lt;"));
    console.error("Token exchange failed:", err.message);
    process.exitCode = 1;
  }
  server.close();
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("Opening Spotify's consent page. If nothing opens, paste this into your browser:\n\n" + authUrl + "\n");
  console.log("Waiting for you to click Agree…");
  const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer" : "xdg-open";
  execFile(opener, [authUrl], () => {});
});
