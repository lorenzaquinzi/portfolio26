// Lorenza Quinzi — Search my work (header icon → overlay).
//
// How it works (no server, no API key, nothing is sent anywhere):
//   1. The first time the search is opened, the page reads the site's own pages (fetch + DOMParser) and cuts them into
//      small chunks: a project's overview, each section, each job, the About text, contact.
//   2. Keyword search works immediately.
//   3. In parallel, a small open-source embedding model (search-worker.js) loads in the browser.
//      Once ready, chunks and queries become vectors and results are ranked by meaning
//      ("what did you do at Google?" finds the Experience entry even with different words).
//      Chunk vectors are cached in localStorage, the model in the browser cache.
// Open with the header icon, "/" or Cmd/Ctrl+K. Add ?q=your+question to any URL to open it with a search run.

(function () {
  "use strict";

  var openers = document.querySelectorAll("[data-search-open]");
  if (!openers.length) return;

  var root = document.createElement("div");
  root.className = "sr-overlay";
  root.hidden = true;
  root.innerHTML = '<div class="sr-overlay__backdrop" data-sr-close></div><div class="sr sr--panel" role="dialog" aria-modal="true" aria-label="Search my work"></div>';
  document.body.appendChild(root);
  var panel = root.querySelector(".sr");

  var PAGES = [
    { url: "index.html", label: "Home" },
    { url: "case-study-address-scanner.html", label: "" },
    { url: "case-study-dynamic-island.html", label: "" },
    { url: "case-study-driver-profile.html", label: "" },
    { url: "case-study-other-projects.html", label: "" },
    { url: "experience.html", label: "Experience" },
    { url: "about.html", label: "About" }
  ];
  var SUGGESTIONS = [
    "Address Scanner",
    "What did you do at Google?",
    "Design systems",
    "Work with drivers",
    "How can I reach you?"
  ];
  var MODEL_ID = "all-MiniLM-L6-v2-q8";
  var CACHE_KEY = "lq-search-vecs-v1";
  var MAX_RESULTS = 5;

  /* ---------- UI ---------- */
  panel.innerHTML =
    '<form class="sr__form" role="search" autocomplete="off">' +
      '<svg class="sr__icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M15.5 15.5 21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
      '<label class="sr-only" for="sr-input">Search my work</label>' +
      '<input id="sr-input" class="sr__input" type="search" name="q" placeholder="Search my work, or just ask…" enterkeyhint="search" spellcheck="false" />' +
      '<button type="button" class="sr__kbd" data-sr-close aria-label="Close search">Esc</button>' +
    '</form>' +
    '<p class="sr__status" role="status"></p>' +
    '<div class="sr__chips" role="group" aria-label="Suggestions"></div>' +
    '<ul class="sr__list" aria-live="polite"></ul>';

  var form = root.querySelector(".sr__form");
  var input = root.querySelector(".sr__input");
  var statusEl = root.querySelector(".sr__status");
  var chipsEl = root.querySelector(".sr__chips");
  var listEl = root.querySelector(".sr__list");

  SUGGESTIONS.forEach(function (s) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "sr__chip"; b.textContent = s;
    b.addEventListener("click", function () { input.value = s; input.focus(); run(); });
    chipsEl.appendChild(b);
  });

  var IDLE_NOTE = "Runs in your browser with a small open-source AI model. Nothing you type leaves this page.";
  function setStatus(t) { statusEl.textContent = t || ""; }
  setStatus(IDLE_NOTE);

  /* ---------- text helpers ---------- */
  var STOP = /^(the|and|for|you|your|are|was|were|with|what|when|where|which|who|why|how|did|does|can|about|from|that|this|have|has|had|any|all|into|work|worked|show|tell|me|my|i|a|an|of|to|in|on|at|is|it|do|or|get|got|find|look)$/;
  function tokens(s) {
    return (s.toLowerCase().match(/[a-zà-ÿ0-9]+/g) || []).filter(function (w) { return w.length > 1 && !STOP.test(w); })
      .map(function (w) { return w.length > 4 ? w.replace(/(ing|ed|es|s)$/, "") : w; });
  }
  function fnv(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }
  function plain(node) {
    var c = node.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll("script,style,svg,button,video,nav,[hidden]"), function (n) { n.remove(); });
    Array.prototype.forEach.call(c.querySelectorAll("dt,dd,li,p,h1,h2,h3,figcaption,div,summary,a,br"), function (n) {
      n.insertAdjacentText("afterend", " "); // keep words from running together across block elements
    });
    Array.prototype.forEach.call(c.querySelectorAll("img[alt]"), function (img) {
      if (img.alt) img.insertAdjacentText("afterend", ". " + img.alt + ". ");
    });
    return c.textContent.replace(/\s+/g, " ").replace(/\b\d+ \/ \d+\b/g, "").replace(/\.\s*\./g, ".").trim();
  }
  function sentences(text) { // split after . ! ? followed by space (so "2.0" stays whole)
    return text.replace(/([.!?])\s+/g, "$1\u0001").split("\u0001");
  }
  function splitLong(text, max) {
    if (text.length <= max) return [text];
    var parts = sentences(text).map(function (p) { return p + " "; }), out = [], cur = "";
    parts.forEach(function (p) {
      if ((cur + p).length > max && cur) { out.push(cur.trim()); cur = ""; }
      cur += p;
    });
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  /* ---------- build the index from the site's own pages ---------- */
  var chunks = [];       // { page, heading, url, text, tk }
  var chunksReady = null;

  function addChunk(page, heading, url, text) {
    text = (text || "").trim();
    if (text.length < 12) return;
    splitLong(text, 700).forEach(function (t) {
      chunks.push({ page: page, heading: heading, url: url, text: t, tk: tokens(page + " " + heading + " " + t), vec: null });
    });
  }

  function indexPage(p, doc) {
    var main = doc.querySelector("main");
    if (!main) return;
    var h1 = main.querySelector("h1");
    var page = p.label || (h1 ? h1.textContent.trim() : p.url);

    if (p.url === "index.html") {
      Array.prototype.forEach.call(main.querySelectorAll(".work-list__item a"), function (a) {
        var t = a.querySelector(".work-list__title"), m = a.querySelector(".work-list__meta"), y = a.querySelector(".work-list__year");
        var title = t ? t.textContent.trim() : "";
        addChunk("Selected work", title, a.getAttribute("href"),
          title + ", a project at " + (m ? m.textContent.trim() : "") + " (" + (y ? y.textContent.trim() : "") + ").");
      });
      var intro = main.querySelector(".intro");
      if (intro) addChunk("Home", "Intro", "index.html", plain(intro));
      var foot = doc.querySelector("footer");
      if (foot) {
        var links = Array.prototype.map.call(foot.querySelectorAll("a[href]"), function (a) {
          var h = a.getAttribute("href") || "";
          var label = a.textContent.replace(/Copied$/, "").replace(/[↗→]/g, "").trim();
          return (/^(mailto:|https?:)/.test(h) && label) ? label + " " + h.replace(/^mailto:/, "") : "";
        }).filter(Boolean).join(". ");
        addChunk("Contact", "Get in touch", "index.html#contact", "Contact Lorenza: email, reach out, get in touch, LinkedIn, Instagram. " + links);
      }
      return;
    }

    var head = main.querySelector(".cs2-head");
    if (head) addChunk(page, "Overview", p.url, plain(head));

    if (p.url === "experience.html") {
      Array.prototype.forEach.call(main.querySelectorAll("details"), function (d) {
        var r = d.querySelector(".exp-item__role");
        addChunk("Experience", r ? r.textContent.replace(/\s+/g, " ").trim() : "Role", p.url + "#experience", plain(d));
      });
      var edu = main.querySelector(".exp-edu");
      if (edu) addChunk("Experience", "Education", p.url + "#experience", "Where Lorenza studied: degrees, university, school. " + plain(edu));
      return;
    }
    if (p.url === "about.html") {
      var sec = main.querySelector("section") || main;
      addChunk("About", "About me", p.url, plain(sec));
      return;
    }

    Array.prototype.forEach.call(main.querySelectorAll("section"), function (s) {
      var h2 = s.querySelector("h2");
      var heading = h2 ? h2.textContent.trim() : "Details";
      var id = s.id || (h2 && h2.id) || "";
      addChunk(page, heading, p.url + (id ? "#" + id : ""), plain(s));
    });
  }

  function buildIndex() {
    if (chunksReady) return chunksReady;
    chunksReady = Promise.all(PAGES.map(function (p) {
      return fetch(p.url, { cache: "force-cache" })
        .then(function (r) { return r.ok ? r.text() : ""; })
        .then(function (html) { return html ? { p: p, doc: new DOMParser().parseFromString(html, "text/html") } : null; })
        .catch(function () { return null; });
    })).then(function (docs) {
      docs.forEach(function (d) { if (d) indexPage(d.p, d.doc); });
      return chunks.length;
    });
    return chunksReady;
  }

  /* ---------- the on-device model ---------- */
  var worker = null, modelState = "idle", vecsReady = false, pendingEmbeds = {}, embedSeq = 0;

  function embed(texts) {
    return new Promise(function (resolve, reject) {
      var id = ++embedSeq;
      pendingEmbeds[id] = { resolve: resolve, reject: reject };
      worker.postMessage({ cmd: "embed", id: id, texts: texts });
    });
  }

  function loadCache(sig) {
    try {
      var c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (c && c.sig === sig && c.vecs && c.vecs.length === chunks.length) return c.vecs;
    } catch (e) { /* ignore */ }
    return null;
  }
  function saveCache(sig, vecs) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        sig: sig,
        vecs: vecs.map(function (v) { return Array.prototype.map.call(v, function (x) { return Math.round(x * 1e4) / 1e4; }); })
      }));
    } catch (e) { /* quota or private mode: fine */ }
  }

  function embedAllChunks() {
    var texts = chunks.map(function (c) { return c.page + " — " + c.heading + ". " + c.text; });
    var sig = MODEL_ID + ":" + fnv(texts.join("|"));
    var cached = loadCache(sig);
    if (cached) {
      cached.forEach(function (v, i) { chunks[i].vec = Float32Array.from(v); });
      vecsReady = true;
      return Promise.resolve();
    }
    var out = [], i = 0, B = 8;
    function next() {
      if (i >= texts.length) return Promise.resolve();
      var batch = texts.slice(i, i + B);
      return embed(batch).then(function (v) {
        v.forEach(function (x) { out.push(Float32Array.from(x)); });
        i += B;
        setStatus("Reading my site… " + Math.min(100, Math.round((i / texts.length) * 100)) + "%");
        return next();
      });
    }
    return next().then(function () {
      out.forEach(function (v, k) { chunks[k].vec = v; });
      vecsReady = true;
      saveCache(sig, out);
    });
  }

  function startModel() {
    if (modelState !== "idle") return;
    var conn = navigator.connection || {};
    if (conn.saveData || /^(slow-2g|2g|3g)$/.test(conn.effectiveType || "")) {
      modelState = "skipped";
      setStatus("Keyword search (the AI model is skipped on a slow or data-saving connection).");
      return;
    }
    if (typeof Worker === "undefined") { modelState = "failed"; return; }
    modelState = "loading";
    setStatus("Loading the search model (about 23 MB, only the first time)…");
    try {
      worker = new Worker("search-worker.js", { type: "module" });
    } catch (e) { modelState = "failed"; setStatus("Keyword search (the AI model couldn't start here)."); return; }

    worker.onmessage = function (ev) {
      var m = ev.data || {};
      if (m.type === "progress" && modelState === "loading") {
        setStatus("Loading the search model (about 23 MB, only the first time)… " + m.pct + "%");
      } else if (m.type === "ready") {
        modelState = "ready";
        setStatus("Reading my site…");
        buildIndex().then(embedAllChunks).then(function () {
          setStatus("On-device AI search is on. " + IDLE_NOTE.split(". ")[1]);
          run();
        }).catch(function () { modelState = "failed"; setStatus("Keyword search (the AI model couldn't finish loading)."); });
      } else if (m.type === "embedded") {
        var p = pendingEmbeds[m.id]; if (p) { delete pendingEmbeds[m.id]; p.resolve(m.vecs); }
      } else if (m.type === "error") {
        if (m.id && pendingEmbeds[m.id]) { pendingEmbeds[m.id].reject(new Error(m.message)); delete pendingEmbeds[m.id]; }
        else if (modelState === "loading") { modelState = "failed"; setStatus("Keyword search (the AI model couldn't load: you may be offline)."); }
      }
    };
    worker.onerror = function () {
      if (modelState === "loading") { modelState = "failed"; setStatus("Keyword search (the AI model couldn't load)."); }
    };
    worker.postMessage({ cmd: "init" });
  }

  /* ---------- ranking ---------- */
  function lexScore(q, c) {
    if (!q.length) return 0;
    var hit = 0, head = 0, ht = tokens(c.heading + " " + c.page);
    q.forEach(function (w) {
      if (c.tk.indexOf(w) !== -1) hit++;
      if (ht.indexOf(w) !== -1) head++;
    });
    return hit / q.length + 0.5 * (head / q.length);
  }

  function rank(query, qvec) {
    var q = tokens(query);
    var scored = chunks.map(function (c) {
      var lex = lexScore(q, c), sem = 0;
      if (qvec && c.vec) { for (var i = 0; i < qvec.length; i++) sem += qvec[i] * c.vec[i]; }
      return { c: c, lex: lex, sem: sem, score: qvec ? sem + 0.12 * lex : lex };
    });
    var minScore = qvec ? 0.25 : 0.01; // off-topic questions peak around 0.2 with this model
    scored = scored.filter(function (s) { return s.score >= minScore; }).sort(function (a, b) { return b.score - a.score; });
    var top = scored.length ? scored[0].score : 0;
    var perPage = {}, seen = {}, out = [];
    scored.forEach(function (s) {
      if (s.score < top * (qvec ? 0.65 : 0.4)) return; // drop the long tail of weak matches
      var k = s.c.url.split("#")[0], dup = s.c.url + "|" + s.c.heading;
      if (seen[dup]) return;
      seen[dup] = true;
      perPage[k] = (perPage[k] || 0) + 1;
      if (perPage[k] <= 2 && out.length < MAX_RESULTS) out.push(s);
    });
    return out;
  }

  function snippet(text, query) {
    var q = tokens(query);
    var sents = sentences(text), best = sents[0], bestN = -1;
    sents.forEach(function (s) {
      var st = tokens(s), n = 0;
      q.forEach(function (w) { if (st.indexOf(w) !== -1) n++; });
      if (n > bestN) { bestN = n; best = s; }
    });
    best = best.trim();
    return best.length > 170 ? best.slice(0, 167).replace(/\s+\S*$/, "") + "…" : best;
  }

  /* ---------- run a search ---------- */
  var runToken = 0, timer = null;

  function show(results, query) {
    listEl.textContent = "";
    chipsEl.hidden = !!query;
    if (!query) return;
    if (!results.length) {
      var li = document.createElement("li");
      li.className = "sr__none";
      li.textContent = "Nothing close to that. Try a project name, a company, or something like “design systems”.";
      listEl.appendChild(li);
      return;
    }
    results.forEach(function (r) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.className = "sr__item"; a.href = r.c.url;
      var where = document.createElement("span"); where.className = "sr__where";
      where.textContent = r.c.page + (r.c.heading && r.c.heading !== r.c.page ? " · " + r.c.heading : "");
      var snip = document.createElement("span"); snip.className = "sr__snip";
      snip.textContent = snippet(r.c.text, query);
      var arrow = document.createElement("span"); arrow.className = "sr__arrow"; arrow.setAttribute("aria-hidden", "true"); arrow.textContent = "→";
      a.appendChild(where); a.appendChild(snip); a.appendChild(arrow);
      li.appendChild(a); listEl.appendChild(li);
    });
  }

  function run() {
    var query = input.value.trim();
    var my = ++runToken;
    if (!query) { show([], ""); return; }
    buildIndex().then(function () {
      if (my !== runToken) return;
      if (modelState === "ready" && vecsReady) {
        return embed([query]).then(function (v) {
          if (my !== runToken) return;
          show(rank(query, Float32Array.from(v[0])), query);
        }).catch(function () { if (my === runToken) show(rank(query, null), query); });
      }
      show(rank(query, null), query);
    });
  }

  function arm() { buildIndex(); startModel(); }

  /* ---------- open / close ---------- */
  var lastFocus = null;
  function isOpen() { return !root.hidden; }
  function open(q) {
    if (!isOpen()) {
      lastFocus = document.activeElement;
      root.hidden = false;
      document.documentElement.classList.add("sr-open");
      Array.prototype.forEach.call(openers, function (b) { b.setAttribute("aria-expanded", "true"); });
    }
    arm();
    if (typeof q === "string") { input.value = q; run(); }
    input.focus();
    input.select();
  }
  function close() {
    if (!isOpen()) return;
    root.hidden = true;
    document.documentElement.classList.remove("sr-open");
    Array.prototype.forEach.call(openers, function (b) { b.setAttribute("aria-expanded", "false"); });
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  Array.prototype.forEach.call(openers, function (b) {
    b.addEventListener("click", function () { isOpen() ? close() : open(); });
  });
  root.addEventListener("click", function (e) {
    if (e.target.closest("[data-sr-close]")) close();
    else if (e.target.closest(".sr__item")) close(); // same-page #links keep the overlay from lingering
  });
  window.addEventListener("pageshow", close);

  input.addEventListener("input", function () {
    arm();
    clearTimeout(timer);
    timer = setTimeout(run, 140);
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    run();
    var first = listEl.querySelector(".sr__item");
    if (first) { var href = first.getAttribute("href"); close(); window.location.href = href; }
  });

  // inside the overlay: ↓ from the field into the results, ↑ back, Esc closes, Tab stays inside
  root.addEventListener("keydown", function (e) {
    var items = Array.prototype.slice.call(listEl.querySelectorAll(".sr__item"));
    var i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown" && items.length && (document.activeElement === input || i >= 0)) {
      e.preventDefault(); items[Math.min(items.length - 1, i + 1)].focus();
    } else if (e.key === "ArrowUp" && i >= 0) {
      e.preventDefault(); (i === 0 ? input : items[i - 1]).focus();
    } else if (e.key === "Escape") {
      e.preventDefault(); close();
    } else if (e.key === "Tab") {
      var f = Array.prototype.slice.call(panel.querySelectorAll("input, button:not([hidden]), a[href]")).filter(function (n) { return n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  // "/" or Cmd/Ctrl+K opens it from anywhere
  document.addEventListener("keydown", function (e) {
    var t = e.target, tag = t && t.tagName, typing = tag === "INPUT" || tag === "TEXTAREA" || (t && t.isContentEditable);
    var cmdK = (e.metaKey || e.ctrlKey) && !e.altKey && (e.key === "k" || e.key === "K");
    var slash = e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !typing;
    if (cmdK || slash) { e.preventDefault(); isOpen() ? (cmdK ? close() : input.focus()) : open(); }
  });

  try {
    var q0 = new URLSearchParams(window.location.search).get("q");
    if (q0) open(q0);
  } catch (e) { /* ignore */ }
})();
