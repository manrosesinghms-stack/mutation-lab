# 🌐 Mutation Lab — Optional Cloud Backend

The game is **fully playable offline** with a local daily ladder and export/import
saves. Connecting a backend adds two things:

1. **Online Daily Monster leaderboard** — everyone on the same daily seed competes
   on Build Score.
2. **Cloud save** — move your run between devices with a short sync code.

The client (`src/net.js`) is backend-agnostic. It calls a tiny REST API; implement
the four endpoints below on any host and point the game at it.

## Enabling it (client side)
Any one of:
- **Settings → Online**: paste the API base URL, press *Connect*.
- `?backend=https://your-api.example` in the URL (persists to localStorage).
- Edit `index.html`: `window.MLAB_BACKEND = { url: "https://your-api.example" }`.

Leave it blank for offline mode. All calls are time-limited and fail silently to
local-only, so a down backend never breaks the game.

## REST contract
Base URL = whatever you configure. All JSON. **CORS must allow the game's origin**
(`Access-Control-Allow-Origin`).

| Method & path | Body | Returns |
|---|---|---|
| `POST /score` | `{ seed, score, biomass, name, dna, ts }` | `{ ok: true }` |
| `GET /leaderboard?seed=SEED&limit=N` | — | `[ { name, score, biomass, dna }, … ]` (desc by score) or `{ scores: [...] }` |
| `PUT /save/:code` | `{ data }` (opaque base64 string) | `{ ok: true }` |
| `GET /save/:code` | — | `{ data }` |

Notes:
- `seed` is the integer daily seed (`todaySeed()` = days since epoch).
- `score` is the run's Build Score; keep the **best** per (seed, name/ip).
- `data` is an opaque base64 save blob — the server never needs to parse it.
- `dna` is the shareable creature code (optional; lets the board show/load builds).

## Reference backend A — Cloudflare Worker + KV (free tier, ~5 min)
Create a Worker, bind a KV namespace as `MLAB`, and deploy this:

```js
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", ...cors } });

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(req.url);
    const p = url.pathname.replace(/\/$/, "");

    if (p === "/score" && req.method === "POST") {
      const e = await req.json();
      const seed = String(e.seed | 0), name = String(e.name || "Anon").slice(0, 24);
      if (!Number.isFinite(e.score)) return json({ error: "bad score" }, 400);
      const key = `lb:${seed}`;
      const board = (await env.MLAB.get(key, "json")) || [];
      const prev = board.find((r) => r.name === name);
      const row = { name, score: e.score | 0, biomass: e.biomass || 0, dna: String(e.dna || "").slice(0, 512) };
      if (!prev) board.push(row); else if (row.score > prev.score) Object.assign(prev, row);
      board.sort((a, b) => b.score - a.score);
      await env.MLAB.put(key, JSON.stringify(board.slice(0, 100)), { expirationTtl: 60 * 60 * 24 * 3 });
      return json({ ok: true });
    }
    if (p === "/leaderboard" && req.method === "GET") {
      const seed = String((url.searchParams.get("seed") | 0));
      const limit = Math.min(100, (url.searchParams.get("limit") | 0) || 10);
      const board = (await env.MLAB.get(`lb:${seed}`, "json")) || [];
      return json(board.slice(0, limit));
    }
    const m = p.match(/^\/save\/([\w-]{4,40})$/);
    if (m) {
      const key = `save:${m[1]}`;
      if (req.method === "PUT") { const { data } = await req.json(); await env.MLAB.put(key, String(data).slice(0, 200000), { expirationTtl: 60 * 60 * 24 * 90 }); return json({ ok: true }); }
      if (req.method === "GET") { const data = await env.MLAB.get(key); return data ? json({ data }) : json({ error: "not found" }, 404); }
    }
    return json({ error: "not found" }, 404);
  },
};
```

## Reference backend B — Supabase (Postgres + PostgREST)
- Table `daily_scores(seed int, name text, score int, biomass float8, dna text, updated_at timestamptz)`, unique on `(seed, name)`.
- Table `saves(code text primary key, data text, updated_at timestamptz)`.
- Use a thin Edge Function (or PostgREST + RLS) to expose the same four routes, or
  adapt `net.js` to call PostgREST directly (`/rest/v1/daily_scores?...`). Enable
  RLS with insert/select policies; expose only the anon key.

## Security / anti-cheat (read before launch)
- This is a **client-authoritative** game: scores are submitted by the browser, so
  a determined user can forge them. That's normal for casual incremental ladders.
- Hardening options: rate-limit by IP (Cloudflare rules), cap implausible scores
  server-side, sign requests with a rotating token, or recompute Build Score from
  the submitted `dna` server-side before trusting it.
- Cloud-save codes are capability URLs — anyone with the code can read/overwrite
  that slot. Use long random codes (the client generates `MLAB-XXXX-XXXX`) and a
  TTL (the reference Worker expires saves after 90 days).
- Validate/limit body sizes (done in the reference Worker) to avoid abuse.
