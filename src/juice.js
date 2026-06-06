// Visual game-feel: particle bursts, screen shake, and the prestige flash.
// Particles are cheap DOM nodes in #fx-layer (same layer as the float numbers).

let fxLayer = null;
let shakeEl = null;
let flashEl = null;
let shakeAmt = 0;

export function initJuice() {
  fxLayer = document.getElementById("fx-layer");
  shakeEl = document.getElementById("app");
  flashEl = document.getElementById("flash");
}

// Spawn a radial burst of particles at screen (x, y).
export function burst(x, y, {
  count = 10, color = "#56e39f", spread = 70, up = 18, size = 0, life = 700,
} = {}) {
  if (!fxLayer) return;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const ang = Math.random() * Math.PI * 2;
    const spd = 18 + Math.random() * spread;
    const dx = Math.cos(ang) * spd;
    const dy = Math.sin(ang) * spd - up;
    const s = size || 4 + Math.random() * 5;
    p.style.left = x + "px";
    p.style.top = y + "px";
    p.style.width = s + "px";
    p.style.height = s + "px";
    p.style.background = color;
    p.style.setProperty("--dx", dx.toFixed(1) + "px");
    p.style.setProperty("--dy", dy.toFixed(1) + "px");
    p.style.animationDuration = life + "ms";
    fxLayer.appendChild(p);
    // remove on animation end (fallback timeout in case the event is missed)
    const kill = () => p.remove();
    p.addEventListener("animationend", kill);
    setTimeout(kill, life + 120);
  }
}

// Request a screen shake (intensity in px). Strongest request wins.
export function shake(amount) {
  shakeAmt = Math.max(shakeAmt, amount);
}

// Call every frame with dt (seconds) to decay + apply the shake transform.
export function updateJuice(dt) {
  if (!shakeEl) return;
  if (shakeAmt <= 0.1) {
    if (shakeAmt !== 0) { shakeAmt = 0; shakeEl.style.transform = ""; }
    return;
  }
  shakeAmt -= shakeAmt * Math.min(1, dt * 9); // exponential decay
  const x = (Math.random() * 2 - 1) * shakeAmt;
  const y = (Math.random() * 2 - 1) * shakeAmt;
  shakeEl.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
}

// Full-screen radial flash (prestige). `tint` is a CSS color.
export function flash(tint = "rgba(140,90,255,0.55)") {
  if (!flashEl) return;
  flashEl.style.setProperty("--flash-tint", tint);
  flashEl.classList.remove("flash-go");
  // force reflow so re-adding the class restarts the animation
  void flashEl.offsetWidth;
  flashEl.classList.add("flash-go");
}
