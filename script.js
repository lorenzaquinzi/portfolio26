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
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Current year in footer ---------- */
  var yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

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

    var hoverTargets = document.querySelectorAll("a, button, [data-cursor-hover]");
    hoverTargets.forEach(function (el) {
      el.addEventListener("mouseenter", function () { cursor.classList.add("is-hovering"); });
      el.addEventListener("mouseleave", function () { cursor.classList.remove("is-hovering"); });
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
