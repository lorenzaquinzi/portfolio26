// Lorenza Quinzi — Portfolio
// Theme toggle (persisted) + gentle reveal-on-scroll. No frameworks, no build step.

(function () {
  "use strict";

  /* ---------- Theme toggle ---------- */
  var root = document.documentElement;
  var STORAGE_KEY = "lq-theme";
  var toggle = document.querySelector("[data-theme-toggle]");
  var label = toggle ? toggle.querySelector("[data-theme-label]") : null;

  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function currentTheme() {
    var stored = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) { /* private mode etc. */ }
    return stored || (systemPrefersDark() ? "dark" : "light");
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    if (label) label.textContent = theme === "dark" ? "Light mode" : "Dark mode";
    if (toggle) toggle.setAttribute("aria-pressed", String(theme === "dark"));
  }

  applyTheme(currentTheme());

  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* ignore */ }
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealEls = document.querySelectorAll("[data-reveal]");

  if (!reduceMotion && "IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          // a very tall section can never show 12% of itself on a short screen, so also accept 160px
          if (entry.isIntersecting && (entry.intersectionRatio >= 0.12 || entry.intersectionRect.height >= 160)) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: [0, 0.05, 0.12, 0.3], rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Logo: on the page it points to, go back to the very top ----------
     Tapping the logo on the home page scrolls to the initial position (top of the page, no #hash left in the URL);
     on other pages it is a normal link to the home page. */
  var logo = document.querySelector(".index-nav__logo");
  if (logo) {
    logo.addEventListener("click", function (e) {
      var strip = function (p) { return p.replace(/index\.html$/, "").replace(/\/+$/, ""); };
      var here = strip(window.location.pathname), there = strip(new URL(logo.href, window.location.href).pathname);
      if (here !== there) return; // another page: let the link navigate
      e.preventDefault();
      window.scrollTo({ top: 0, left: 0, behavior: (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) ? "auto" : "smooth" });
      if (window.location.hash) history.replaceState(null, "", window.location.pathname + window.location.search);
    });
  }

  /* ---------- Current year in footer ---------- */
  var yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Email: a copy action, not a mailto ----------
     Anywhere an [data-copy-email] link appears it copies the address and says "Copied".
     Without JS (or if copying fails) it still falls back to the normal mailto link. */
  var copyLinks = document.querySelectorAll("[data-copy-email]");
  if (copyLinks.length) {
    var live = document.createElement("span");
    live.className = "vh-live";
    live.setAttribute("role", "status");
    document.body.appendChild(live);

    var copyText = function (text) {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
      }
      return new Promise(function (resolve) {
        var ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", "");
        ta.style.cssText = "position:fixed;top:-100px;opacity:0";
        document.body.appendChild(ta); ta.select();
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
        ta.remove(); resolve(ok);
      });
    };

    copyLinks.forEach(function (a) {
      var addr = (a.getAttribute("href") || "").replace(/^mailto:/, "");
      var timer = null;
      a.setAttribute("role", "button");
      a.setAttribute("aria-label", "Copy email address");
      a.title = "Copy " + addr;
      a.addEventListener("click", function (e) {
        e.preventDefault();
        copyText(addr).then(function (ok) {
          if (!ok) { window.location.href = "mailto:" + addr; return; }
          a.classList.add("is-copied");
          live.textContent = "";
          setTimeout(function () { live.textContent = "Email address copied"; }, 30);
          clearTimeout(timer);
          timer = setTimeout(function () { a.classList.remove("is-copied"); }, 1800);
        });
      });
    });
  }

  /* ---------- Custom cursor dot (fine pointers, motion allowed) ---------- */
  var cursor = document.querySelector("[data-cursor-dot]");
  var canHover = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (cursor && canHover && !reduceMotion) {
    var mouseX = 0, mouseY = 0, dotX = 0, dotY = 0;
    var raf = null;

    document.addEventListener("mousemove", function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursor.classList.add("is-active");
      if (!raf) tick();
    });

    document.addEventListener("mouseleave", function () {
      cursor.classList.remove("is-active");
    });

    function tick() {
      dotX += (mouseX - dotX) * 0.25;
      dotY += (mouseY - dotY) * 0.25;
      cursor.style.setProperty("--x", dotX + "px");
      cursor.style.setProperty("--y", dotY + "px");
      raf = requestAnimationFrame(tick);
    }

    // The dot grows over anything tappable (same set the CSS gives cursor: pointer),
    // including elements added later.
    var TAPPABLE = "a[href], button:not(:disabled), summary, [role=button], [data-cursor-hover]";
    document.addEventListener("mouseover", function (e) {
      cursor.classList.toggle("is-hovering", !!(e.target.closest && e.target.closest(TAPPABLE)));
    });
  } else if (cursor) {
    cursor.style.display = "none";
  }

  /* ---------- Now Playing (Spotify, via now-playing.json) ----------
     The file is written by a GitHub Actions workflow every ~5 minutes (see README). */
  var nowPlaying = document.querySelector("[data-now-playing]");

  if (nowPlaying) {
    var npLabel = nowPlaying.querySelector("[data-now-playing-label]");
    var npTrack = nowPlaying.querySelector("[data-now-playing-track]");
    var NP_URL = "now-playing.json";
    var npPollMs = 60000;
    var NP_STALE_MS = 15 * 60 * 1000; // refreshed every ~5 min; past this, "playing" can't be trusted

    // Shared with the hero (hero.js "spotify" variant): last result + an event.
    function publish(data) {
      window.__lqNowPlaying = data;
      document.dispatchEvent(new CustomEvent("lq:nowplaying", { detail: data }));
    }

    function fetchNowPlaying() {
      // minute-bucketed query string: skips the CDN's 10-minute cache without hammering it
      fetch(NP_URL + "?t=" + Math.floor(Date.now() / 60000), { cache: "no-store" })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
          if (data && data.isPlaying && data.updatedAt && Date.now() - Date.parse(data.updatedAt) > NP_STALE_MS) {
            data.isPlaying = false; // the snapshot is old: say "last played" instead of "now playing"
          }
          publish(data && data.title ? data : null);
          if (!data || !data.title) {
            nowPlaying.hidden = true;
            return;
          }
          npLabel.textContent = data.isPlaying ? "Now playing" : "Last played";
          npTrack.textContent = data.title + " — " + data.artist;
          nowPlaying.href = data.songUrl || "#";
          nowPlaying.classList.toggle("is-playing", !!data.isPlaying);
          nowPlaying.hidden = false;
        })
        .catch(function () {
          publish(null);
          // No now-playing.json yet (e.g. local preview) — stay hidden, no error shown.
          nowPlaying.hidden = true;
        });
    }

    fetchNowPlaying();
    setInterval(fetchNowPlaying, npPollMs);
  }
})();

/* Case-study clips: phone recordings play (muted, looped) only while on screen,
   and have a play / pause button. With reduced motion they stay on their poster
   frame until you press play. */
(function () {
  "use strict";
  var clips = document.querySelectorAll("video[data-clip]");
  if (!clips.length) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  clips.forEach(function (v) {
    var stage = (v.closest && v.closest(".cs2-stage")) || v.parentNode; /* the control sits in the corner of the stage, outside any device frame */
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cs2-clip-btn";
    stage.appendChild(btn);

    var userPaused = reduce; // reduced motion: start paused
    function sync() {
      var paused = v.paused;
      btn.classList.toggle("is-paused", paused);
      btn.textContent = paused ? "▶" : "❚❚";
      btn.setAttribute("aria-label", paused ? "Play video" : "Pause video");
    }
    function play() {
      var p = v.play();
      if (p && p.catch) p.catch(function () { /* autoplay blocked: poster stays */ });
    }
    btn.addEventListener("click", function () {
      if (v.paused) { userPaused = false; play(); } else { userPaused = true; v.pause(); }
    });
    v.addEventListener("play", sync);
    v.addEventListener("pause", sync);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !userPaused) play();
          else if (!e.isIntersecting) v.pause();
        });
      }, { threshold: 0.35 }).observe(v);
    } else if (!userPaused) {
      play();
    }
    sync();
  });
})();

/* "Other projects": the little carousel inside each project slide (swipe / scroll, arrow keys, buttons). */
(function () {
  "use strict";
  var cars = document.querySelectorAll("[data-car]");
  if (!cars.length) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  cars.forEach(function (car) {
    var slide = car.closest(".cs2-slide");
    var panels = Array.prototype.slice.call(car.querySelectorAll(".cs2-panel"));
    var prev = slide.querySelector("[data-car-prev]"), next = slide.querySelector("[data-car-next]");
    var now = slide.querySelector("[data-car-now]");
    panels.forEach(function (p, i) {
      p.setAttribute("aria-label", (i + 1) + " of " + panels.length + ": " + p.getAttribute("data-title"));
    });
    function index() {
      if (panels.length < 2) return 0;
      var pitch = panels[1].offsetLeft - panels[0].offsetLeft || car.clientWidth;
      return Math.max(0, Math.min(panels.length - 1, Math.round(car.scrollLeft / pitch)));
    }
    function update() {
      var i = index();
      if (now) now.textContent = String(i + 1);
      if (prev) prev.disabled = i === 0;
      if (next) next.disabled = i === panels.length - 1;
    }
    function goTo(i) {
      i = Math.max(0, Math.min(panels.length - 1, i));
      car.scrollTo({ left: panels[i].offsetLeft - panels[0].offsetLeft, behavior: reduce ? "auto" : "smooth" });
    }
    function go(d) { goTo(index() + d); }
    var ticking = false;
    car.addEventListener("scroll", function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { ticking = false; update(); });
    }, { passive: true });
    if (prev) prev.addEventListener("click", function () { go(-1); });
    if (next) next.addEventListener("click", function () { go(1); });
    car.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    });
    update();
  });
})();
