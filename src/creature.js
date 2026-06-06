// The 3D creature. A low-poly deformed organism that pulses on click, slowly
// rotates, jiggles like jelly, grows with biomass, and sprouts detailed,
// animated modular parts (eyes that look around, a chomping maw, swaying
// tentacles, clustered spikes, leafy fronds) as the player drafts mutations.

import * as THREE from "three";

let renderer, scene, camera, organism, light;
let canvas;
let punch = 0;          // transient squash impulse from clicks
let targetScale = 1;    // grows with biomass
let currentScale = 1;
let onClickCb = null;
let raycaster, pointer;

// mutation visuals
let partsGroup;
let partIndex = 0;      // how many parts attached (also the anchor seed)
let hueShift = 0;       // accumulates per mutation -> creature drifts color
let stress = 0;         // 0..1 metabolic stress (near the production wall)
let stressTarget = 0;
let engorge = 0;        // transient swell from Digest
let activeBloom = null; // the current Mitogen Bloom mesh (clickable)
let onBloomCb = null;
// drag-to-orbit
let dragging = false, dragMoved = false, dragX = 0, dragY = 0;
let orbitYaw = 0, orbitPitch = 0, autoYaw = 0;
let skin = { h: 0.42, s: 0.62, l: 0.55, metal: 0.1, rough: 0.32, emi: 0.55 };
export function setSkin(p) { if (p) skin = { ...skin, ...p }; }
const UP = new THREE.Vector3(0, 1, 0);

// Drive the "about to pop" look: desaturate + tremble + over-glow. 0..1.
export function setStress(t) { stressTarget = Math.max(0, Math.min(1, t || 0)); }

let reduceMotion = false;
export function setReduceMotion(v) { reduceMotion = !!v; }

// rare run variants (Golden / Crystal / Void) — full creature reskins
let variant = null;
const VARIANTS = {
  golden: { color: 0xffd76b, emissive: 0x4a3500, ei: 0.6, metal: 0.9, rough: 0.25 },
  crystal: { color: 0x9fe8ff, emissive: 0x123048, ei: 0.55, metal: 0.6, rough: 0.12 },
  void: { color: 0x161028, emissive: 0x7a2aff, ei: 1.2, metal: 0.3, rough: 0.4 },
};
export function setVariant(v) { variant = VARIANTS[v] ? v : null; }

export function setBloomCallback(cb) { onBloomCb = cb; }
export function hasBloom() { return !!activeBloom; }
export function engorgePop() { engorge = 1; }

// Spawn a golden Mitogen Bloom on the body — click it for a frenzy buff.
export function spawnBloom() {
  if (!partsGroup || activeBloom) return;
  const dir = anchorDir(Math.floor(Math.random() * 32) + 1);
  const g = new THREE.Group();
  g.userData.isBloom = true;
  g.userData.born = 0;
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.2, 1),
    new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffaa22, emissiveIntensity: 1.5, flatShading: true }));
  g.add(core);
  g.position.copy(dir).multiplyScalar(surfaceRadius(dir) + 0.12);
  partsGroup.add(g);
  activeBloom = g;
}
function removeBloom() {
  if (activeBloom) { partsGroup.remove(activeBloom); activeBloom = null; }
}

const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// Layered pseudo-noise over a unit direction — the SAME field used to deform the
// body, so we can also query it to place parts exactly on the lumpy surface.
function bumpAt(n) {
  return (
    0.18 * Math.sin(n.x * 4.0 + n.y * 2.0) +
    0.12 * Math.sin(n.y * 6.0 + n.z * 3.0) +
    0.08 * Math.cos(n.z * 8.0 + n.x * 5.0)
  );
}
function surfaceRadius(dir) {
  return 1 + bumpAt(dir);
}

// Evenly-distributed direction on a sphere (fibonacci) for socket placement.
function anchorDir(i) {
  const ga = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (i % 32) / 31 * 2;       // -1..1
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = ga * i;
  return new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).normalize();
}

function makeOrganismGeometry(detail = 3, radius = 1) {
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    v.addScaledVector(n, bumpAt(n));
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

// ---- Creature Habitat: a lab-tank / biome environment instead of a void ----
// floor platform + atmospheric depth fog + drifting biome motes (bubbles, embers,
// spores, plankton…). Lives in the scene (not on the organism) so it stays put
// while the creature spins, giving real parallax + a sense of place.
let habitatGroup, floorMesh, motes, moteSpeeds, moteCount = 64;
const HABITATS = {
  ocean:    { fog: 0x0a2236, floor: 0x0d2f47, mote: 0x6fd6ff },
  volcanic: { fog: 0x1f0a06, floor: 0x301008, mote: 0xff8a3d },
  verdant:  { fog: 0x0b2011, floor: 0x14331c, mote: 0x9be36b },
  glacial:  { fog: 0x0e1f2b, floor: 0x163240, mote: 0xcdeeff },
  abyssal:  { fog: 0x060f1f, floor: 0x0a1a33, mote: 0x8a6bff },
  voidrift: { fog: 0x110824, floor: 0x1c0d34, mote: 0xc69cff },
  _default: { fog: 0x0a141f, floor: 0x102233, mote: 0x66ffcc },
};
let habitat = HABITATS._default;

function buildHabitat() {
  habitatGroup = new THREE.Group();
  scene.add(habitatGroup);

  // depth fog — far edges of the tank dissolve into the gloom
  scene.fog = new THREE.Fog(habitat.fog, 9, 30);

  // floor platform the creature rests above
  floorMesh = new THREE.Mesh(
    new THREE.CircleGeometry(16, 56),
    new THREE.MeshStandardMaterial({ color: habitat.floor, emissive: habitat.floor, emissiveIntensity: 0.35, roughness: 0.95, metalness: 0.0 }));
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = -2.3;
  habitatGroup.add(floorMesh);

  // a soft glowing pad directly under the creature (a specimen spotlight)
  const pad = new THREE.Mesh(
    new THREE.RingGeometry(1.4, 2.4, 56),
    new THREE.MeshBasicMaterial({ color: habitat.mote, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = -2.28;
  habitatGroup.add(pad);

  // drifting ambient motes (bubbles / embers / spores depending on biome)
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(moteCount * 3);
  moteSpeeds = new Float32Array(moteCount);
  for (let i = 0; i < moteCount; i++) {
    const a = (i * 2.399963) % (Math.PI * 2), r = 1.5 + (i % 9) * 1.2;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = -2.2 + ((i * 0.137) % 1) * 8;
    pos[i * 3 + 2] = Math.sin(a) * r;
    moteSpeeds[i] = 0.18 + ((i * 0.061) % 1) * 0.5;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  motes = new THREE.Points(geo, new THREE.PointsMaterial({
    color: habitat.mote, size: 0.09, sizeAttenuation: true,
    transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  habitatGroup.add(motes);
}

// Recolour the habitat to match the run's biome.
export function setHabitat(biomeId) {
  habitat = HABITATS[biomeId] || HABITATS._default;
  if (scene && scene.fog) scene.fog.color.setHex(habitat.fog);
  if (floorMesh) { floorMesh.material.color.setHex(habitat.floor); floorMesh.material.emissive.setHex(habitat.floor); }
  if (motes) motes.material.color.setHex(habitat.mote);
}

function updateHabitat(dt, elapsed) {
  if (!motes) return;
  const p = motes.geometry.attributes.position;
  const arr = p.array;
  const rise = reduceMotion ? 0.25 : 1;
  for (let i = 0; i < moteCount; i++) {
    let y = arr[i * 3 + 1] + moteSpeeds[i] * dt * rise;
    if (y > 6) { y = -2.2; }
    arr[i * 3 + 1] = y;
    if (!reduceMotion) arr[i * 3] += Math.sin(elapsed * 0.5 + i) * dt * 0.05;
  }
  p.needsUpdate = true;
  if (habitatGroup && !reduceMotion) habitatGroup.rotation.y += dt * 0.01;
}

export function initCreature(canvasEl, onClick) {
  canvas = canvasEl;
  onClickCb = onClick;

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 4.2);

  // lights — key + warm fill + cool rim for a gooey low-poly look
  scene.add(new THREE.AmbientLight(0x35506b, 1.0));
  light = new THREE.DirectionalLight(0xffffff, 1.5);
  light.position.set(3, 4, 5);
  scene.add(light);
  const fill = new THREE.DirectionalLight(0xffd9a0, 0.5);
  fill.position.set(-2, 1, 4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xb88cff, 1.0);
  rim.position.set(-4, -2, -3);
  scene.add(rim);
  glowLight = new THREE.PointLight(0x66ffcc, 0.6, 14);
  glowLight.position.set(0, 0, 3);
  scene.add(glowLight);

  // the organism
  const geo = makeOrganismGeometry(3, 1);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x56e39f,
    roughness: 0.32,
    metalness: 0.1,
    flatShading: true,
    emissive: 0x0a3d2a,
    emissiveIntensity: 0.55,
  });
  organism = new THREE.Mesh(geo, mat);
  scene.add(organism);

  // organic subsurface-glow rim — a fresnel shell sharing the body geometry.
  // Light wraps the silhouette like a wet, living membrane (approximated SSS).
  rimMat = new THREE.ShaderMaterial({
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(0x66ffcc) },
      uPower: { value: 2.6 },
      uIntensity: { value: 0.6 },
    },
    vertexShader: `
      varying vec3 vN; varying vec3 vView;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0);
        vView = normalize(-mv.xyz); vN = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uPower; uniform float uIntensity;
      varying vec3 vN; varying vec3 vView;
      void main(){ float f = pow(1.0 - max(dot(normalize(vN), normalize(vView)), 0.0), uPower);
        gl_FragColor = vec4(uColor * f * uIntensity, f * uIntensity); }`,
  });
  rimMesh = new THREE.Mesh(geo, rimMat);
  organism.add(rimMesh);

  buildHabitat();

  // parts ride on the organism so they spin/scale with it
  partsGroup = new THREE.Group();
  organism.add(partsGroup);
  applyHue();

  // click + drag-to-orbit handling
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);

  resize();
  window.addEventListener("resize", resize);
}

function bloomAncestor(obj) {
  let o = obj;
  while (o) { if (o.userData && o.userData.isBloom) return o; o = o.parent; }
  return null;
}

function onPointerDown(e) {
  dragging = true;
  dragMoved = false;
  dragX = e.clientX;
  dragY = e.clientY;
}

function onPointerMove(e) {
  if (!dragging) return;
  const dx = e.clientX - dragX, dy = e.clientY - dragY;
  if (Math.abs(dx) + Math.abs(dy) > 4) dragMoved = true; // it's an orbit, not a tap
  orbitYaw += dx * 0.008;
  orbitPitch = Math.max(-1.2, Math.min(1.2, orbitPitch + dy * 0.008));
  dragX = e.clientX;
  dragY = e.clientY;
}

function onPointerUp(e) {
  if (!dragging) return;
  dragging = false;
  if (dragMoved) return; // dragged to orbit — not a click
  // a tap: raycast at the release point
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(organism, true);
  if (hit.length === 0) return;
  const bloom = bloomAncestor(hit[0].object);
  if (bloom) {
    removeBloom();
    if (onBloomCb) onBloomCb(e.clientX, e.clientY);
    return;
  }
  punch = 1; // trigger squash
  if (onClickCb) onClickCb(e.clientX, e.clientY);
}

export function resize() {
  if (!renderer) return;
  const w = canvas.clientWidth || canvas.parentElement.clientWidth;
  const h = canvas.clientHeight || canvas.parentElement.clientHeight;
  // ignore degenerate sizes (e.g. clientHeight reports 0 on a backgrounded tab)
  if (w < 2 || h < 2) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

// Map biomass -> a gentle size so growth is visible but never fills the screen.
export function setGrowthFromBiomass(biomass) {
  const t = Math.log10(Math.max(1, biomass + 1));
  targetScale = 0.8 + Math.min(t * 0.12, 1.4); // ~0.8 .. 2.2
}

// Called every frame.
export function renderCreature(dt, elapsed) {
  if (!renderer) return;

  // ease scale toward target
  currentScale += (targetScale - currentScale) * Math.min(1, dt * 3);

  // dolly the camera back as the organism grows so it stays framed — extra
  // pullback so parts sticking out (spikes/tentacles) never clip the top edge
  cineZoom += (0 - cineZoom) * Math.min(1, dt * 1.6); // cinematic push-in decay
  const targetZ = 4.6 + (currentScale - 1) * 4.2 - cineZoom;
  camera.position.z += (targetZ - camera.position.z) * Math.min(1, dt * 2.5);
  camera.lookAt(0, 0, 0);

  // squash impulse decays; gives a juicy click "pop"
  punch += (0 - punch) * Math.min(1, dt * 8);
  const squash = 1 + punch * 0.18;
  const stretch = 1 - punch * 0.12;

  // base scale + breathing + per-axis jelly jiggle
  const breathe = 1 + Math.sin(elapsed * 1.6) * 0.02;
  organism.scale.set(
    currentScale * squash * breathe * (1 + Math.sin(elapsed * 2.3) * 0.022),
    currentScale * stretch * breathe * (1 + Math.sin(elapsed * 1.9 + 2) * 0.022),
    currentScale * squash * breathe * (1 + Math.sin(elapsed * 2.6 + 4) * 0.022)
  );
  // Digest swell
  engorge += (0 - engorge) * Math.min(1, dt * 2);
  if (engorge > 0.001) organism.scale.multiplyScalar(1 + engorge * 0.45);
  // auto-spin (paused while dragging) + manual orbit offset
  if (!dragging) autoYaw += dt * 0.35;
  organism.rotation.y = autoYaw + orbitYaw;
  organism.rotation.x = Math.sin(elapsed * 0.4) * 0.12 + orbitPitch;

  // metabolic stress: desaturate, tremble, and over-glow as the wall approaches
  stress += (stressTarget - stress) * Math.min(1, dt * 4);
  {
    if (variant && VARIANTS[variant]) {
      const V = VARIANTS[variant];
      organism.material.color.setHex(V.color);
      organism.material.emissive.setHex(V.emissive);
      organism.material.emissiveIntensity = V.ei + stress * 0.5;
      organism.material.metalness = V.metal;
      organism.material.roughness = V.rough;
    } else {
      const h = (skin.h + hueShift) % 1;
      organism.material.color.setHSL(h, skin.s * (1 - 0.7 * stress), skin.l + 0.05 * stress);
      organism.material.emissiveIntensity = skin.emi + stress * 1.3;
      organism.material.metalness = skin.metal;
      organism.material.roughness = skin.rough;
    }
    // wet membrane over-glows as the creature strains toward the wall
    if (rimMat) rimMat.uniforms.uIntensity.value = 0.6 + stress * 1.1 + Math.sin(elapsed * 1.6) * 0.05;
    // gentler tremble; fully off under reduce-motion (colour/glow still convey stress)
    const tr = reduceMotion ? 0 : stress * 0.016;
    organism.position.set(
      tr > 0.0001 ? (Math.random() * 2 - 1) * tr : 0,
      tr > 0.0001 ? (Math.random() * 2 - 1) * tr : 0,
      0,
    );
  }

  // shared gaze + chomp phases so all eyes/maws move together (reads as one mind)
  const gazeX = Math.sin(elapsed * 0.6) * 0.28;
  const gazeZ = Math.cos(elapsed * 0.45) * 0.28;
  // periodic blink — every ~4.3s the eyes snap shut for a beat (alive, not static)
  let blinkAmt = 0;
  if (!reduceMotion) {
    const bp = elapsed % 4.3;
    if (bp < 0.14) blinkAmt = 1 - Math.abs(bp - 0.07) / 0.07;
  }

  if (partsGroup) {
    for (const p of partsGroup.children) {
      // emerge: grow + push out of the skin (juicy overshoot)
      if (p.userData.growT < 1) {
        p.userData.growT = Math.min(1, p.userData.growT + dt * 2.0);
        p.scale.setScalar(Math.max(0.0001, easeOutBack(p.userData.growT) * p.userData.targetScale));
        if (p.userData.fromPos && p.userData.toPos) {
          p.position.lerpVectors(p.userData.fromPos, p.userData.toPos, p.userData.growT);
        }
      }
      if (p.userData.sway) {
        p.rotation.z = p.userData.baseRotZ + Math.sin(elapsed * 2 + p.userData.seed) * 0.18;
      }
      if (p.userData.look) {
        p.userData.look.rotation.x = gazeX;
        p.userData.look.rotation.z = gazeZ;
        if (p.userData.growT >= 1) p.scale.y = p.userData.targetScale * (1 - blinkAmt * 0.85);
      }
      if (p.userData.jaw) {
        const open = Math.max(0, Math.sin(elapsed * 1.1 + p.userData.seed)) * 0.5;
        p.userData.jaw.upper.rotation.x = -open;
        p.userData.jaw.lower.rotation.x = open;
      }
    }
  }

  // animate the Mitogen Bloom (pulse + spin); auto-despawn if ignored
  if (activeBloom) {
    activeBloom.userData.born += dt;
    activeBloom.scale.setScalar(1 + Math.sin(elapsed * 6) * 0.18);
    activeBloom.rotation.y += dt * 2.5;
    if (activeBloom.userData.born > 12) removeBloom();
  }

  updateHabitat(dt, elapsed);

  renderer.render(scene, camera);
}

// ---- mutation visuals ----
function applyHue() {
  if (!organism) return;
  const h = (skin.h + hueShift) % 1;
  organism.material.color.setHSL(h, skin.s, skin.l);
  organism.material.emissive.setHSL(h, skin.s, 0.12);
}

const glossy = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.18, metalness: 0.05, ...extra });
const matte = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.5, flatShading: true, ...extra });

// ---- detailed part builders ----

// a tuned iris palette — varied but always reads nicely (no muddy random hues)
const IRIS_PALETTE = [0x39d0c6, 0xffb13d, 0xb86bff, 0x4aa3ff, 0x5be36b, 0xff6b9d];

function buildEye() {
  const g = new THREE.Group();
  // big, expressive, bulging eyeball — the most shareable feature
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.24, 22, 22), glossy(0xf7f8fc));
  ball.scale.set(1, 0.92, 1);
  g.add(ball);
  // a moving "look" group (iris + pupil + glints) so the eye can gaze around
  const look = new THREE.Group();
  const c = IRIS_PALETTE[Math.floor(Math.random() * IRIS_PALETTE.length)];
  const iris = new THREE.Mesh(new THREE.SphereGeometry(0.135, 18, 18),
    new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.45, roughness: 0.22 }));
  iris.position.y = 0.155;
  iris.scale.set(1, 0.5, 1);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 14), glossy(0x07070d));
  pupil.position.y = 0.205;
  // two glints (big + small) for that lively cartoon sparkle
  const litMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1 });
  const glint = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), litMat);
  glint.position.set(0.07, 0.225, 0.06);
  const glint2 = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), litMat);
  glint2.position.set(-0.05, 0.2, 0.07);
  look.add(iris, pupil, glint, glint2);
  g.add(look);
  g.userData.look = look;
  return g;
}

function buildSpikeCluster() {
  const g = new THREE.Group();
  const bone = matte(0xe8e2d0);
  const tip = matte(0x9a8f78);
  const make = (r, h, tx, tz, tilt) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), bone);
    c.position.set(tx, h / 2, tz);
    c.rotation.set(tilt, 0, tilt);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.45, h * 0.28, 7), tip);
    cap.position.y = h * 0.5;
    c.add(cap);
    return c;
  };
  g.add(make(0.075, 0.52, 0, 0, 0));
  g.add(make(0.05, 0.34, 0.1, 0.05, 0.35));
  g.add(make(0.045, 0.3, -0.09, -0.04, -0.32));
  return g;
}

function buildTentacle() {
  const g = new THREE.Group();
  const mat = matte(0xb88cff);
  let y = 0;
  for (let i = 0; i < 6; i++) {
    const r = 0.09 * (1 - i / 7);
    const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 10), mat);
    y += r * 1.3;
    seg.position.set(Math.sin(i * 0.7) * 0.06, y, 0); // gentle curve
    y += r * 0.4;
    g.add(seg);
  }
  // sucker tip
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), glossy(0xd9b3ff));
  tip.position.y = y + 0.02;
  g.add(tip);
  g.userData.sway = true;
  return g;
}

function buildMaw() {
  const g = new THREE.Group();
  // dark cavity
  const cavity = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), matte(0x2a0608));
  cavity.scale.set(1, 0.55, 1);
  cavity.position.y = 0.04;
  g.add(cavity);

  const lipMat = matte(0x8a1f2b);
  const toothMat = matte(0xf2efe2);
  const makeJaw = (sign) => {
    const hinge = new THREE.Group();
    hinge.position.y = 0.04;
    const lip = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), lipMat);
    lip.scale.set(1, 0.5 * sign, 1);
    lip.position.y = 0.02 * sign;
    hinge.add(lip);
    // teeth around the front rim
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / (n - 1)) * Math.PI;
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.11, 6), toothMat);
      tooth.position.set(Math.cos(a) * 0.17, 0.04 * sign, Math.sin(a) * 0.17 + 0.04);
      tooth.rotation.x = sign > 0 ? Math.PI : 0; // point inward
      hinge.add(tooth);
    }
    return hinge;
  };
  const upper = makeJaw(1);
  const lower = makeJaw(-1);
  g.add(upper, lower);
  g.userData.jaw = { upper, lower };
  g.userData.seed = Math.random() * 6;
  return g;
}

function buildFrond() {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.34, 6), matte(0x2f8f4a));
  stem.position.y = 0.17;
  g.add(stem);
  const leafMat = matte(0x3fd06a);
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 5), leafMat);
    const a = (i / 5) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.06, 0.34, Math.sin(a) * 0.06);
    leaf.rotation.set(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5);
    leaf.scale.z = 0.22; // flatten to a blade
    g.add(leaf);
  }
  g.userData.sway = true;
  return g;
}

function buildCilia() {
  const g = new THREE.Group();
  const mat = matte(0xc9e8d0);
  for (let i = 0; i < 14; i++) {
    const h = 0.12 + Math.random() * 0.14;
    const hair = new THREE.Mesh(new THREE.ConeGeometry(0.013, h, 4), mat);
    const a = Math.random() * Math.PI * 2, r = Math.random() * 0.15;
    hair.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
    hair.rotation.set((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5);
    g.add(hair);
  }
  g.userData.sway = true;
  return g;
}

function buildExtraBody() {
  const g = new THREE.Group();
  const blob = new THREE.Mesh(
    makeOrganismGeometry(2, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x5be39f, roughness: 0.32, metalness: 0.1,
      flatShading: true, emissive: 0x0a3d2a, emissiveIntensity: 0.5 }));
  blob.position.y = 0.42;
  g.add(blob);
  // a little eye so the bud reads as a sibling organism
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), glossy(0xf7f8fc));
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), glossy(0x07070d));
  eye.position.set(0, 0.6, 0.36); pupil.position.set(0, 0.62, 0.44);
  g.add(eye, pupil);
  return g;
}

function buildPart(type) {
  switch (type) {
    case "eye": return buildEye();
    case "spike": return buildSpikeCluster();
    case "tentacle": return buildTentacle();
    case "jaw": return buildMaw();
    case "frond": return buildFrond();
    case "cilia": return buildCilia();
    case "body": return buildExtraBody();
    default: {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), glossy(0xffffff)));
      return g;
    }
  }
}

// Attach one part at the next anchor on the actual body surface; it animates in.
export function addMutationPart(type) {
  if (!partsGroup || !type) return;
  const dir = anchorDir(partIndex);
  const part = buildPart(type);
  // align the part's +Y to point outward from the body
  part.quaternion.setFromUnitVectors(UP, dir);
  // emerge animation: start embedded in the body, push outward as it grows
  const R = surfaceRadius(dir);
  part.userData.fromPos = dir.clone().multiplyScalar(R * 0.55);
  part.userData.toPos = dir.clone().multiplyScalar(R - 0.05);
  part.position.copy(part.userData.fromPos);
  part.userData.growT = 0;
  part.userData.targetScale = 1;
  part.userData.baseRotZ = part.rotation.z;
  if (part.userData.seed === undefined) part.userData.seed = partIndex * 1.7;
  part.scale.setScalar(0.0001);
  partsGroup.add(part);
  partIndex++;
}

// Called whenever the player gains ANY mutation: hue drift + a satisfying squash.
export function onMutationGained(part) {
  hueShift = (hueShift + 0.045) % 1;
  applyHue();
  punch = 1.4; // big pop
  if (part) addMutationPart(part);
}

// Rebuild visuals from a saved game (parts = array of part types).
export function rebuildVisuals(parts, totalMutations) {
  hueShift = (0.045 * (totalMutations || 0)) % 1;
  applyHue();
  for (const p of parts) addMutationPart(p);
}

// Big squash on prestige.
export function prestigeFlash() {
  punch = 1.8;
}

// Cinematic beat: a hard squash + a quick camera push-in (decays in renderCreature).
let cineZoom = 0;
export function cinematicPulse() { punch = 2.4; cineZoom = 1.7; }

// build-dependent aura — the glow light colour tells you the build at a glance
let glowLight, rimMesh, rimMat;
export function setAura(hex, intensity = 0.8) {
  if (glowLight) { glowLight.color.setHex(hex); glowLight.intensity = intensity; }
  if (rimMat) rimMat.uniforms.uColor.value.setHex(hex);
}

// Render a shareable PNG: the creature + a caption bar (name + mutation count).
// Returns a data URL.
export function exportPhoto(name, subtitle, scaleRef) {
  if (!renderer) return null;
  renderer.render(scene, camera); // ensure the buffer is current
  const src = renderer.domElement;
  const W = src.width, H = src.height;
  const out = document.createElement("canvas");
  out.width = W; out.height = H;
  const ctx = out.getContext("2d");
  // dark backdrop + the creature
  const grad = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.5, W * 0.7);
  grad.addColorStop(0, "#16202c"); grad.addColorStop(1, "#0b0f14");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(src, 0, 0, W, H);
  // scale-reference badge (the viral "look how big it is" comparison)
  if (scaleRef) {
    const pad = Math.round(W * 0.025);
    const eS = Math.round(W * 0.06);
    ctx.textAlign = "left";
    ctx.shadowColor = "rgba(0,0,0,.85)"; ctx.shadowBlur = 10;
    ctx.font = `${eS}px Segoe UI Emoji, sans-serif`;
    ctx.fillText(scaleRef.e, pad, H - pad - Math.round(H * 0.06));
    ctx.fillStyle = "#e8f0f7";
    ctx.font = `bold ${Math.round(W * 0.024)}px Segoe UI, system-ui, sans-serif`;
    ctx.fillText(scaleRef.b, pad + eS + Math.round(W * 0.012), H - pad - Math.round(H * 0.075));
    ctx.fillStyle = "#7e93a8";
    ctx.font = `${Math.round(W * 0.017)}px Segoe UI, system-ui, sans-serif`;
    ctx.fillText(`specimen size · ${scaleRef.s}`, pad + eS + Math.round(W * 0.012), H - pad - Math.round(H * 0.05));
  }
  // caption
  ctx.textAlign = "center";
  ctx.fillStyle = "#e8f0f7";
  ctx.font = `bold ${Math.round(W * 0.038)}px Segoe UI, system-ui, sans-serif`;
  ctx.shadowColor = "rgba(0,0,0,.8)"; ctx.shadowBlur = 12;
  ctx.fillText(name || "Mutation Lab", W / 2, H - Math.round(H * 0.075));
  if (subtitle) {
    ctx.shadowBlur = 6;
    ctx.fillStyle = "#7e93a8";
    ctx.font = `${Math.round(W * 0.022)}px Segoe UI, system-ui, sans-serif`;
    ctx.fillText(subtitle, W / 2, H - Math.round(H * 0.04));
  }
  return out.toDataURL("image/png");
}

// Clear all mutation parts (used on Speciate — new lineage starts bald).
export function resetParts() {
  if (!partsGroup) return;
  while (partsGroup.children.length) partsGroup.remove(partsGroup.children[0]);
  partIndex = 0;
  hueShift = 0;
  applyHue();
}

// Ghost-chimera overlay: a faint translucent shell per equipped Species, tinted
// by that species' part hue, layered around the body. The marquee viral asset.
let ghostGroup;
export function setEquippedGhosts(species) {
  if (!organism) return;
  if (!ghostGroup) { ghostGroup = new THREE.Group(); organism.add(ghostGroup); }
  while (ghostGroup.children.length) ghostGroup.remove(ghostGroup.children[0]);
  const list = (species || []).slice(0, 5);
  list.forEach((sp, i) => {
    const hue = (0.42 + (sp.parts ? sp.parts.length : i) * 0.11 + i * 0.07) % 1;
    const shell = new THREE.Mesh(
      makeOrganismGeometry(2, 1),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(hue, 0.7, 0.55),
        transparent: true, opacity: 0.16, flatShading: true,
        emissive: new THREE.Color().setHSL(hue, 0.7, 0.3), emissiveIntensity: 0.6,
        depthWrite: false,
      }));
    const s = 1.12 + i * 0.1;
    shell.scale.setScalar(s);
    shell.rotation.set(i * 0.6, i * 1.1, i * 0.3);
    ghostGroup.add(shell);
  });
}
