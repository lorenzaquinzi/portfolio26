// Lorenza Quinzi — on-device search model (runs in a Web Worker so typing never janks).
//
// Loads a small open-source sentence-embedding model (all-MiniLM-L6-v2, quantized, ~23 MB) with
// Transformers.js from a CDN. The browser caches it, so it downloads once. Nothing you type is
// sent anywhere: embeddings are computed here, in your browser.
//
// Messages in:  { cmd: "init" } and { cmd: "embed", id, texts: [string] }
// Messages out: { type: "progress", pct } / { type: "ready" } / { type: "embedded", id, vecs } / { type: "error", message }

import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js";

env.allowLocalModels = false; // never probe our own server for /models/...

var extractor = null;
var loading = null;

function init() {
  if (loading) return loading;
  var files = {};
  loading = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
    dtype: "q8",
    progress_callback: function (p) {
      if (p && p.status === "progress" && p.file) {
        files[p.file] = { loaded: p.loaded || 0, total: p.total || 0 };
        var l = 0, t = 0;
        for (var f in files) { l += files[f].loaded; t += files[f].total; }
        if (t) self.postMessage({ type: "progress", pct: Math.min(99, Math.round((l / t) * 100)) });
      }
    }
  }).then(function (p) {
    extractor = p;
    self.postMessage({ type: "ready" });
  }).catch(function (e) {
    loading = null;
    self.postMessage({ type: "error", message: String((e && e.message) || e) });
  });
  return loading;
}

self.onmessage = function (ev) {
  var m = ev.data || {};
  if (m.cmd === "init") { init(); return; }
  if (m.cmd === "embed") {
    init().then(function () {
      if (!extractor) return;
      return extractor(m.texts, { pooling: "mean", normalize: true }).then(function (t) {
        self.postMessage({ type: "embedded", id: m.id, vecs: t.tolist() });
      });
    }).catch(function (e) {
      self.postMessage({ type: "error", message: String((e && e.message) || e), id: m.id });
    });
  }
};
