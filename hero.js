// Lorenza Quinzi — Home hero, interaction TEST variants.
//
// Interchangeable heroes share one frame (index.html → <section data-hero>):
//   photo    — your photo / GIF, black-and-white with film grain; the cursor is a
//              soft light that reveals the colour underneath
//   zine     — the same image as a photocopied halftone; the cursor is a loupe
//              that resolves it into fine detail
//   skate    — a free-roaming skateboard that rides the headline when you go over it
//   game     — a Chrome-dino-style endless runner: skate down a street, jump the obstacles
//   spotify  — glow + spinning record driven by the song you're listening to
//   dots     — the original dot-field placeholder
//
// photo + zine read their image from assets/hero-media.gif (or hero-media.jpg).
// Until you add one they show a plain gray box.
//
// The switcher in the hero (and ?hero=name in the URL) is only for comparing.
// Once one wins: delete the others from `variants`, delete the switcher markup in
// index.html, and remove the matching blocks from hero.css.

(function () {
  "use strict";

  var hero = document.querySelector("[data-hero]");
  if (!hero) return;

  var under = hero.querySelector("[data-hero-under]");
  var over = hero.querySelector("[data-hero-over]");
  var title = hero.querySelector(".hero__title");
  var hintEl = hero.querySelector("[data-hero-hint]");
  var switcher = hero.querySelector("[data-hero-switcher]");

  var mq = window.matchMedia ? window.matchMedia.bind(window) : null;
  var reduceMotion = !!(mq && mq("(prefers-reduced-motion: reduce)").matches);
  var finePointer = !!(mq && mq("(hover: hover) and (pointer: fine)").matches);

  /* ---------- helpers ---------- */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html) n.innerHTML = html;
    return n;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function local(e) {
    var r = hero.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function setHint(t) { if (hintEl) hintEl.textContent = t || ""; }

  // rAF loop that sleeps when fn() returns false and wakes on demand.
  function loop(fn) {
    var id = null, last = 0, alive = true;
    function tick(t) {
      var dt = Math.min(32, t - (last || t)) / 16.667;
      last = t;
      var keep = fn(dt);
      id = keep && alive ? requestAnimationFrame(tick) : null;
      if (!id) last = 0;
    }
    return {
      wake: function () { if (!id && alive) { last = 0; id = requestAnimationFrame(tick); } },
      stop: function () { alive = false; if (id) cancelAnimationFrame(id); id = null; }
    };
  }

  function listen(bag, target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    bag.push(function () { target.removeEventListener(type, fn, opts); });
  }

  // Live --fg / --bg as "r,g,b" so canvases follow the light/dark toggle.
  var fgRGB = "10,10,10", bgRGB = "249,249,247", isDark = false;
  var themeListeners = [];
  function hexRGB(v) {
    var m = /^#([0-9a-f]{6})$/i.exec(v.trim());
    if (!m) return null;
    var n = parseInt(m[1], 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  function refreshFg() {
    var cs = getComputedStyle(document.documentElement);
    var f = hexRGB(cs.getPropertyValue("--fg")), b = hexRGB(cs.getPropertyValue("--bg"));
    if (f) fgRGB = f.join(",");
    if (b) { bgRGB = b.join(","); isDark = (0.2126 * b[0] + 0.7152 * b[1] + 0.0722 * b[2]) < 128; }
    themeListeners.forEach(function (fn) { fn(); });
  }
  refreshFg();
  new MutationObserver(refreshFg).observe(document.documentElement, {
    attributes: true, attributeFilter: ["data-theme"]
  });

  var variants = {};

  /* =====================================================================
     DOTS — the original placeholder: a dot grid that swells away from the pointer
     ===================================================================== */
  variants.dots = function () {
    var off = [];
    var canvas = el("canvas", "hero__canvas");
    under.appendChild(canvas);
    var g = canvas.getContext("2d");
    var SPACING = 30, RADIUS = 150;
    var w = 0, h = 0, dpr = 1, dots = [], visible = true;
    var ptr = { x: -9999, y: -9999, active: false };

    function size() {
      var r = hero.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      for (var y = 0; y <= Math.ceil(h / SPACING); y++) {
        for (var x = 0; x <= Math.ceil(w / SPACING); x++) {
          dots.push({ ox: x * SPACING, oy: y * SPACING, x: x * SPACING, y: y * SPACING, s: 1 });
        }
      }
      draw(false);
    }

    function draw(animate) {
      g.clearRect(0, 0, w, h);
      var moving = false;
      for (var i = 0; i < dots.length; i++) {
        var d = dots[i], tx = d.ox, ty = d.oy, ts = 1;
        if (animate && ptr.active) {
          var dx = d.ox - ptr.x, dy = d.oy - ptr.y, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < RADIUS) {
            var f = 1 - dist / RADIUS; f *= f;
            tx = d.ox + (dx / (dist || 1)) * f * 38;
            ty = d.oy + (dy / (dist || 1)) * f * 38;
            ts = 1 + f * 3.2;
          }
        }
        if (animate) {
          d.x += (tx - d.x) * 0.16; d.y += (ty - d.y) * 0.16; d.s += (ts - d.s) * 0.16;
          if (Math.abs(tx - d.x) > 0.05 || Math.abs(ts - d.s) > 0.01) moving = true;
        }
        g.fillStyle = "rgba(" + fgRGB + "," + (0.16 + (d.s - 1) * 0.22) + ")";
        g.beginPath(); g.arc(d.x, d.y, 1.5 * d.s, 0, 6.2832); g.fill();
      }
      return moving;
    }

    var lp = loop(function () { var m = draw(true); return (ptr.active || m) && visible; });
    function wake() { if (!reduceMotion) lp.wake(); }
    function theme() { draw(false); }
    themeListeners.push(theme);

    listen(off, hero, "pointermove", function (e) {
      var p = local(e); ptr.x = p.x; ptr.y = p.y; ptr.active = true; wake();
    });
    listen(off, hero, "pointerleave", function () { ptr.active = false; wake(); });
    listen(off, window, "resize", size);
    var io = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) wake(); });
      io.observe(hero);
    }
    size();
    setHint("Move your cursor");

    return function () {
      off.forEach(function (f) { f(); });
      lp.stop(); if (io) io.disconnect();
      themeListeners.splice(themeListeners.indexOf(theme), 1);
    };
  };

  /* =====================================================================
     Shared by photo + zine: the image, and the "light" that follows the cursor
     ===================================================================== */
  var MEDIA = ["assets/hero-media.gif", "assets/hero-media.jpg"];
  function loadMedia(done) {
    var i = 0;
    (function next() {
      if (i >= MEDIA.length) { done(null); return; }
      var img = new Image();
      img.onload = function () { done(img); };
      img.onerror = next;
      img.src = MEDIA[i++];
    })();
  }

  // A soft circle that drifts on its own until you move the cursor (so it also
  // reads on touch screens), then follows the cursor with a little lag.
  function makeLens(radius) {
    var L = { x: 0, y: 0, tx: 0, ty: 0, r: 0, tr: 0, idle: true, has: false, t0: performance.now() };
    L.tick = function (dt) {
      var R = hero.getBoundingClientRect(), now = performance.now();
      if (L.idle) {
        if (reduceMotion) { L.tx = R.width * 0.62; L.ty = R.height * 0.4; }
        else {
          var t = (now - L.t0) / 1000;
          L.tx = R.width * (0.5 + 0.32 * Math.sin(t * 0.45));
          L.ty = R.height * (0.45 + 0.25 * Math.sin(t * 0.31 + 1));
        }
        L.tr = radius;
      } else { L.tr = L.has ? radius : 0; }
      var k = Math.min(1, (reduceMotion ? 1 : 0.12) * dt);
      L.x += (L.tx - L.x) * k; L.y += (L.ty - L.y) * k;
      L.r += (L.tr - L.r) * Math.min(1, (reduceMotion ? 1 : 0.1) * dt);
      return (L.idle && !reduceMotion) || Math.abs(L.tx - L.x) > 0.3 || Math.abs(L.ty - L.y) > 0.3 || Math.abs(L.tr - L.r) > 0.3;
    };
    L.bind = function (bag, wake) {
      function at(e) {
        if (e.target.closest && e.target.closest(".hero-switcher")) return;
        var p = local(e);
        L.tx = p.x; L.ty = p.y; L.idle = false; L.has = true; wake();
      }
      listen(bag, hero, "pointermove", at);
      listen(bag, hero, "pointerdown", at);
      listen(bag, hero, "pointerleave", function (e) {
        if (e.pointerType === "mouse") { L.has = false; L.idle = true; wake(); }
      });
    };
    return L;
  }

  /* =====================================================================
     PHOTO — your photo / GIF in black and white with film grain. The cursor is a
     soft light: the colour comes back inside it. (One image, a grey blend layer
     with a hole in it — so a GIF stays perfectly in sync.)
     ===================================================================== */
  variants.photo = function () {
    var off = [], dead = false, visible = true;
    var wrap = el("div", "ph");
    var img = el("img", "ph__img");
    img.alt = ""; img.decoding = "async"; img.draggable = false;
    wrap.appendChild(img);
    wrap.appendChild(el("div", "ph__gray"));
    wrap.appendChild(el("div", "ph__shade"));
    wrap.appendChild(el("div", "ph__grain"));
    under.appendChild(wrap);

    loadMedia(function (m) {
      if (dead) return;
      if (!m) { wrap.classList.add("is-empty"); setHint("Add your photo or GIF at assets/hero-media.gif"); return; }
      if (reduceMotion && /\.gif/i.test(m.src)) { // no motion: freeze on the first frame
        try {
          var cv = document.createElement("canvas");
          cv.width = m.naturalWidth; cv.height = m.naturalHeight;
          cv.getContext("2d").drawImage(m, 0, 0);
          img.src = cv.toDataURL("image/jpeg", 0.92);
        } catch (e) { img.src = m.src; }
      } else { img.src = m.src; }
      wrap.classList.add("is-ready");
    });

    var lens = makeLens(190);
    var lp = loop(function (dt) {
      var keep = lens.tick(dt);
      wrap.style.setProperty("--mx", lens.x.toFixed(1) + "px");
      wrap.style.setProperty("--my", lens.y.toFixed(1) + "px");
      wrap.style.setProperty("--r", lens.r.toFixed(1) + "px");
      return keep && visible;
    });
    function wake() { lp.wake(); }
    lens.bind(off, wake);
    var io = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) wake(); });
      io.observe(hero);
    }
    wake();
    setHint("Move to bring the colour back");

    return function () {
      dead = true;
      off.forEach(function (f) { f(); });
      lp.stop(); if (io) io.disconnect();
    };
  };

  /* =====================================================================
     ZINE — the same image as a photocopied halftone (staggered dots on the page
     colour). The cursor is a loupe: inside it the dots get four times finer and
     the picture resolves. GIFs keep moving (re-sampled ~8×/s).
     ===================================================================== */
  variants.zine = function () {
    var off = [], dead = false, visible = true, ready = false, poll = null;
    var wrap = el("div", "zine");
    var holder = el("img", "zine__src");           // the live image we sample from
    holder.alt = ""; holder.decoding = "async";
    var coarse = el("canvas"), loupe = el("canvas");
    wrap.appendChild(holder); wrap.appendChild(coarse); wrap.appendChild(loupe);
    under.appendChild(wrap);
    var cg = coarse.getContext("2d"), lg = loupe.getContext("2d");
    var sample = document.createElement("canvas"), sg = sample.getContext("2d", { willReadFrequently: true });

    var C = 11, F = 4, SC = 4;                      // dot pitch: page / loupe; sampling scale
    var w = 0, h = 0, dpr = 1, lum = null, lw = 0, lh = 0, isGif = false;
    var lens = makeLens(150);

    function lumAt(x, y) {
      var xi = clamp(Math.round(x / SC), 0, lw - 1), yi = clamp(Math.round(y / SC), 0, lh - 1);
      return lum[yi * lw + xi];
    }
    function ink(l) { return isDark ? l : 1 - l; }  // light dots on dark paper, dark dots on light paper

    function drawCoarse() {
      cg.setTransform(dpr, 0, 0, dpr, 0, 0);
      cg.clearRect(0, 0, w, h);
      if (!lum) return;
      cg.fillStyle = "rgba(" + fgRGB + ",0.3)"; // quiet at rest; the loupe is the loud part
      cg.beginPath();
      var rowH = C * 0.866;
      for (var j = 0, y = 0; y < h + C; j++, y = j * rowH) {
        for (var x = (j & 1) * C * 0.5; x < w + C; x += C) {
          var rad = C * 0.62 * Math.sqrt(ink(lumAt(x, y)));
          if (rad < 0.7) continue;
          cg.moveTo(x + rad, y); cg.arc(x, y, rad, 0, 6.2832);
        }
      }
      cg.fill();
    }

    function drawLoupe() {
      lg.setTransform(dpr, 0, 0, dpr, 0, 0);
      lg.clearRect(0, 0, w, h);
      if (!lum || lens.r < 2) return;
      var mx = lens.x, my = lens.y, r = lens.r;
      lg.fillStyle = "rgb(" + bgRGB + ")";          // blank the coarse dots under the loupe
      lg.beginPath(); lg.arc(mx, my, r, 0, 6.2832); lg.fill();
      lg.fillStyle = "rgba(" + fgRGB + ",0.92)";
      lg.beginPath();
      var rowH = F * 0.866;
      for (var j = Math.floor(Math.max(0, my - r) / rowH); j * rowH <= Math.min(h, my + r); j++) {
        var y = j * rowH, dy = y - my, half = Math.sqrt(Math.max(0, r * r - dy * dy)), shift = (j & 1) * F * 0.5;
        for (var x = Math.ceil((Math.max(0, mx - half) - shift) / F) * F + shift; x <= Math.min(w, mx + half); x += F) {
          var rad = F * 0.62 * Math.sqrt(ink(lumAt(x, y)));
          if (rad < 0.4) continue;
          lg.moveTo(x + rad, y); lg.arc(x, y, rad, 0, 6.2832);
        }
      }
      lg.fill();
      lg.strokeStyle = "rgba(" + fgRGB + ",0.4)"; lg.lineWidth = 1;
      lg.beginPath(); lg.arc(mx, my, r, 0, 6.2832); lg.stroke();
    }

    function resample() {
      var iw = holder.naturalWidth, ih = holder.naturalHeight;
      if (!ready || !w || !iw) return;
      lw = Math.ceil(w / SC); lh = Math.ceil(h / SC);
      sample.width = lw; sample.height = lh;
      var s = Math.max(w / iw, h / ih), dw = iw * s, dh = ih * s;     // object-fit: cover
      sg.drawImage(holder, (w - dw) / 2 / SC, (h - dh) * 0.55 / SC, dw / SC, dh / SC);
      var d;
      try { d = sg.getImageData(0, 0, lw, lh).data; } catch (e) { return; }
      if (!lum || lum.length !== lw * lh) lum = new Float32Array(lw * lh);
      for (var i = 0; i < lum.length; i++) {
        var l = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
        lum[i] = clamp((l - 0.5) * 1.7 + 0.5, 0, 1);                   // photocopier contrast
      }
      drawCoarse();
    }

    function size() {
      var r = hero.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      [coarse, loupe].forEach(function (c) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); });
      resample();
    }

    var lp = loop(function (dt) {
      var keep = lens.tick(dt);
      drawLoupe();
      return keep && visible;
    });
    function wake() { lp.wake(); }
    function theme() { drawCoarse(); wake(); }
    themeListeners.push(theme);

    lens.bind(off, wake);
    listen(off, window, "resize", function () { size(); wake(); });
    var io = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) wake(); });
      io.observe(hero);
    }

    loadMedia(function (m) {
      if (dead) return;
      if (!m) { wrap.classList.add("is-empty"); setHint("Add your photo or GIF at assets/hero-media.gif"); return; }
      isGif = /\.gif/i.test(m.src);
      holder.onload = function () {
        ready = true; size(); wake();
        if (isGif && !reduceMotion) poll = setInterval(function () { if (visible) { resample(); wake(); } }, 130);
      };
      holder.src = m.src;
    });
    size();
    setHint("Move to look closer");

    return function () {
      dead = true;
      off.forEach(function (f) { f(); });
      lp.stop(); if (poll) clearInterval(poll); if (io) io.disconnect();
      themeListeners.splice(themeListeners.indexOf(theme), 1);
    };
  };

  /* =====================================================================
     SKATE — your cursor is a skateboard. It moves freely, following the cursor
     anywhere in the hero. When the cursor goes over the headline (or the
     subtitle) the words become solid terrain: the board drops onto the
     letters, rolls along their tops, steps up small bumps, drops off edges and
     can't pass through them. Move the cursor off the words and it flies free
     again. Click / tap = kickflip (and an ollie when you're on the words); a
     quick flick of the mouse upward also pops it.
     ===================================================================== */
  variants.skate = function () {
    var off = [];
    if (reduceMotion) {
      setHint("Reduced motion is on — no skateboard.");
      return function () {};
    }

    var board = el("div", "sk-board",
      '<span class="sk-board__inner"><svg viewBox="0 0 96 32" aria-hidden="true"><path d="M3 5C3 11 9 13 16 13H80C87 13 93 11 93 5C93 14 88 17 80 17H16C8 17 3 14 3 5Z" fill="#ff5a36" stroke="#111" stroke-width="1.5"/><rect x="20" y="17" width="8" height="4" fill="#111"/><rect x="68" y="17" width="8" height="4" fill="#111"/><circle cx="24" cy="25" r="5.5" fill="#f6d33c" stroke="#111" stroke-width="1.5"/><circle cx="72" cy="25" r="5.5" fill="#f6d33c" stroke="#111" stroke-width="1.5"/></svg></span>');
    over.appendChild(board);

    // --- physics constants (px, per 60fps frame) ---
    var HW = 28, HH = 20;      // hitbox: half-width, height above the wheels
    var WHEEL = 24;            // wheel offset from the centre, for the tilt
    var STEP = 26;             // bumps up to this tall are rolled over
    var GRAV = 0.65, MAXV = 12, OLLIE = 13.5;

    // --- terrain: every letter of the headline (+ the subtitle) is a block ---
    var obs = [], zones = [], heroW = 0, heroH = 0;
    function layout() {
      var hr = hero.getBoundingClientRect();
      heroW = hr.width; heroH = hr.height;
      obs = []; zones = [];
      title.normalize();
      var node = title.firstChild;
      if (!node || node.nodeType !== 3) return;
      var text = node.nodeValue, cs = getComputedStyle(title);
      var g = document.createElement("canvas").getContext("2d");
      g.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
      var range = document.createRange();

      var last = text.length - 1;
      while (last > 0 && text[last] === " ") last--;
      range.setStart(node, last); range.setEnd(node, last + 1);
      var lastTop = range.getBoundingClientRect().top;
      var marker = el("span", "sk-base");
      title.appendChild(marker);
      var baseOff = marker.getBoundingClientRect().top - lastTop; // baseline, from a letter's box top
      title.removeChild(marker);

      var cur = null; // the word being measured
      for (var i = 0; i < text.length; i++) {
        if (text[i] === " ") { cur = null; continue; }
        range.setStart(node, i); range.setEnd(node, i + 1);
        var r = range.getBoundingClientRect();
        var m = g.measureText(text[i]), base = r.top - hr.top + baseOff;
        var o = {
          x0: r.left - hr.left, x1: r.right - hr.left,
          t: base - m.actualBoundingBoxAscent, b: base + m.actualBoundingBoxDescent
        };
        obs.push(o);
        if (!cur) { cur = { x0: o.x0, x1: o.x1, t: o.t, b: o.b }; zones.push(cur); }
        else { cur.x1 = o.x1; cur.t = Math.min(cur.t, o.t); cur.b = Math.max(cur.b, o.b); }
      }
      var sub = hero.querySelector(".hero__sub");
      if (sub) { // the <p> spans the whole row, so measure the text itself
        var tr = document.createRange();
        tr.selectNodeContents(sub);
        var sr = tr.getBoundingClientRect();
        var so = { x0: sr.left - hr.left, x1: sr.right - hr.left, t: sr.top - hr.top, b: sr.bottom - hr.top };
        obs.push(so); zones.push({ x0: so.x0, x1: so.x1, t: so.t, b: so.b });
      }
    }

    // is (x, y) over a word? `m` widens the zone (hysteresis when leaving it)
    function overWord(x, y, m) {
      for (var i = 0; i < zones.length; i++) {
        var z = zones[i];
        if (x >= z.x0 - m && x <= z.x1 + m && y >= z.t - m && y <= z.b + m) return true;
      }
      return false;
    }
    function hits(x, y, o) { return x + HW > o.x0 && x - HW < o.x1 && y > o.t && y - HH < o.b; }
    // top of the surface under a wheel, if there is one right at the board's feet
    function support(wx, y) {
      var best = null;
      for (var i = 0; i < obs.length; i++) {
        var o = obs[i];
        if (wx >= o.x0 && wx <= o.x1 && o.t >= y - STEP - 1 && o.t <= y + 8 && (best === null || o.t < best)) best = o.t;
      }
      return best === null ? y : best;
    }

    // --- state ---
    // `by` is always the height of the wheels' bottom. Free mode keeps the board
    // centred on the cursor (wheels 15px below it); solid mode is full physics.
    var on = false, solid = false;
    var tx = 0, ty = 0, bx = 0, by = 0, vx = 0, vy = 0, grounded = false, coyote = 0;
    var tilt = 0, visY = 0, pvy = 0, ly = 0, lt = 0, cooldown = 0;

    function ollie() {
      if (solid && coyote > 0) { vy = -OLLIE; coyote = 0; grounded = false; }
    }
    function flip() {
      board.classList.remove("is-flip");
      void board.offsetWidth; // restart the animation
      board.classList.add("is-flip");
    }
    function liftOut() { // don't start inside a letter: pop up onto it
      for (var n = 0; n < 60; n++) {
        var inside = false;
        for (var i = 0; i < obs.length; i++) if (hits(bx, by, obs[i])) { by = obs[i].t - 1; inside = true; }
        if (!inside) break;
      }
    }
    function spawn(x, y) {
      bx = tx = x; ty = y; by = y + 15; vx = vy = 0; grounded = false; coyote = 0;
      solid = overWord(x, y, 0);
      if (solid) liftOut();
      visY = by; tilt = 0;
      on = true;
      board.classList.add("is-on");
    }

    function physics(dt) {
      var i, o;
      var want = clamp((tx - bx) * 0.14, -MAXV, MAXV);
      vx += (want - vx) * (grounded ? 0.2 : 0.05) * dt;
      vy = Math.min(vy + GRAV * dt, 30);

      // horizontal: roll over small bumps, stop at walls
      bx += vx * dt;
      for (i = 0; i < obs.length; i++) {
        o = obs[i];
        if (!hits(bx, by, o)) continue;
        if (o.t >= by - STEP && vy >= -1) { by = o.t; vy = 0; grounded = true; }
        else if (vx > 0) { bx = o.x0 - HW; vx *= -0.15; }
        else { bx = o.x1 + HW; vx *= -0.15; }
      }
      bx = clamp(bx, HW, Math.max(HW, heroW - HW));

      // vertical: land on tops, bonk on undersides
      var prev = by;
      by += vy * dt;
      grounded = false;
      for (i = 0; i < obs.length; i++) {
        o = obs[i];
        if (!hits(bx, by, o)) continue;
        if (vy >= 0 && prev <= o.t + 1) { by = o.t; vy = vy > 8 ? -vy * 0.2 : 0; if (vy === 0) grounded = true; }
        else if (vy < 0 && prev - HH >= o.b - 1) { by = o.b + HH; vy = 0; }
        else { bx = bx < (o.x0 + o.x1) / 2 ? o.x0 - HW : o.x1 + HW; vx *= -0.15; }
      }
      var floor = heroH - 2;
      if (by >= floor) { by = floor; vy = vy > 8 ? -vy * 0.2 : 0; if (vy === 0) grounded = true; }
      coyote = grounded ? 7 : Math.max(0, coyote - dt);
      cooldown = Math.max(0, cooldown - dt);
    }

    var lp = loop(function (dt) {
      if (!on) return false;

      // Words are solid only while the cursor is over them (with some slack when leaving).
      if (!solid && overWord(tx, ty, 0)) {
        solid = true; grounded = false;
        vx = clamp(vx, -MAXV * 1.5, MAXV * 1.5); vy = clamp(vy, -15, 15);
        liftOut(); visY = by;
      } else if (solid && !overWord(tx, ty, 48)) {
        solid = false;
      }

      var target, rest;
      if (solid) {
        var left = Math.min(dt, 3);
        while (left > 0) { var d = Math.min(left, 0.5); physics(d); left -= d; }
        if (grounded) {
          var hl = support(bx - WHEEL, by), hr2 = support(bx + WHEEL, by);
          target = clamp(Math.atan2(hr2 - hl, WHEEL * 2) * 180 / Math.PI, -40, 40);
        } else {
          target = clamp(-vy * 1.8 + vx * 0.5, -28, 28);
        }
        visY = grounded ? visY + (by - visY) * Math.min(1, 0.5 * dt) : by; // soften step-ups
        rest = grounded && Math.abs(vx) < 0.05 && Math.abs(tx - bx) < 1 && Math.abs(target - tilt) < 0.3;
      } else {
        var px = bx, py = by;
        bx += (tx - bx) * Math.min(1, 0.35 * dt);
        by += (ty + 15 - by) * Math.min(1, 0.35 * dt);
        var dts = Math.max(dt, 0.05); // the first frame of a loop has dt = 0
        vx = (bx - px) / dts; vy = (by - py) / dts; grounded = false; coyote = 0;
        target = clamp(vx * 1.1 - vy * 0.5, -26, 26);
        visY = by;
        rest = Math.abs(tx - bx) < 0.3 && Math.abs(ty + 15 - by) < 0.3 && Math.abs(target - tilt) < 0.3;
      }
      tilt += (target - tilt) * Math.min(1, 0.3 * dt);
      board.style.transform = "translate3d(" + (bx - 48).toFixed(1) + "px," + (visY - 31).toFixed(1) + "px,0) rotate(" + tilt.toFixed(1) + "deg)";
      return !rest;
    });

    listen(off, hero, "pointerenter", function () {
      if (finePointer) document.body.classList.add("hero-hide-dot");
    });
    listen(off, hero, "pointermove", function (e) {
      if (e.target.closest && e.target.closest(".hero-switcher")) return;
      var p = local(e);
      if (!on) { spawn(p.x, p.y); }
      tx = p.x; ty = p.y;
      // a quick flick upward pops the board
      var dtp = Math.max(1, e.timeStamp - lt) / 16.667;
      pvy = pvy * 0.6 + ((p.y - ly) / dtp) * 0.4;
      ly = p.y; lt = e.timeStamp;
      if (pvy < -12 && cooldown === 0) { ollie(); cooldown = 20; }
      lp.wake();
    });
    listen(off, hero, "pointerleave", function () {
      document.body.classList.remove("hero-hide-dot");
      if (finePointer) { on = false; board.classList.remove("is-on"); }
    });
    listen(off, hero, "pointerdown", function (e) {
      if (e.target.closest && e.target.closest(".hero-switcher")) return;
      var p = local(e);
      if (!on) spawn(p.x, p.y);
      if (!finePointer) { tx = p.x; ty = p.y; } // touch: head for where you tapped
      ollie(); flip();
      lp.wake();
    });
    listen(off, board, "animationend", function () { board.classList.remove("is-flip"); });
    listen(off, window, "resize", layout);

    if (finePointer) hero.classList.add("is-skate");
    layout();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    setHint(finePointer ? "Skate anywhere · glide over the words to ride them · click for a trick" : "Tap to skate");

    return function () {
      off.forEach(function (f) { f(); });
      lp.stop();
      hero.classList.remove("is-skate");
      document.body.classList.remove("hero-hide-dot");
    };
  };

  /* =====================================================================
     GAME — an endless runner in the spirit of Chrome's offline dinosaur. A
     skater rolls along a street, you jump the obstacles (bins, cones, benches…),
     the pace picks up, one hit ends the run. Space / ↑ / click / tap = jump
     (hold for a higher one), press again in the air = kickflip (+10), ↓ = drop
     faster. Pure line art in the page colours so it follows light / dark.
     A single street line, a lamp post now and then. The ground sits just above the headline, so the headline stays readable.
     ===================================================================== */
  variants.game = function () {
    var off = [];
    var BEST_KEY = "lq-skate-best";
    var JUMP = 12.2, GRAV = 0.75, FALL = 2.4;

    var stage = el("div", "gm", '<canvas class="gm__cv"></canvas><button type="button" class="gm__btn">Start</button><span class="gm__live" role="status" aria-live="polite"></span>');
    stage.tabIndex = -1; // focused by the Start button, not a tab stop of its own
    stage.setAttribute("role", "group");
    stage.setAttribute("aria-roledescription", "game");
    stage.setAttribute("aria-label", "Skateboard game. Use the Start button, then press space, the up arrow, or tap to jump.");
    over.appendChild(stage);
    var cv = stage.querySelector("canvas"), g = cv.getContext("2d"), live = stage.querySelector(".gm__live"), btn = stage.querySelector(".gm__btn");

    /* ---- state ---- */
    var w = 0, h = 0, dpr = 1, gy = 0, sx = 90;      // canvas size, ground line, skater x
    var state = "idle";                               // idle | run | dead
    var dist = 0, speed = 0, maxSpeed = 13.5, score = 0, best = 0;
    var sy = 0, vy = 0, held = false, duck = false, crouch = 0;
    var flipT = 0, flipUsed = false, flipDone = false, buf = 0, pop = 0;
    var obs = [], visible = true, inside = false, deadAt = 0;
    try { best = parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) { /* ignore */ }

    function col(a) { return "rgba(" + fgRGB + "," + a + ")"; }
    function bgc() { return "rgb(" + bgRGB + ")"; }

    function drawLamps() {
      g.strokeStyle = col(0.22); g.fillStyle = col(0.22); g.lineWidth = 2; g.lineCap = "round";
      g.beginPath();
      for (var x = 170 - ((dist * 0.75) % 960); x < w + 40; x += 960) {
        g.moveTo(x, gy); g.lineTo(x, gy - 132); g.lineTo(x + 22, gy - 138);
      }
      g.stroke();
      for (x = 170 - ((dist * 0.75) % 960); x < w + 40; x += 960) g.fillRect(x + 17, gy - 140, 12, 4);
    }

    function drawGround() {
      g.strokeStyle = col(0.85); g.lineWidth = 2; g.lineCap = "butt";
      g.beginPath(); g.moveTo(0, gy + 1); g.lineTo(w, gy + 1); g.stroke();
      g.strokeStyle = col(0.2); g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, gy + 12.5); g.lineTo(w, gy + 12.5);
      for (var x = -(dist % 110); x < w + 12; x += 110) { g.moveTo(x, gy + 2); g.lineTo(x - 7, gy + 12); }
      g.stroke();
    }

    /* ---- obstacles: origin = bottom-left on the ground, y grows upward as negative ---- */
    function body() { g.fillStyle = bgc(); g.strokeStyle = col(0.9); g.lineWidth = 2; g.lineJoin = "round"; }
    var TYPES = [
      { w: 26, h: 40, draw: function () { // traffic cone
        body(); g.beginPath(); g.rect(0, -4, 26, 4); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(5, -4); g.lineTo(10.5, -38); g.lineTo(15.5, -38); g.lineTo(21, -4); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(7.8, -21); g.lineTo(18.2, -21); g.moveTo(6.4, -12.5); g.lineTo(19.6, -12.5); g.stroke();
      } },
      { w: 34, h: 48, draw: function () { // bin
        body(); g.beginPath(); g.moveTo(3, -43); g.lineTo(6, 0); g.lineTo(28, 0); g.lineTo(31, -43); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.rect(0, -48, 34, 5); g.fill(); g.stroke();
        g.strokeStyle = col(0.45); g.lineWidth = 1.5; g.beginPath();
        [12, 17, 22].forEach(function (x) { g.moveTo(x, -37); g.lineTo(x, -7); });
        g.stroke();
      } },
      { w: 22, h: 40, draw: function () { // hydrant
        body(); g.beginPath(); g.rect(3, -6, 16, 6); g.fill(); g.stroke();
        g.beginPath(); g.rect(5, -32, 12, 26); g.fill(); g.stroke();
        g.beginPath(); g.arc(11, -32, 6, Math.PI, 0); g.fill(); g.stroke();
        g.beginPath(); g.rect(0, -25, 5, 7); g.rect(17, -25, 5, 7); g.fill(); g.stroke();
      } },
      { w: 34, h: 34, draw: function () { // plain box
        body(); g.beginPath(); g.rect(1, -33, 32, 32); g.fill(); g.stroke();
      } },
      { w: 76, h: 34, draw: function () { // bench
        body(); g.beginPath(); g.moveTo(8, 0); g.lineTo(8, -18); g.moveTo(68, 0); g.lineTo(68, -18); g.stroke();
        g.beginPath(); g.moveTo(5, -24); g.lineTo(5, -33); g.moveTo(71, -24); g.lineTo(71, -33); g.stroke();
        g.beginPath(); g.rect(0, -24, 76, 6); g.fill(); g.stroke();
        g.beginPath(); g.rect(2, -34, 72, 5); g.fill(); g.stroke();
      } },
      { w: 60, h: 34, draw: function () { // road-works barrier
        body(); g.beginPath(); g.moveTo(6, 0); g.lineTo(6, -25); g.moveTo(54, 0); g.lineTo(54, -25); g.stroke();
        [-34, -19].forEach(function (y) {
          g.beginPath(); g.rect(0, y, 60, 9); g.fill(); g.stroke();
          g.save(); g.beginPath(); g.rect(0, y, 60, 9); g.clip();
          g.strokeStyle = col(0.55); g.lineWidth = 2; g.beginPath();
          for (var x = -4; x < 64; x += 10) { g.moveTo(x, y + 9); g.lineTo(x + 9, y); }
          g.stroke(); g.restore();
        });
      } }
    ];

    function drawObstacles() {
      for (var i = 0; i < obs.length; i++) {
        var o = obs[i];
        g.save(); g.translate(o.x, gy); o.t.draw(); g.restore();
      }
    }

    /* ---- the skater ---- */
    var STAND = { bk: [-9, -13], fk: [11, -13], bn: [-7, -26], fn: [12, -27], hip: [1, -40], sh: [2, -62], hd: [3, -71], fa: [15, -52], ba: [-12, -54] };
    var CROUCH = { bk: [-9, -13], fk: [11, -13], bn: [-12, -24], fn: [14, -24], hip: [0, -32], sh: [5, -50], hd: [8, -59], fa: [20, -42], ba: [-14, -46] };
    function pt(k, t) { return [STAND[k][0] + (CROUCH[k][0] - STAND[k][0]) * t, STAND[k][1] + (CROUCH[k][1] - STAND[k][1]) * t]; }

    function drawBoard(spin) {
      g.save();
      g.translate(0, -12);
      g.scale(1, spin ? Math.cos(spin * Math.PI * 4) : 1);
      g.translate(0, 12);
      g.strokeStyle = col(0.95); g.fillStyle = col(0.95); g.lineWidth = 2.5; g.lineCap = "round"; g.lineJoin = "round";
      g.beginPath(); g.moveTo(-27, -17); g.lineTo(-22, -12); g.lineTo(22, -12); g.lineTo(27, -17); g.stroke();
      g.lineWidth = 2; g.beginPath(); g.moveTo(-16, -12); g.lineTo(-16, -10); g.moveTo(16, -12); g.lineTo(16, -10); g.stroke();
      g.fillStyle = bgc(); g.lineWidth = 2;
      g.beginPath(); g.arc(-16, -5, 4.6, 0, 6.2832); g.fill(); g.stroke();
      g.beginPath(); g.arc(16, -5, 4.6, 0, 6.2832); g.fill(); g.stroke();
      g.restore();
    }

    function drawRider(t) {
      var bk = pt("bk", t), fk = pt("fk", t), bn = pt("bn", t), fn = pt("fn", t), hip = pt("hip", t),
          sh = pt("sh", t), hd = pt("hd", t), fa = pt("fa", t), ba = pt("ba", t);
      g.strokeStyle = col(0.95); g.fillStyle = col(0.95); g.lineWidth = 3.2; g.lineCap = "round"; g.lineJoin = "round";
      g.beginPath();
      g.moveTo(bk[0], bk[1]); g.lineTo(bn[0], bn[1]); g.lineTo(hip[0], hip[1]);
      g.moveTo(fk[0], fk[1]); g.lineTo(fn[0], fn[1]); g.lineTo(hip[0], hip[1]);
      g.lineTo(sh[0], sh[1]);
      g.moveTo(sh[0], sh[1] + 2); g.lineTo(fa[0], fa[1]);
      g.moveTo(sh[0], sh[1] + 2); g.lineTo(ba[0], ba[1]);
      g.stroke();
      g.beginPath(); g.arc(hd[0], hd[1], 6, 0, 6.2832); g.fill();
    }

    function drawSkater() {
      g.save();
      g.translate(sx, gy - sy);
      var dead = state === "dead";
      g.rotate(dead ? -0.28 : -clamp(vy * 0.012, -0.16, 0.16));
      drawBoard(flipT);
      if (dead) { g.translate(-5, -2); g.rotate(-0.22); }
      drawRider(dead ? 1 : crouch);
      g.restore();
    }

    /* ---- text ---- */
    function pad(n) { n = String(Math.floor(n)); while (n.length < 5) n = "0" + n; return n; }
    function drawText() {
      g.textBaseline = "alphabetic";
      g.font = "500 13px ui-monospace, SFMono-Regular, Menlo, monospace";
      g.textAlign = "right";
      var right = w - 24;
      g.fillStyle = col(0.9); g.fillText(pad(score), right, 72);
      g.fillStyle = col(0.45); g.fillText("HI " + pad(best), right - 56, 72);
      g.textAlign = "center";
      if (state === "dead") {
        g.font = "600 22px Inter, system-ui, sans-serif"; g.fillStyle = col(0.95);
        g.fillText("Game over", w / 2, btnY() - 18);
      }
      if (pop > 0) {
        g.font = "600 12px Inter, system-ui, sans-serif"; g.textAlign = "left"; g.fillStyle = col(Math.min(1, pop / 20) * 0.9);
        g.fillText("+10 kickflip", sx + 34, gy - 92 - (40 - pop) * 0.5);
      }
    }

    function btnY() { return Math.max(130, gy * 0.5); }
    function syncBtn() {
      btn.hidden = state === "run";
      btn.textContent = state === "dead" ? "Play again" : "Start";
      btn.style.top = btnY() + "px";
    }

    function render() {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      drawLamps();
      drawGround();
      drawObstacles();
      drawSkater();
      drawText();
    }

    /* ---- game logic ---- */
    function jump() { vy = JUMP; sy = 0.01; flipUsed = false; flipT = 0; flipDone = false; buf = 0; }
    function start() {
      state = "run"; syncBtn(); speed = reduceMotion ? 5 : 6.5; maxSpeed = reduceMotion ? 7 : 13.5;
      score = 0; obs = []; sy = 0; vy = 0; flipT = 0; flipUsed = false; flipDone = false; buf = 0; pop = 0;
      live.textContent = "Go";
      setHint(finePointer ? "Space / ↑ jump · hold for height · again in the air = kickflip · ↓ drop" : "Tap to jump · tap in the air for a kickflip");
    }
    function die() {
      state = "dead"; deadAt = performance.now(); held = false; syncBtn();
      if (Math.floor(score) > best) {
        best = Math.floor(score);
        try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) { /* ignore */ }
      }
      live.textContent = "Game over. Score " + Math.floor(score) + ". Best " + best + ".";
      setHint("Press Play again");
    }
    function press() {
      held = true;
      if (state === "idle") { start(); jump(); }
      else if (state === "dead") { if (performance.now() - deadAt > 400) { start(); jump(); } }
      else if (sy <= 0.5) jump();
      else if (sy > 22 && !flipUsed && !reduceMotion) { flipUsed = true; flipT = 0.0001; }
      else buf = 7; // pressed a hair before landing: jump as soon as we touch down
      lp.wake();
    }
    function startFromButton() {
      if (state === "dead" && performance.now() - deadAt < 400) return;
      start();
      stage.focus({ preventScroll: true }); // so Space / ↑ work straight away
      lp.wake();
    }
    function release() {
      held = false;
      if (state === "run" && vy > 5) vy = 5; // let go early = shorter jump
    }

    function spawn() {
      var t = TYPES[Math.floor(Math.random() * TYPES.length)];
      obs.push({ t: t, x: w + 40, w: t.w, h: t.h });
      if (score > 120 && t.w < 40 && Math.random() < 0.28) obs.push({ t: t, x: w + 40 + t.w + 10, w: t.w, h: t.h });
    }
    function hit() {
      var l = sx - 17, r = sx + 17;
      for (var i = 0; i < obs.length; i++) {
        var o = obs[i];
        if (o.x + 3 < r && o.x + o.w - 3 > l && sy < o.h - 5) return true;
      }
      return false;
    }

    function update(dt) {
      crouch += ((sy > 2 || (held && state === "run") ? 1 : 0) - crouch) * Math.min(1, 0.25 * dt);
      if (pop > 0) pop -= dt;
      if (state === "idle") { dist += 1.2 * dt; return; }
      if (state !== "run") return;

      speed = Math.min(maxSpeed, speed + 0.0025 * dt);
      dist += speed * dt;
      score += speed * dt * 0.025;

      if (sy > 0) {
        vy -= GRAV * (duck ? FALL : 1) * dt;
        sy += vy * dt;
        if (flipT > 0) { flipT += dt / 30; if (flipT >= 1) { flipT = 0; flipDone = true; } }
        if (sy <= 0) { // touchdown
          sy = 0; vy = 0;
          if (flipDone) { score += 10; pop = 40; }
          flipT = 0; flipDone = false; flipUsed = false;
          if (buf > 0) jump();
        }
      }
      if (buf > 0) buf -= dt;

      var last = obs[obs.length - 1];
      if (!last || (w + 40) - (last.x + last.w) >= speed * (34 + Math.random() * 30) + 50) spawn();
      for (var i = obs.length - 1; i >= 0; i--) {
        obs[i].x -= speed * dt;
        if (obs[i].x + obs[i].w < -20) obs.splice(i, 1);
      }
      if (hit()) die();
    }

    var lp = loop(function (dt) {
      if (!visible) return false;
      update(dt);
      render();
      return state === "run" || (state === "idle" && !reduceMotion);
    });

    /* ---- layout ---- */
    function size() {
      var hr = hero.getBoundingClientRect(), content = hero.querySelector(".hero__content");
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = hr.width; h = hr.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      sx = clamp(w * 0.16, 70, 200);
      // run on the free space above the headline; if there isn't enough, dim the headline and run over it
      gy = (content ? content.getBoundingClientRect().top - hr.top : h * 0.62) - 36;
      var dim = gy < 200;
      if (dim) gy = Math.min(h - 110, 260);
      hero.classList.toggle("is-game-dim", dim);
      syncBtn();
      render();
    }

    /* ---- input ---- */
    function typing(t) { return t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable); }
    var UP = { Space: 1, ArrowUp: 1, KeyW: 1 }, DOWN = { ArrowDown: 1, KeyS: 1 };
    listen(off, window, "keydown", function (e) {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      var focused = document.activeElement === stage;
      var onControl = e.target && e.target.closest && e.target.closest("button, a, summary");
      if (!focused && !(inside && !onControl)) return;
      if (!focused && state !== "run" && e.code !== "Space") return; // hovering shouldn't steal the arrow keys
      if (UP[e.code] || (focused && e.code === "Enter")) { e.preventDefault(); if (!e.repeat) press(); }
      else if (DOWN[e.code]) { e.preventDefault(); duck = true; }
    });
    listen(off, window, "keyup", function (e) {
      if (UP[e.code] || e.code === "Enter") release();
      else if (DOWN[e.code]) duck = false;
    });
    listen(off, btn, "click", startFromButton);
    listen(off, stage, "pointerdown", function (e) {
      if (state !== "run" || (e.pointerType === "mouse" && e.button !== 0)) return; // the button starts a run, not the background
      press();
    });
    listen(off, stage, "pointerup", release);
    listen(off, stage, "pointercancel", release);
    listen(off, hero, "pointerenter", function () { inside = true; });
    listen(off, hero, "pointerleave", function () { inside = false; });
    listen(off, window, "blur", function () { duck = false; release(); });
    listen(off, window, "resize", size);

    function theme() { render(); }
    themeListeners.push(theme);
    var io = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) lp.wake(); });
      io.observe(hero);
    }

    size();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { size(); });
    lp.wake();
    if (switcher && switcher.contains(document.activeElement)) stage.focus({ preventScroll: true });
    setHint(finePointer ? "Press Start · then Space / ↑ to jump · ↓ drop" : "Press Start, then tap to jump");

    return function () {
      off.forEach(function (f) { f(); });
      lp.stop(); if (io) io.disconnect();
      themeListeners.splice(themeListeners.indexOf(theme), 1);
      hero.classList.remove("is-game-dim");
    };
  };

  /* =====================================================================
     SPOTIFY — the hero glows in the colours of whatever you're playing, with
     the album cover spinning like a record. Data comes from now-playing.json
     (see README → Now Playing). Until the site is deployed it shows demo
     data, clearly labelled.
     ===================================================================== */
  variants.spotify = function () {
    var off = [];
    var FALLBACK = ["#ff5a36", "#2b50ff", "#f6d33c"];
    var DEMO = { title: "Placeholder Track", artist: "Your favourite band", palette: FALLBACK };

    var bg = el("div", "sp-bg", '<span class="sp-blob sp-blob--1"></span><span class="sp-blob sp-blob--2"></span><span class="sp-blob sp-blob--3"></span>');
    under.appendChild(bg);
    var card = el("a", "sp-card",
      '<span class="sp-disc"><img alt="" width="210" height="210" /></span>' +
      '<span class="sp-label"></span><span class="sp-title"></span><span class="sp-artist"></span><span class="sp-demo"></span>');
    card.target = "_blank"; card.rel = "noopener noreferrer";
    card.hidden = true;
    over.appendChild(card);

    var img = card.querySelector("img");
    var labelEl = card.querySelector(".sp-label");
    var titleEl = card.querySelector(".sp-title");
    var artistEl = card.querySelector(".sp-artist");
    var demoEl = card.querySelector(".sp-demo");
    var lastArt = null;

    function setPalette(p) {
      bg.style.setProperty("--c1", p[0]);
      bg.style.setProperty("--c2", p[1]);
      bg.style.setProperty("--c3", p[2]);
    }
    function demoArt(p) {
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + p[0] + '"/><stop offset=".55" stop-color="' + p[1] + '"/><stop offset="1" stop-color="' + p[2] + '"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><circle cx="100" cy="100" r="46" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/></svg>';
      return "data:image/svg+xml," + encodeURIComponent(svg);
    }
    // Dominant, saturated, distinct colours from the cover art.
    function palette(image) {
      var s = 24, cv = document.createElement("canvas");
      cv.width = cv.height = s;
      var g = cv.getContext("2d", { willReadFrequently: true });
      g.drawImage(image, 0, 0, s, s);
      var d = g.getImageData(0, 0, s, s).data, buckets = {};
      for (var i = 0; i < d.length; i += 4) {
        var r = d[i], gr = d[i + 1], b = d[i + 2];
        var mx = Math.max(r, gr, b), mn = Math.min(r, gr, b);
        var sat = mx ? (mx - mn) / mx : 0, light = mx / 255;
        var wgt = (light > 0.2 && light < 0.97) ? (0.25 + sat) : 0.01; // near-black / blown-out pixels barely count
        var k = (r >> 4) << 8 | (gr >> 4) << 4 | (b >> 4);
        var bk = buckets[k] || (buckets[k] = { w: 0, r: 0, g: 0, b: 0 });
        bk.w += wgt; bk.r += r * wgt; bk.g += gr * wgt; bk.b += b * wgt;
      }
      var list = Object.keys(buckets).map(function (k) {
        var bk = buckets[k];
        return { w: bk.w, r: bk.r / bk.w, g: bk.g / bk.w, b: bk.b / bk.w };
      }).sort(function (a, b) { return b.w - a.w; });
      var picks = [];
      list.forEach(function (c) {
        if (picks.length >= 3) return;
        var far = picks.every(function (p) { return Math.hypot(p.r - c.r, p.g - c.g, p.b - c.b) > 70; });
        if (far) picks.push(c);
      });
      var out = picks.map(function (c) { return "rgb(" + Math.round(c.r) + "," + Math.round(c.g) + "," + Math.round(c.b) + ")"; });
      while (out.length < 3) out.push(FALLBACK[out.length]);
      return out;
    }

    function render(data) {
      var demo = !data || !data.title;
      var d = demo ? DEMO : data;
      card.hidden = false;
      titleEl.textContent = d.title;
      artistEl.textContent = d.artist;
      labelEl.textContent = demo ? "Demo · now playing" : (d.isPlaying ? "Now playing" : "Last played");
      demoEl.textContent = demo ? "Demo data — goes live once the site is on GitHub Pages" : "";
      card.classList.toggle("is-paused", !demo && !d.isPlaying);
      if (demo || !d.songUrl) card.removeAttribute("href"); else card.href = d.songUrl;
      if (demo) {
        lastArt = null;
        img.removeAttribute("crossorigin");
        img.src = demoArt(DEMO.palette);
        setPalette(DEMO.palette);
        setHint("Move your cursor — the glow follows");
        return;
      }
      setHint(d.isPlaying ? "Live from Spotify" : "Last thing you played, from Spotify");
      if (d.albumArt && d.albumArt !== lastArt) {
        lastArt = d.albumArt;
        img.crossOrigin = "anonymous";
        img.onload = function () { try { setPalette(palette(img)); } catch (e) { setPalette(FALLBACK); } };
        img.onerror = function () { // CDN refused CORS: show the cover anyway, default glow
          img.onerror = null; img.removeAttribute("crossorigin"); img.src = d.albumArt; setPalette(FALLBACK);
        };
        img.src = d.albumArt;
      } else if (!d.albumArt) { setPalette(FALLBACK); }
    }

    // pointer parallax for the glow
    var px = 0, py = 0, tpx = 0, tpy = 0;
    var lp = loop(function (dt) {
      px += (tpx - px) * Math.min(1, 0.06 * dt);
      py += (tpy - py) * Math.min(1, 0.06 * dt);
      bg.style.setProperty("--px", px.toFixed(3));
      bg.style.setProperty("--py", py.toFixed(3));
      return Math.abs(tpx - px) + Math.abs(tpy - py) > 0.002;
    });
    listen(off, hero, "pointermove", function (e) {
      var p = local(e), r = hero.getBoundingClientRect();
      tpx = (p.x / r.width) * 2 - 1; tpy = (p.y / r.height) * 2 - 1;
      if (!reduceMotion) lp.wake();
    });

    setPalette(FALLBACK);
    var pending = window.__lqNowPlaying === undefined;
    var timer = null;
    if (!pending) render(window.__lqNowPlaying);
    else timer = setTimeout(function () { if (window.__lqNowPlaying === undefined) render(null); }, 2500);
    listen(off, document, "lq:nowplaying", function (e) { render(e.detail); });

    return function () {
      off.forEach(function (f) { f(); });
      lp.stop();
      if (timer) clearTimeout(timer);
    };
  };

  /* ---------- switcher + boot ---------- */
  var cleanup = null;
  var buttons = switcher ? Array.prototype.slice.call(switcher.querySelectorAll("[data-hero-variant]")) : [];

  function setVariant(name, persist) {
    if (!variants[name]) name = "photo";
    if (cleanup) { try { cleanup(); } catch (e) { /* ignore */ } cleanup = null; }
    under.textContent = ""; over.textContent = "";
    hero.setAttribute("data-variant", name);
    setHint("");
    cleanup = variants[name]() || null;
    buttons.forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-hero-variant") === name));
    });
    if (persist) {
      try { localStorage.setItem("lq-hero", name); } catch (e) { /* ignore */ }
      try {
        var u = new URL(window.location.href);
        u.searchParams.set("hero", name);
        history.replaceState(null, "", u.toString());
      } catch (e) { /* ignore */ }
    }
  }

  buttons.forEach(function (b) {
    b.addEventListener("click", function () { setVariant(b.getAttribute("data-hero-variant"), true); });
  });

  var start = "photo";
  try {
    var q = new URLSearchParams(window.location.search).get("hero");
    var saved = null;
    try { saved = localStorage.getItem("lq-hero"); } catch (e) { /* ignore */ }
    start = (q && variants[q]) ? q : (saved && variants[saved]) ? saved : "photo";
  } catch (e) { /* ignore */ }
  setVariant(start, false);
})();
