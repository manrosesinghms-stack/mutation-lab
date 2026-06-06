// Animated, selectable backdrop drawn on a 2D canvas behind the creature.
// Each theme = a 3-colour palette + drifting bokeh particles (+ optional stars).
// Cheap, themeable, and a foundation for the future Biomes feature.

let canvas, ctx, W = 0, H = 0;
let parts = [], stars = [], t = 0;
let themeId = "aurora";

const THEMES = {
  aurora: { name: "Aurora", a: [16, 28, 40], b: [24, 64, 54], c: [46, 30, 80], p: "#56e39f", n: 40, stars: 0 },
  abyss: { name: "Deep Sea", a: [6, 12, 24], b: [10, 26, 46], c: [8, 36, 52], p: "#5aa0ff", n: 50, stars: 0 },
  cosmos: { name: "Cosmos", a: [8, 6, 18], b: [26, 14, 48], c: [12, 10, 34], p: "#b88cff", n: 28, stars: 130 },
  ember: { name: "Volcanic", a: [22, 8, 8], b: [46, 16, 8], c: [30, 10, 6], p: "#ff8a3d", n: 46, stars: 0 },
  meadow: { name: "Meadow", a: [16, 28, 22], b: [28, 52, 34], c: [40, 58, 30], p: "#9be36b", n: 38, stars: 0 },
  voidd: { name: "Void", a: [3, 3, 6], b: [9, 5, 15], c: [4, 4, 9], p: "#8aa0b8", n: 16, stars: 170 },
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
