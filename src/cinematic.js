// Full-screen cinematic beats — the "loot drop" moments (legendary evolution,
// Speciation, boss). A vignette darkens, big gradient text slams in with a glow,
// holds, then fades. Pair with creature.cinematicPulse() + audio.playRoar().

let el, textEl, timer;

export function initCinematic() {
  el = document.getElementById("cinematic");
  textEl = document.getElementById("cinematic-text");
}

export function playCinematic(title, subtitle, color = "#b88cff") {
  if (!el) return;
  textEl.innerHTML =
    `<div class="cine-title" style="--cc:${color}">${title}</div>` +
    (subtitle ? `<div class="cine-sub">${subtitle}</div>` : "");
  el.classList.remove("hidden", "cine-go");
  void el.offsetWidth; // restart the animation
  el.classList.add("cine-go");
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.add("hidden"), 2700);
}
