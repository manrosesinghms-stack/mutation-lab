// Animated, selectable backdrop drawn on a 2D canvas behind the creature.
// Each theme = a 3-colour palette + drifting bokeh particles (+ optional stars).
// Cheap, themeable, and a foundation for the future Biomes feature.

let canvas, ctx, W = 0, H = 0;
let parts = [], stars = [], decor = [], shoot = null, t = 0;
let themeId = "aurora";
let reduceMotion = false;
export function setBackgroundReduceMotion(v) { reduceMotion = !!v; }

const THEMES = {
  aurora: { name: "Aurora", a: [16, 28, 40], b: [24, 64, 54], c: [46, 30, 80], p: "#56e39f", n: 40, stars: 0, kind: "ocean" },
  abyss: { name: "Deep Sea", a: [6, 12, 24], b: [10, 26, 46], c: [8, 36, 52], p: "#5aa0ff", n: 50, stars: 0, kind: "ocean" },
  cosmos: { name: "Cosmos", a: [8, 6, 18], b: [26, 14, 48], c: [12, 10, 34], p: "#b88cff", n: 28, stars: 130, kind: "space" },
  ember: { name: "Volcanic", a: [22, 8, 8], b: [46, 16, 8], c: [30, 10, 6], p: "#ff8a3d", n: 46, stars: 0, kind: "volcanic" },
  meadow: { name: "Meadow", a: [16, 28, 22], b: [28, 52, 34], c: [40, 58, 30], p: "#9be36b", n: 38, stars: 0, kind: "verdant" },
  voidd: { name: "Void", a: [3, 3, 6], b: [9, 5, 15], c: [4, 4, 9], p: "#8aa0b8", n: 16, stars: 170, kind: "void" },
  auto: { name: "Auto (cycle)", cycle: true },
};
const ORDER = ["aurora", "abyss", "cosmos", "ember", "meadow", "voidd"];

export const BACKGROUNDS = Object.keys(THEMES).map((id) => ({ id, name: THEMES[id].name }));
export function setBackground(id) { if (THEMES[id]) { themeId = id; seed(); } }
export function hasBackground(id) { return !!THEMES[id]; }

export function initBackground(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext("2d");
  resizeBackground();
  window.addEventListener("resize", resizeBackground);
  seed();
}

export function resizeBackground() {
  if (!canvas) return;
  const w = canvas.parentElement.clientWidth, h = canvas.parentElement.clientHeight;
  if (w < 2 || h < 2) return;
  W = canvas.width = w;
  H = canvas.height = h;
}

function seed() {
  const th = THEMES[themeId].cycle ? THEMES[ORDER[0]] : THEMES[themeId];
  const n = th.n || 36;
  parts = [];
  for (let i = 0; i < n; i++) {
    parts.push({
      x: Math.random() * (W || 1200), y: Math.random() * (H || 700),
      r: 24 + Math.random() * 70, a: 0.04 + Math.random() * 0.14,
      vx: (Math.random() - 0.5) * 0.5, vy: -0.2 - Math.random() * 0.5,
    });
  }
  const sc = THEMES[themeId].cycle ? 60 : (th.stars || 0);
  stars = [];
  for (let i = 0; i < sc; i++) {
    stars.push({ x: Math.random() * (W || 1200), y: Math.random() * (H || 700), r: Math.random() * 1.4 + 0.3, s: Math.random() * 6 });
  }
  seedDecor(THEMES[themeId].cycle ? "space" : th.kind);
}

// Biome-specific "living world" decor — cheap 2D, layered behind the bokeh.
function seedDecor(kind) {
  decor = []; shoot = null;
  const w = W || 1200, h = H || 700;
  const rnd = (a, b) => a + Math.random() * (b - a);
  if (kind === "ocean") {
    for (let i = 0; i < 26; i++) decor.push({ t: "bubble", x: rnd(0, w), y: rnd(0, h), r: rnd(1.5, 5), vy: rnd(12, 34), ph: rnd(0, 6.28) });
    for (let i = 0; i < 2; i++) decor.push({ t: "shadow", x: rnd(-300, w), y: rnd(h * 0.25, h * 0.7), w: rnd(280, 460), h: rnd(80, 140), vx: rnd(8, 18) * (Math.random() < .5 ? 1 : -1) });
  } else if (kind === "volcanic") {
    for (let i = 0; i < 34; i++) decor.push({ t: "ember", x: rnd(0, w), y: rnd(0, h), r: rnd(1, 3.5), vy: rnd(18, 46), wob: rnd(0, 6.28), fl: rnd(0, 6.28) });
    for (let i = 0; i < 22; i++) decor.push({ t: "ash", x: rnd(0, w), y: rnd(0, h), r: rnd(0.6, 1.6), vy: rnd(6, 16), vx: rnd(-6, 6) });
  } else if (kind === "verdant") {
    for (let i = 0; i < 30; i++) decor.push({ t: "spore", x: rnd(0, w), y: rnd(0, h), r: rnd(1, 3), vy: rnd(-6, 6), vx: rnd(-8, 8), ph: rnd(0, 6.28) });
    for (let i = 0; i < 3; i++) decor.push({ t: "shaft", x: rnd(w * 0.15, w * 0.85), wd: rnd(60, 140), a: rnd(0.03, 0.07) });
  } else if (kind === "space") {
    for (let i = 0; i < 3; i++) decor.push({ t: "nebula", x: rnd(0, w), y: rnd(0, h), r: rnd(180, 340), rot: rnd(0, 6.28), col: ["#b88cff", "#5aa0ff", "#ff6b9d"][i % 3] });
  } else if (kind === "void") {
    for (let i = 0; i < 4; i++) decor.push({ t: "tear", x: rnd(w * 0.1, w * 0.9), y: rnd(h * 0.1, h * 0.9), len: rnd(60, 180), ang: rnd(0, 6.28), ph: rnd(0, 6.28) });
    decor.push({ t: "lens", x: rnd(w * 0.3, w * 0.7), y: rnd(h * 0.3, h * 0.6), r: rnd(70, 130) });
  }
}

const lerpC = (c1, c2, k) => [c1[0] + (c2[0] - c1[0]) * k, c1[1] + (c2[1] - c1[1]) * k, c1[2] + (c2[2] - c1[2]) * k];
const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
function hexA(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// blend two themes' palettes (for auto-cycle)
function activeTheme() {
  const th = THEMES[themeId];
  if (!th.cycle) return th;
  const pos = (t * 0.03) % ORDER.length;
  const i = Math.floor(pos), k = pos - i;
  const A = THEMES[ORDER[i]], B = THEMES[ORDER[(i + 1) % ORDER.length]];
  return { a: lerpC(A.a, B.a, k), b: lerpC(A.b, B.b, k), c: lerpC(A.c, B.c, k), p: k < 0.5 ? A.p : B.p, stars: 0 };
}

export function renderBackground(dt) {
  if (!ctx || W < 2) return;
  t += dt;
  const th = activeTheme();
  // breathing radial gradient
  const k = (Math.sin(t * 0.12) + 1) / 2;
  const inner = lerpC(th.b, th.c, k);
  const cx = W * (0.5 + Math.sin(t * 0.05) * 0.13);
  const cy = H * (0.42 + Math.cos(t * 0.04) * 0.13);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.85);
  g.addColorStop(0, rgb(inner));
  g.addColorStop(1, rgb(th.a));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // stars
  if (stars.length) {
    for (const s of stars) {
      const tw = 0.35 + 0.65 * ((Math.sin(t * 2 + s.s) + 1) / 2);
      ctx.fillStyle = `rgba(255,255,255,${tw * 0.7})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
  }
  drawDecor(th, dt);
  // drifting bokeh
  ctx.globalCompositeOperation = "lighter";
  for (const p of parts) {
    p.x += p.vx * dt * 30; p.y += p.vy * dt * 30;
    if (p.y < -p.r) { p.y = H + p.r; p.x = Math.random() * W; }
    if (p.x < -p.r) p.x = W + p.r; if (p.x > W + p.r) p.x = -p.r;
    const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    pg.addColorStop(0, hexA(th.p, p.a));
    pg.addColorStop(1, hexA(th.p, 0));
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

function drawDecor(th, dt) {
  if (!decor.length) return;
  const m = reduceMotion ? 0.25 : 1;
  for (const d of decor) {
    if (d.t === "bubble") {
      d.y -= d.vy * dt * m; d.x += Math.sin(t * 1.5 + d.ph) * 0.4;
      if (d.y < -8) { d.y = H + 8; d.x = Math.random() * W; }
      ctx.strokeStyle = "rgba(180,220,255,0.22)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(220,240,255,0.10)"; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    } else if (d.t === "shadow") {
      d.x += d.vx * dt * m;
      if (d.vx > 0 && d.x - d.w > W) d.x = -d.w; if (d.vx < 0 && d.x + d.w < 0) d.x = W + d.w;
      const sg = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.w);
      sg.addColorStop(0, "rgba(0,8,16,0.5)"); sg.addColorStop(1, "rgba(0,8,16,0)");
      ctx.fillStyle = sg; ctx.save(); ctx.translate(d.x, d.y); ctx.scale(1, d.h / d.w);
      ctx.beginPath(); ctx.arc(0, 0, d.w, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    } else if (d.t === "ember") {
      d.y -= d.vy * dt * m; d.x += Math.sin(t * 2 + d.wob) * 0.6;
      if (d.y < -6) { d.y = H + 6; d.x = Math.random() * W; }
      const fl = 0.5 + 0.5 * Math.sin(t * 6 + d.fl);
      ctx.fillStyle = `rgba(255,${140 + (fl * 80) | 0},60,${0.5 + fl * 0.4})`;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    } else if (d.t === "ash") {
      d.y += d.vy * dt * m; d.x += d.vx * dt * m;
      if (d.y > H + 4) { d.y = -4; d.x = Math.random() * W; }
      ctx.fillStyle = "rgba(40,32,30,0.5)"; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    } else if (d.t === "spore") {
      d.y += d.vy * dt * m; d.x += (d.vx + Math.sin(t + d.ph) * 4) * dt * m;
      if (d.y < -6) d.y = H + 6; if (d.y > H + 6) d.y = -6; if (d.x < -6) d.x = W + 6; if (d.x > W + 6) d.x = -6;
      ctx.fillStyle = "rgba(190,240,150,0.5)"; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    } else if (d.t === "shaft") {
      const sg = ctx.createLinearGradient(d.x, 0, d.x, H);
      sg.addColorStop(0, `rgba(200,255,180,${d.a + 0.02 * Math.sin(t * 0.5 + d.x)})`); sg.addColorStop(1, "rgba(200,255,180,0)");
      ctx.fillStyle = sg; ctx.beginPath();
      ctx.moveTo(d.x - d.wd * 0.3, 0); ctx.lineTo(d.x + d.wd * 0.3, 0); ctx.lineTo(d.x + d.wd, H); ctx.lineTo(d.x - d.wd, H); ctx.closePath(); ctx.fill();
    } else if (d.t === "nebula") {
      d.rot += dt * 0.04 * m;
      const ng = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
      ng.addColorStop(0, hexA(d.col, 0.10)); ng.addColorStop(0.6, hexA(d.col, 0.04)); ng.addColorStop(1, hexA(d.col, 0));
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot); ctx.scale(1, 0.6);
      ctx.fillStyle = ng; ctx.beginPath(); ctx.arc(0, 0, d.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    } else if (d.t === "tear") {
      const a = 0.25 + 0.35 * Math.abs(Math.sin(t * 0.6 + d.ph));
      ctx.strokeStyle = `rgba(200,160,255,${a})`; ctx.lineWidth = 1.4;
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.ang + Math.sin(t * 0.3 + d.ph) * 0.2);
      ctx.beginPath(); ctx.moveTo(-d.len / 2, 0);
      for (let s = -d.len / 2; s < d.len / 2; s += 8) ctx.lineTo(s, (Math.random() - 0.5) * 6);
      ctx.lineTo(d.len / 2, 0); ctx.stroke(); ctx.restore();
    } else if (d.t === "lens") {
      const lg = ctx.createRadialGradient(d.x, d.y, d.r * 0.4, d.x, d.y, d.r);
      lg.addColorStop(0, "rgba(0,0,0,0)"); lg.addColorStop(0.7, "rgba(120,80,200,0.10)"); lg.addColorStop(0.85, "rgba(180,140,255,0.22)"); lg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    }
  }
  // occasional shooting star in space
  if (th && (themeId === "cosmos" || THEMES[themeId].cycle) && !reduceMotion) {
    if (!shoot && Math.sin(t * 0.7) > 0.9998) shoot = { x: Math.random() * W, y: Math.random() * H * 0.5, vx: 380, vy: 120, life: 1 };
    if (shoot) {
      shoot.x += shoot.vx * dt; shoot.y += shoot.vy * dt; shoot.life -= dt * 1.2;
      if (shoot.life <= 0 || shoot.x > W) shoot = null;
      else {
        ctx.strokeStyle = `rgba(255,255,255,${shoot.life * 0.8})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(shoot.x - shoot.vx * 0.06, shoot.y - shoot.vy * 0.06); ctx.stroke();
      }
    }
  }
}
