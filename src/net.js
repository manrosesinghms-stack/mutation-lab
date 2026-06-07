// src/net.js — OPTIONAL cloud backend for online daily leaderboards + cloud save.
//
// 100% optional: with no backend configured the game runs fully offline using the
// local daily ladder and the export/import save string. Point it at a backend in
// any one of these ways:
//   • window.MLAB_BACKEND = { url: "https://your-api.example" }  (edit index.html)
//   • ?backend=https://your-api.example   (URL param — persisted to localStorage)
//   • Settings → Online → paste the URL
//
// The REST contract every backend must implement is documented in docs/BACKEND.md.
// All calls are no-throw, time-limited, and degrade silently to local-only.

const LS_KEY = "mlab_backend";

function fromParam() {
  try {
    const u = new URLSearchParams(location.search).get("backend");
    if (u) localStorage.setItem(LS_KEY, u);
    return u;
  } catch (e) { return null; }
}
function fromStore() { try { return localStorage.getItem(LS_KEY); } catch (e) { return null; } }

let _url = (typeof window !== "undefined" && window.MLAB_BACKEND && window.MLAB_BACKEND.url) || fromParam() || fromStore() || null;

export function backendOn() { return !!_url; }
export function backendUrl() { return _url || ""; }
export function setBackendUrl(u) {
  _url = (u || "").trim().replace(/\/$/, "") || null;
  try { _url ? localStorage.setItem(LS_KEY, _url) : localStorage.removeItem(LS_KEY); } catch (e) {}
  return _url;
}

async function jfetch(path, opts = {}, ms = 6000) {
  if (!_url) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(_url + path, {
      ...opts, signal: ctrl.signal,
      headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    return ct.includes("json") ? await res.json() : await res.text();
  } catch (e) { return null; } finally { clearTimeout(timer); }
}

// ---- Daily leaderboard ----
export async function submitDailyScore(entry) {
  if (!backendOn()) return false;
  return !!(await jfetch("/score", { method: "POST", body: JSON.stringify(entry) }));
}
export async function fetchDailyLeaderboard(seed, limit = 10) {
  if (!backendOn()) return null;
  const r = await jfetch(`/leaderboard?seed=${encodeURIComponent(seed)}&limit=${limit}`);
  if (Array.isArray(r)) return r;
  if (r && Array.isArray(r.scores)) return r.scores;
  return null;
}

// ---- Cloud save (cross-device via a short code) ----
export async function cloudPutSave(code, data) {
  if (!backendOn()) return false;
  return !!(await jfetch(`/save/${encodeURIComponent(code)}`, { method: "PUT", body: JSON.stringify({ data }) }));
}
export async function cloudGetSave(code) {
  if (!backendOn()) return null;
  const r = await jfetch(`/save/${encodeURIComponent(code)}`);
  if (r && typeof r.data !== "undefined") return r.data;
  return typeof r === "string" ? r : null;
}
// A friendly random sync code (e.g. "MLAB-7QK2-9F3X").
export function newSyncCode() {
  const a = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const blk = () => Array.from({ length: 4 }, () => a[(Math.random() * a.length) | 0]).join("");
  return `MLAB-${blk()}-${blk()}`;
}
