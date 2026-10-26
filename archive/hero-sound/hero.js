// Lorenza Quinzi — Home hero.
//
// Black, white and grain. A hand-drawn-looking waveform runs across the hero; its shape is
// generated from the title and artist of the song playing now (nothing is analysed live, the
// name is the seed, so each song gets its own signature). Paused, it goes almost flat.
// Move the pointer to scrub the playhead and pluck the line.
//
// Data: now-playing.json via script.js (window.__lqNowPlaying + the "lq:nowplaying" event).
// Until the site is deployed it shows labelled demo data.
// The earlier test variants (skate, game, dots, wall, type, the colour-glow spotify) live in
// archive/hero-variants/.

(function () {
  "use strict";

  var hero = document.querySelector("[data-hero]");
  if (!hero) return;
  var under = hero.querySelector("[data-hero-under]");
  var over = hero.querySelector("[data-hero-over]");

  var mq = window.matchMedia ? window.matchMedia.bind(window) : null;
  var reduceMotion = !!(mq && mq("(prefers-reduced-motion: reduce)").matches);

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html) n.innerHTML = html;
    return n;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- seeded randomness: the song name becomes the waveform ---------- */
  function hashSeed(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= h >>> 16) >>> 0);
    };
  }
  function mulberry(seedFn) {
    var a = seedFn();
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // A song's signature: three sine layers, a spiky loudness envelope, and a jitter table.
  function makeSignature(key) {
    var rnd = mulberry(hashSeed(key));
    var sig = { sines: [], env: [], jit: [] };
    var bands = [[2, 5], [7, 14], [22, 44]], weights = [0.55, 0.32, 0.22];
    for (var i = 0; i < 3; i++) {
      sig.sines.push({
        f: bands[i][0] + rnd() * (bands[i][1] - bands[i][0]),
        p: rnd() * Math.PI * 2,
        s: (0.25 + rnd() * 0.7) * (rnd() < 0.5 ? -1 : 1),
        w: weights[i]
      });
    }
    for (var e = 0; e < 28; e++) sig.env.push(0.06 + Math.pow(rnd(), 2.4) * 0.94); // mostly quiet, a few loud spikes
    for (var j = 0; j < 1024; j++) sig.jit.push(rnd() * 2 - 1);
    return sig;
  }
  function envAt(sig, u) {
    var n = sig.env.length - 1, x = clamp(u, 0, 1) * n, i = Math.floor(x), f = x - i;
    if (i >= n) return sig.env[n];
    var m = (1 - Math.cos(f * Math.PI)) / 2; // cosine interpolation: smooth hills between control points
    return sig.env[i] * (1 - m) + sig.env[i + 1] * m;
  }

  /* ---------- layers: canvas (waveform), grain, now-playing caption ---------- */
  var cv = el("canvas", "sd__cv");
  cv.setAttribute("aria-hidden", "true");
  under.appendChild(cv);
  under.appendChild(el("div", "sd__vignette"));

  var caption = el("a", "sd__np",
    '<span class="sd__eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
    '<span class="sd__label"></span><span class="sd__title"></span><span class="sd__artist"></span><span class="sd__demo"></span>');
  caption.target = "_blank"; caption.rel = "noopener noreferrer";
  caption.hidden = true;
  over.appendChild(caption);

  var grain = el("div", "sd__grain");
  grain.setAttribute("aria-hidden", "true");
  over.appendChild(grain);
  (function makeGrainTile() { // one noise tile, jittered by CSS so it flickers like film
    var s = 200, t = document.createElement("canvas");
    t.width = t.height = s;
    var g = t.getContext("2d"), img = g.createImageData(s, s), d = img.data;
    for (var i = 0; i < d.length; i += 4) {
      var v = Math.random() * 255 | 0;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    try { grain.style.backgroundImage = "url(" + t.toDataURL("image/png") + ")"; } catch (e) { /* ignore */ }
  })();

  var labelEl = caption.querySelector(".sd__label");
  var titleEl = caption.querySelector(".sd__title");
  var artistEl = caption.querySelector(".sd__artist");
  var demoEl = caption.querySelector(".sd__demo");

  /* ---------- state ---------- */
  var DEMO = { title: "placeholder track", artist: "your favourite band" };
  var sig = makeSignature(DEMO.title + "|" + DEMO.artist);
  var playing = true;          // paused = near silence
  var level = 1, levelTo = 1;  // eased amplitude
  var W = 0, H = 0, dpr = 1;
  var timeS = 0;               // song-time driving the slow drift
  var phx = 0.12;              // playhead, 0..1 across the width
  var ptrX = -1, ptrOn = false, pluck = 0;
  var visible = true;

  function resize() {
    var r = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + "px"; cv.style.height = H + "px";
  }

  // y offset (in px) of the line at position u (0..1) for a given "take" (jitter offset)
  function sample(u, t, take, amp) {
    var s = 0, i;
    for (i = 0; i < 3; i++) {
      var sn = sig.sines[i];
      s += sn.w * Math.sin(u * Math.PI * 2 * sn.f + sn.p + t * sn.s);
    }
    var step = Math.floor(t * 9); // jitter ticks ~9 times a second: stop-motion, tape-like
    var k = (Math.floor(u * 520) + take * 131 + step * 37) & 1023;
    s += 0.22 * sig.jit[k];
    return s * envAt(sig, u) * amp;
  }

  function stroke(ctx, t, take, amp, cy, alphaBright, alphaDim, lw) {
    var n = Math.ceil(W / 3), i, x, y, u;
    var path = new Path2D(), started = false;
    for (i = 0; i <= n; i++) {
      u = i / n; x = u * W;
      var boost = 1;
      if (ptrOn) { var dx = (x - ptrX) / 140; boost += pluck * 1.3 * Math.exp(-dx * dx); }
      y = cy + sample(u, t, take, amp * boost);
      if (!started) { path.moveTo(x, y); started = true; } else path.lineTo(x, y);
    }
    ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(255,255,255," + alphaDim + ")";
    ctx.stroke(path);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, phx * W, H); ctx.clip(); // the part already "played" is brighter
    ctx.strokeStyle = "rgba(255,255,255," + alphaBright + ")";
    ctx.stroke(path);
    ctx.restore();
  }

  function draw() {
    var ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var narrow = W < 700;
    var cy = H * (narrow ? 0.46 : 0.4), amp = H * (narrow ? 0.16 : 0.2) * level;
    var t = timeS;
    stroke(ctx, t + 0.9, 2, amp * 0.97, cy + 3, 0.16, 0.06, 1);
    stroke(ctx, t + 0.4, 1, amp * 1.02, cy - 2, 0.26, 0.09, 1);
    stroke(ctx, t, 0, amp, cy, 1, 0.5, 1.5);
    // playhead: a hairline with a small notch
    var px = phx * W;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(Math.round(px), cy - H * 0.2, 1, H * 0.4);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(Math.round(px) - 2, cy - H * 0.2 - 1, 5, 1);
  }

  var last = 0, raf = null;
  function tick(now) {
    var dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    level += (levelTo - level) * Math.min(1, dt * 3);
    if (playing) timeS += dt * 0.55;
    if (ptrOn) { phx += (ptrX / W - phx) * Math.min(1, dt * 10); }
    else { phx += dt / 120; if (phx > 1) phx = 0; } // a full pass every two minutes
    pluck += ((ptrOn ? 1 : 0) - pluck) * Math.min(1, dt * 6);
    draw();
    raf = (visible && !reduceMotion) ? requestAnimationFrame(tick) : null;
    if (!raf) last = 0;
  }
  function wake() { if (!raf && visible) raf = requestAnimationFrame(tick); }

  /* ---------- now-playing data ---------- */
  function render(data) {
    var demo = !data || !data.title;
    var d = demo ? DEMO : data;
    caption.hidden = false;
    titleEl.textContent = d.title;
    artistEl.textContent = d.artist;
    playing = demo ? true : !!d.isPlaying;
    labelEl.textContent = demo ? "demo · now playing" : (playing ? "now playing" : "last played");
    demoEl.textContent = demo ? "demo data. goes live once the site is deployed" : "";
    caption.classList.toggle("is-paused", !playing);
    if (demo || !d.songUrl) caption.removeAttribute("href"); else caption.href = d.songUrl;
    sig = makeSignature(d.title + "|" + d.artist);
    levelTo = playing ? 1 : 0.07;
    if (reduceMotion) { level = levelTo; draw(); } else wake();
  }

  hero.addEventListener("pointermove", function (e) {
    var r = hero.getBoundingClientRect();
    ptrX = clamp(e.clientX - r.left, 0, r.width); ptrOn = true;
    if (!reduceMotion) wake();
  });
  hero.addEventListener("pointerleave", function () { ptrOn = false; });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) wake();
    }).observe(hero);
  }
  window.addEventListener("resize", function () { resize(); draw(); });

  resize();
  draw();
  if (!reduceMotion) wake();

  var pending = window.__lqNowPlaying === undefined;
  if (!pending) render(window.__lqNowPlaying);
  else setTimeout(function () { if (window.__lqNowPlaying === undefined) render(null); }, 2500);
  document.addEventListener("lq:nowplaying", function (e) { render(e.detail); });
})();
