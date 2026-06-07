// The 3D creature. A low-poly deformed organism that pulses on click, slowly
// rotates, jiggles like jelly, grows with biomass, and sprouts detailed,
// animated modular parts (eyes that look around, a chomping maw, swaying
// tentacles, clustered spikes, leafy fronds) as the player drafts mutations.

import * as THREE from "three";
import { speciesTier } from "./data/tiers.js";
import { EVO_STAGES } from "./data/stages.js";
import { PATH_BY_ID } from "./data/paths.js";

let renderer, scene, camera, organism, light;
let canvas;
let punch = 0;          // transient squash impulse from clicks
let targetScale = 1;    // grows with biomass
let currentScale = 1;
let onClickCb = null;
let raycaster, pointer;

// mutation visuals
let partsGroup;
let sigGroup; // Evolution-Path signature parts (managed per stage)
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
// Programmatically collect the active bloom (used by the Bloom Forager automator).
// Projects the bloom to screen coords so the burst still fires at the right spot.
export function collectBloom() {
  if (!activeBloom || !onBloomCb) return false;
  let sx = 0, sy = 0;
  try {
    const v = activeBloom.getWorldPosition(new THREE.Vector3()).project(camera);
    const rect = canvas.getBoundingClientRect();
    sx = rect.left + (v.x * 0.5 + 0.5) * rect.width;
    sy = rect.top + (-v.y * 0.5 + 0.5) * rect.height;
  } catch (e) { /* fall back to 0,0 */ }
  removeBloom();
  onBloomCb(sx, sy);
  return true;
}

const easeOutBack = (t) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// Layered pseudo-noise over a unit direction — the SAME field used to deform the
// body, so we can also query it to place parts exactly on the lumpy surface.
// Body shape is parameterized by a "profile" (surface character) + a per-run
// seed (so runs differ) + a base-scale vector (overall silhouette proportions).
// Both the geometry AND part placement read bumpAt(), so they stay consistent.
let shapeProfile = { a1: 0.18, f1: 4.0, a2: 0.12, f2: 6.0, a3: 0.08, f3: 8.0, lobe: 0, lobeF: 1.6, spike: 0 };
let shapeSeed = 0;
let bodyDetail = 3;
const bodyScale = new THREE.Vector3(1, 1, 1);

// Per-tier silhouettes: scale = overall proportions, detail = facet count
// (low = angular/crystalline), profile = surface character.
const TIER_SHAPE = [
  { scale: [1, 1, 1],          detail: 3, profile: { a1: 0.18, f1: 4.0, a2: 0.12, f2: 6.0, a3: 0.08, f3: 8.0, lobe: 0,    lobeF: 1.6, spike: 0 } },     // Protocell — round
  { scale: [0.82, 1.34, 0.82], detail: 3, profile: { a1: 0.12, f1: 3.2, a2: 0.10, f2: 5.0, a3: 0.06, f3: 7.0, lobe: 0,    lobeF: 1.4, spike: 0 } },     // Luminark — tall teardrop
  { scale: [1.05, 1.05, 1.05], detail: 1, profile: { a1: 0.08, f1: 3.0, a2: 0.06, f2: 4.0, a3: 0.05, f3: 6.0, lobe: 0,    lobeF: 1.4, spike: 0.06 } },  // Crystalis — faceted crystal
  { scale: [1.18, 0.92, 1.12], detail: 3, profile: { a1: 0.16, f1: 3.4, a2: 0.10, f2: 5.0, a3: 0.07, f3: 7.0, lobe: 0.28, lobeF: 1.7, spike: 0 } },     // Aurean — multi-lobed cluster
  { scale: [1.0, 1.06, 1.0],   detail: 2, profile: { a1: 0.14, f1: 4.0, a2: 0.10, f2: 6.0, a3: 0.07, f3: 8.0, lobe: 0.1,  lobeF: 2.0, spike: 0.34 } },   // Voidborn — spiky core
  { scale: [1.12, 1.12, 1.12], detail: 2, profile: { a1: 0.12, f1: 3.6, a2: 0.10, f2: 5.4, a3: 0.07, f3: 7.4, lobe: 0.22, lobeF: 2.2, spike: 0.3 } },    // Celestial — radiant star-form
  { scale: [1.3, 0.86, 1.0],   detail: 3, profile: { a1: 0.2,  f1: 2.6, a2: 0.12, f2: 4.4, a3: 0.08, f3: 6.4, lobe: 0.34, lobeF: 1.5, spike: 0 } },      // wide bulbous
  { scale: [0.78, 1.4, 0.78],  detail: 2, profile: { a1: 0.1,  f1: 3.0, a2: 0.08, f2: 5.0, a3: 0.06, f3: 7.0, lobe: 0.12, lobeF: 2.6, spike: 0.5 } },    // tall spired
  { scale: [1.06, 1.0, 1.06],  detail: 1, profile: { a1: 0.06, f1: 2.4, a2: 0.05, f2: 3.6, a3: 0.04, f3: 5.2, lobe: 0,    lobeF: 1.4, spike: 0.14 } },   // sharp gem
  { scale: [1.0, 1.0, 1.0],    detail: 3, profile: { a1: 0.24, f1: 5.0, a2: 0.16, f2: 7.0, a3: 0.1,  f3: 9.0, lobe: 0.4,  lobeF: 2.4, spike: 0.2 } },    // writhing knot
  { scale: [1.22, 1.1, 0.9],   detail: 2, profile: { a1: 0.14, f1: 3.2, a2: 0.1,  f2: 5.6, a3: 0.08, f3: 8.0, lobe: 0.18, lobeF: 1.9, spike: 0.45 } },   // asymmetric crown
];

function bumpAt(n) {
  const s = shapeSeed, p = shapeProfile;
  let b =
    p.a1 * Math.sin(n.x * p.f1 + n.y * 2.0 + s) +
    p.a2 * Math.sin(n.y * p.f2 + n.z * 3.0 + s * 1.7) +
    p.a3 * Math.cos(n.z * p.f3 + n.x * 5.0 + s * 2.3);
  if (p.lobe) b += p.lobe * Math.sin(n.y * p.lobeF + s) * Math.cos(n.x * p.lobeF * 0.8 + s);
  if (p.spike) {
    const v = Math.sin(n.x * 7 + s) * Math.sin(n.y * 7 + s * 1.3) * Math.sin(n.z * 7 + s * 0.7);
    b += p.spike * Math.pow(Math.max(0, v), 3);
  }
  return b;
}
function surfaceRadius(dir) {
  return 1 + bumpAt(dir);
}

// Rebuild the body mesh (and its shared fresnel shell) for the current shape.
function rebuildBody() {
  if (!organism) return;
  const geo = makeOrganismGeometry(bodyDetail, 1);
  const old = organism.geometry;
  organism.geometry = geo;
  if (rimMesh) rimMesh.geometry = geo;
  if (skinShell) skinShell.geometry = geo;
  if (old) old.dispose();
}

// Set the body silhouette from the species tier + a per-run seed. Returns true
// if the caller should re-seat existing parts (rebuildVisuals) onto the new body.
export function setBodyShape(tier, seed) {
  // cycle through silhouettes for high tiers (combined with per-run seed jitter,
  // each still looks fresh) so the body never stops changing as you ascend
  const T = TIER_SHAPE[Math.max(0, tier | 0) % TIER_SHAPE.length];
  shapeProfile = { ...T.profile };
  shapeSeed = (seed || 0) * 0.137;
  bodyDetail = T.detail;
  // per-run scale jitter (deterministic from seed) so two same-tier runs differ
  const j = (k) => 1 + Math.sin((seed || 0) * 12.9898 + k) * 0.5 * 0.16;
  bodyScale.set(T.scale[0] * j(1), T.scale[1] * j(2), T.scale[2] * j(3));
  rebuildBody();
  return true;
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

// ---- Species Tier "ascension crown": orbiting glowing shards + halo rings that
// escalate with each Speciation, so a higher lineage instantly looks grander. ----
let tierGroup, tierIndex = 0;

// Build the orbiting "ascension crown" (glowing shards + halo rings) for a given
// shard/ring count + color. Shared by the legacy per-Speciation tier and the new
// permanent Evolution Stage.
function buildCrown(crown, rings, colorHex) {
  if (!scene) return;
  if (!tierGroup) { tierGroup = new THREE.Group(); scene.add(tierGroup); }
  while (tierGroup.children.length) {
    const c = tierGroup.children[0];
    tierGroup.remove(c);
    if (c.geometry) c.geometry.dispose();
    if (c.material) c.material.dispose();
  }
  const col = new THREE.Color(colorHex);
  for (let i = 0; i < crown; i++) {
    const m = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.12, 0),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.5, flatShading: true, metalness: 0.3, roughness: 0.2 }));
    m.userData.ang = (i / crown) * Math.PI * 2;
    m.userData.tilt = (i % 2 ? 0.35 : -0.22);
    m.userData.shard = true;
    tierGroup.add(m);
  }
  for (let r = 0; r < rings; r++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.016, 8, 72),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
    ring.rotation.x = Math.PI / 2 + (r * 0.45 - 0.2);
    ring.userData.ring = true;
    tierGroup.add(ring);
  }
}

export function setSpeciesTier(n) {
  tierIndex = Math.max(0, n | 0);
  const T = speciesTier(tierIndex);
  buildCrown(T.crown, T.rings, T.color);
}

// ---- Evolution Stage: the PERMANENT macro-transformation (Cell → Cosmic) ----
// Drives body silhouette + crown grandeur + aura + orbiting bodies all at once,
// so each stage reads as a genuine transformation, not a recolor. `seed` adds
// per-run silhouette jitter so two creatures at the same stage still differ.
let stageIndex = 0, orbiterGroup;
export function setStage(idx, seed = 0, pathId = null) {
  stageIndex = Math.max(0, Math.min(EVO_STAGES.length - 1, idx | 0));
  const s = EVO_STAGES[stageIndex];
  const p = pathId ? PATH_BY_ID[pathId] : null;
  // surface CHARACTER comes from the chosen path (spiky/lobed/faceted/writhing),
  // amplified by stage so the form grows more extreme as you ascend; falls back
  // to the generic stage profile before a path is chosen.
  const base = p ? p.profile : s.profile;
  const amp = 1 + stageIndex * 0.13;
  shapeProfile = { ...base, a1: base.a1 * amp, lobe: (base.lobe || 0) * amp, spike: (base.spike || 0) * amp };
  shapeSeed = seed * 0.137;
  bodyDetail = p ? p.detail : s.detail; // faceted (low) vs organic (high)
  const j = (k) => 1 + Math.sin(seed * 12.9898 + k) * 0.5 * 0.14; // deterministic per-run jitter
  bodyScale.set(s.scale[0] * j(1), s.scale[1] * j(2), s.scale[2] * j(3));
  rebuildBody();
  // colour identity: path colour if chosen, else the generic stage colour
  const col = p ? p.color : s.color;
  buildCrown(s.crown, s.rings, col);          // grandeur ladder (shards + rings)
  setAura(col, s.auraI);                        // glow + orbiting aura particles
  buildOrbiters(s.orbits, col);                 // detached organs / orbiting stars
  setStageParts(p, stageIndex, col);            // grow the path's signature anatomy
  setPathHabitat(pathId, stageIndex);           // theme the WORLD to the lineage
  return true; // caller should re-seat parts (rebuildVisuals)
}

// Grow the chosen path's SIGNATURE anatomy, scaled by stage, so the creature
// reads instantly as Predator/Neural/Crystal/Parasite. Rebuilt each setStage;
// lives in sigGroup so it never collides with drafted mutation parts.
function setStageParts(p, stage, col) {
  if (!sigGroup) return;
  while (sigGroup.children.length) {
    const c = sigGroup.children[0];
    sigGroup.remove(c);
    c.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose && o.material.dispose(); });
  }
  if (!p || !p.sigParts || !p.sigParts.length) return;
  const count = Math.min(14, 2 + stage * 2); // 4 at Colony → 12 at Cosmic
  for (let i = 0; i < count; i++) {
    const type = p.sigParts[i % p.sigParts.length];
    const part = buildPart(type, col);
    // dedicated anchor sequence (offset from mutation parts) so they spread out
    const dir = anchorDir(3 + i * 2);
    part.quaternion.setFromUnitVectors(UP, dir);
    const R = surfaceRadius(dir);
    part.userData.fromPos = dir.clone().multiplyScalar(R * 0.55);
    part.userData.toPos = dir.clone().multiplyScalar(R - 0.05);
    part.position.copy(part.userData.toPos);
    part.userData.growT = 0;
    part.userData.targetScale = 0.85 + Math.min(0.5, stage * 0.1); // grander at higher stages
    part.userData.baseRotZ = part.rotation.z;
    if (part.userData.seed === undefined) part.userData.seed = i * 1.7;
    part.scale.setScalar(0.0001);
    sigGroup.add(part);
  }
}

// Small bright bodies that orbit the creature at the top stages — detached
// organs / captured stars. Disposed + rebuilt each stage change.
function buildOrbiters(n, colorHex) {
  if (!scene) return;
  if (!orbiterGroup) { orbiterGroup = new THREE.Group(); scene.add(orbiterGroup); }
  while (orbiterGroup.children.length) {
    const c = orbiterGroup.children[0];
    orbiterGroup.remove(c);
    if (c.geometry) c.geometry.dispose();
    if (c.material) c.material.dispose();
  }
  const col = new THREE.Color(colorHex);
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.1 + Math.sin(i * 2.3) * 0.03 + 0.05, 0),
      new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 2.2, flatShading: true, metalness: 0.2, roughness: 0.3 }));
    m.userData.ang = (i / n) * Math.PI * 2;
    m.userData.rad = 2.1 + (i % 3) * 0.35;     // orbit radius band
    m.userData.tilt = (i % 2 ? 0.5 : -0.4);    // orbit-plane tilt
    m.userData.spd = 0.25 + (i % 4) * 0.06;    // orbital speed
    orbiterGroup.add(m);
  }
}

function updateOrbiters(dt, elapsed) {
  if (!orbiterGroup) return;
  for (const c of orbiterGroup.children) {
    const a = c.userData.ang + elapsed * c.userData.spd;
    const rad = c.userData.rad * currentScale;
    c.position.set(
      Math.cos(a) * rad,
      Math.sin(a * 0.7 + c.userData.tilt) * 0.7 * currentScale,
      Math.sin(a) * rad);
    c.rotation.x += dt * 1.1;
    c.rotation.y += dt * 0.9;
  }
}

function updateTierCrown(dt, elapsed) {
  if (!tierGroup) return;
  const rad = currentScale * 1.55;
  for (const c of tierGroup.children) {
    if (c.userData.ring) {
      c.scale.setScalar(currentScale * 1.5);
      c.rotation.z += dt * 0.4;
      continue;
    }
    const a = c.userData.ang + elapsed * 0.6;
    c.position.set(
      Math.cos(a) * rad,
      Math.sin(a * 0.5 + c.userData.tilt) * 0.5 * currentScale + Math.sin(elapsed * 1.4 + a) * 0.08,
      Math.sin(a) * rad);
    c.rotation.x += dt * 1.6;
    c.rotation.y += dt * 1.3;
  }
}

// ---- Creature Habitat: a lab-tank / biome environment instead of a void ----
// floor platform + atmospheric depth fog + drifting biome motes (bubbles, embers,
// spores, plankton…). Lives in the scene (not on the organism) so it stays put
// while the creature spins, giving real parallax + a sense of place.
let habitatGroup, floorMesh, motes, moteSpeeds, moteCount = 30;
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

  buildMotes();
}

// drifting ambient motes (bubbles / embers / spores). Count is quality-driven.
function buildMotes() {
  if (!habitatGroup) return;
  if (motes) { habitatGroup.remove(motes); motes.geometry.dispose(); motes.material.dispose(); motes = null; }
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
function rebuildMotes(n) { moteCount = n; buildMotes(); }

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

// ---- Path-themed habitat: real scenery on the floor that matches the lineage,
// so the creature lives in a WORLD (crystal cavern / bone ground / synaptic
// network / fleshy nest) instead of floating in a void. ----
let sceneryGroup;
const PATH_HABITAT = {
  predator: { fog: 0x1a0c08, floor: 0x2a1510, mote: 0xffae6b },
  neural:   { fog: 0x081626, floor: 0x0e2238, mote: 0x8fd6ff },
  crystal:  { fog: 0x0a1c2a, floor: 0x123040, mote: 0xbfeeff },
  parasite: { fog: 0x0c1a0e, floor: 0x14301a, mote: 0xaef07a },
};
// deterministic pseudo-random so scenery is stable within a stage (no Math.random churn)
function srand(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5; return x - Math.floor(x); }

export function setPathHabitat(pathId, stage) {
  const h = PATH_HABITAT[pathId];
  if (h) {
    if (scene && scene.fog) scene.fog.color.setHex(h.fog);
    if (floorMesh) { floorMesh.material.color.setHex(h.floor); floorMesh.material.emissive.setHex(h.floor); }
    if (motes) motes.material.color.setHex(h.mote);
  }
  buildPathScenery(pathId, stage || 0);
}

function buildPathScenery(pathId, stage) {
  if (!habitatGroup) return;
  if (!sceneryGroup) { sceneryGroup = new THREE.Group(); habitatGroup.add(sceneryGroup); }
  while (sceneryGroup.children.length) {
    const c = sceneryGroup.children[0];
    sceneryGroup.remove(c);
    c.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); });
  }
  if (!pathId || (QUALITY && QUALITY.maxParts <= 12)) return; // skip heavy scenery on Low
  const n = Math.min(14, 7 + stage); // more props as the world matures
  const FLOOR_Y = -2.28;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + srand(i) * 0.5;
    const r = 3.0 + srand(i + 50) * 2.2;          // ring around the creature
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const prop = buildSceneryProp(pathId, i, stage);
    if (!prop) continue;
    prop.position.set(x, FLOOR_Y, z);
    prop.rotation.y = srand(i + 9) * Math.PI * 2;
    const s = 0.7 + srand(i + 3) * 0.8 + stage * 0.06;
    prop.scale.setScalar(s);
    sceneryGroup.add(prop);
  }
}

function buildSceneryProp(pathId, i, stage) {
  const g = new THREE.Group();
  if (pathId === "crystal") {
    // a cluster of glowing crystal spires jutting from the ground
    const mat = new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x4aa8d8, emissiveIntensity: 0.7, roughness: 0.08, metalness: 0.8, flatShading: true, transparent: true, opacity: 0.9 });
    const k = 2 + (i % 3);
    for (let j = 0; j < k; j++) {
      const h = 0.8 + srand(i * 7 + j) * 1.6;
      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.16, h, 5), mat);
      spire.position.set((srand(i + j) - 0.5) * 0.5, h / 2, (srand(i - j) - 0.5) * 0.5);
      spire.rotation.z = (srand(i * 3 + j) - 0.5) * 0.4;
      g.add(spire);
    }
  } else if (pathId === "predator") {
    // bone-strewn hunting ground — pale rib/spike shapes tilted out of the dirt
    const bone = new THREE.MeshStandardMaterial({ color: 0xe8e2cf, roughness: 0.6, metalness: 0.05, flatShading: true });
    const k = 1 + (i % 3);
    for (let j = 0; j < k; j++) {
      const h = 0.9 + srand(i * 5 + j) * 1.4;
      const rib = new THREE.Mesh(new THREE.ConeGeometry(0.09, h, 5), bone);
      rib.position.set((srand(i + j) - 0.5) * 0.7, h / 2, (srand(i - j) - 0.5) * 0.5);
      rib.rotation.set((srand(i + 2) - 0.5) * 0.8, 0, (srand(i + 4) - 0.5) * 0.9); // jutting at angles
      g.add(rib);
    }
  } else if (pathId === "neural") {
    // synaptic node on a thin stalk, glowing + pulsing
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 1.0 + srand(i) * 0.8, 5), matte(0x24506e));
    stalk.position.y = (1.0 + srand(i) * 0.8) / 2; g.add(stalk);
    const node = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0),
      new THREE.MeshStandardMaterial({ color: 0x8fd6ff, emissive: 0x6fd6ff, emissiveIntensity: 1.5, roughness: 0.3 }));
    node.position.y = 1.0 + srand(i) * 0.8; node.userData.pulse = true; g.add(node);
  } else if (pathId === "parasite") {
    // fleshy nest mound topped with dark egg clusters
    const mound = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x3a6b2e, emissive: 0x1a3315, emissiveIntensity: 0.4, roughness: 0.7, flatShading: true }));
    mound.scale.set(1, 0.6, 1); g.add(mound);
    const eggMat = new THREE.MeshStandardMaterial({ color: 0xaef07a, emissive: 0x4a7a2a, emissiveIntensity: 0.5, roughness: 0.4, transparent: true, opacity: 0.7 });
    const k = 2 + (i % 3);
    for (let j = 0; j < k; j++) {
      const egg = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eggMat);
      egg.position.set((srand(i + j) - 0.5) * 0.4, 0.28 + srand(i * j) * 0.1, (srand(i - j) - 0.5) * 0.4);
      egg.scale.y = 1.3; g.add(egg);
    }
  } else { return null; }
  return g;
}

function updateScenery(dt, elapsed) {
  if (!sceneryGroup || reduceMotion) return;
  for (const prop of sceneryGroup.children) {
    prop.traverse((o) => {
      if (o.userData.pulse && o.material) o.material.emissiveIntensity = 1.0 + Math.abs(Math.sin(elapsed * 2 + o.position.x)) * 1.2;
    });
  }
}

export function initCreature(canvasEl, onClick) {
  canvas = canvasEl;
  onClickCb = onClick;

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  // cap render resolution: at 2x DPR we'd shade ~4x the pixels, which crushes
  // weak GPUs on a screen-filling, overdraw-heavy creature. 1.25 is the sweet
  // spot — still crisp, far cheaper.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));

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

  buildHabitat();

  // parts ride on the organism so they spin/scale with it
  partsGroup = new THREE.Group();
  organism.add(partsGroup);
  // path-signature parts (claws / shards / neurons / egg sacs) live in their own
  // group so they're managed by stage/path without touching mutation parts
  sigGroup = new THREE.Group();
  organism.add(sigGroup);
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

let eyeTrack = false, gazePX = 0, gazePY = 0;
export function setEyeTracking(v) { eyeTrack = !!v; }
function onPointerMove(e) {
  // capture normalised cursor (-1..1 from stage centre) for the eye-tracking toggle
  if (eyeTrack && canvas) {
    const r = canvas.getBoundingClientRect();
    gazePX = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
    gazePY = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
  }
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
  targetScale = 0.8 + Math.min(t * 0.10, 1.0); // ~0.8 .. 1.8 (gentler; framing handles the rest)
}

// Called every frame.
export function renderCreature(dt, elapsed) {
  if (!renderer) return;

  // ease scale toward target
  currentScale += (targetScale - currentScale) * Math.min(1, dt * 3);

  // dolly the camera back as the organism grows so it stays framed — extra
  // pullback so parts sticking out (spikes/tentacles) never clip the top edge
  cineZoom += (0 - cineZoom) * Math.min(1, dt * 1.6); // cinematic push-in decay
  // frame on the creature's ACTUAL visual reach: growth scale × the body's
  // longest silhouette axis × a margin for bumps/spikes/parts — so tall, lobed
  // or spiky shapes pull the camera back enough to never overflow the screen.
  const maxAxis = Math.max(bodyScale.x, bodyScale.y, bodyScale.z);
  const reach = currentScale * maxAxis * 1.45;
  const targetZ = 5.2 + (reach - 1) * 5.4 - cineZoom;
  camera.position.z += (targetZ - camera.position.z) * Math.min(1, dt * 2.5);
  camera.lookAt(0, 0, 0);

  // squash impulse decays; gives a juicy click "pop"
  punch += (0 - punch) * Math.min(1, dt * 8);
  const squash = 1 + punch * 0.18;
  const stretch = 1 - punch * 0.12;

  // base scale + breathing + per-axis jelly jiggle
  const breathe = 1 + Math.sin(elapsed * 1.6) * 0.02;
  organism.scale.set(
    bodyScale.x * currentScale * squash * breathe * (1 + Math.sin(elapsed * 2.3) * 0.022),
    bodyScale.y * currentScale * stretch * breathe * (1 + Math.sin(elapsed * 1.9 + 2) * 0.022),
    bodyScale.z * currentScale * squash * breathe * (1 + Math.sin(elapsed * 2.6 + 4) * 0.022)
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
      // emissive glow tracks the body hue (was stuck green) so skin/tier palettes
      // fully take over the creature instead of reading muddy green-on-colour
      organism.material.emissive.setHSL(h, Math.min(1, skin.s * 0.8), 0.16 + stress * 0.06);
      organism.material.emissiveIntensity = skin.emi + stress * 1.3;
      organism.material.metalness = skin.metal;
      organism.material.roughness = skin.rough;
      // premium "living" skin finishes — animated material, no shader risk
      if (skin.anim && !reduceMotion) {
        if (skin.anim === "galaxy") {
          const gh = (skin.h + hueShift + elapsed * 0.04) % 1; // slow cosmic hue drift
          organism.material.color.setHSL(gh, skin.s, skin.l);
          organism.material.emissive.setHSL(gh, Math.min(1, skin.s * 0.8), 0.2);
          organism.material.emissiveIntensity = skin.emi + Math.sin(elapsed * 1.5) * 0.4;
        } else if (skin.anim === "molten") {
          organism.material.emissiveIntensity = skin.emi + Math.sin(elapsed * 8) * 0.4 + Math.sin(elapsed * 13.3) * 0.2;
        } else if (skin.anim === "shimmer") {
          organism.material.emissiveIntensity = skin.emi + Math.sin(elapsed * 3) * 0.3;
          organism.material.roughness = Math.max(0.02, skin.rough + Math.sin(elapsed * 4) * 0.05);
        } else if (skin.anim === "pulse") {
          organism.material.emissiveIntensity = skin.emi + Math.sin(elapsed * 2) * 0.35;
        }
      }
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
  const gazeX = eyeTrack ? gazePY * 0.5 : Math.sin(elapsed * 0.6) * 0.28;
  const gazeZ = eyeTrack ? -gazePX * 0.5 : Math.cos(elapsed * 0.45) * 0.28;
  // periodic blink — every ~4.3s the eyes snap shut for a beat (alive, not static)
  let blinkAmt = 0;
  if (!reduceMotion) {
    const bp = elapsed % 4.3;
    if (bp < 0.14) blinkAmt = 1 - Math.abs(bp - 0.07) / 0.07;
  }

  animatePartGroup(partsGroup, dt, elapsed, blinkAmt, gazeX, gazeZ);
  animatePartGroup(sigGroup, dt, elapsed, blinkAmt, gazeX, gazeZ);

  // animate the Mitogen Bloom (pulse + spin); auto-despawn if ignored
  if (activeBloom) {
    activeBloom.userData.born += dt;
    activeBloom.scale.setScalar(1 + Math.sin(elapsed * 6) * 0.18);
    activeBloom.rotation.y += dt * 2.5;
    if (activeBloom.userData.born > 12) removeBloom();
  }

  updateHabitat(dt, elapsed);
  updateScenery(dt, elapsed);
  updateTierCrown(dt, elapsed);
  updateOrbiters(dt, elapsed);
  updateAuraParticles(elapsed);
  updateVeins(elapsed);
  if (skinShellMat) skinShellMat.uniforms.uTime.value = elapsed;

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
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), glossy(0xf7f8fc));
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
  const glint = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), litMat);
  glint.position.set(0.07, 0.225, 0.06);
  const glint2 = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), litMat);
  glint2.position.set(-0.05, 0.2, 0.07);
  look.add(iris, pupil, glint, glint2);
  g.add(look);
  g.userData.look = look;
  return g;
}

function buildSpikeCluster() {
  const g = new THREE.Group();
  const bone = new THREE.MeshStandardMaterial({ color: 0xeef0f5, roughness: 0.22, metalness: 0.35, flatShading: true });
  const tip = new THREE.MeshStandardMaterial({ color: 0xfff4d6, emissive: 0xffd98a, emissiveIntensity: 0.55, roughness: 0.14, metalness: 0.3, flatShading: true });
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

// ---- Evolution-Path signature parts (so a screenshot screams the lineage) ----
// Predator: curved claws. Builds toward a bladed, armoured silhouette.
function buildClaw() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x2b2b33, roughness: 0.3, metalness: 0.5, flatShading: true });
  const tipMat = new THREE.MeshStandardMaterial({ color: 0xffd0a0, emissive: 0xff7a3d, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.4, flatShading: true });
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Group();
    const len = 0.34 - i * 0.05;
    const claw = new THREE.Mesh(new THREE.ConeGeometry(0.05, len, 5), mat);
    claw.position.y = len / 2;
    claw.rotation.x = -0.5; // hook forward
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.022, len * 0.3, 5), tipMat);
    tip.position.y = len * 0.5; claw.add(tip);
    seg.add(claw);
    seg.rotation.z = (i - 1) * 0.4;
    g.add(seg);
  }
  return g;
}
// Crystal: a cluster of angular shards / wing — faceted, refractive, glowing.
function buildShard(color = 0x9fe8ff) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6, roughness: 0.05, metalness: 0.85, flatShading: true, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 5; i++) {
    const h = 0.5 - i * 0.07;
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.07 + i * 0.005, 0), mat);
    shard.scale.set(0.5, 2.4, 0.5); // elongate into a blade
    const a = (i - 2) * 0.42;
    shard.position.set(Math.sin(a) * 0.14, h * 0.5 + 0.05, 0);
    shard.rotation.z = a;
    g.add(shard);
  }
  return g;
}
// Neural: floating glowing neuron orbs with a thin connecting tendril (electric).
function buildNeuron(color = 0x6fd6ff) {
  const g = new THREE.Group();
  const core = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6, roughness: 0.25 });
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.26, 5), matte(0x9fb6d0));
  stalk.position.y = 0.13; g.add(stalk);
  for (let i = 0; i < 3; i++) {
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06 - i * 0.012, 0), core);
    orb.position.set(Math.sin(i * 2.1) * 0.1, 0.26 + i * 0.09, Math.cos(i * 2.1) * 0.06);
    orb.userData.flick = true;
    g.add(orb);
  }
  g.userData.sway = true;
  return g;
}
// Parasite: a translucent egg sac bulging with dark eggs.
function buildEggSac(color = 0x9be36b) {
  const g = new THREE.Group();
  const sac = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.4, transparent: true, opacity: 0.6 }));
  sac.scale.set(1, 1.3, 1); sac.position.y = 0.2; g.add(sac);
  const eggMat = matte(0x14361c);
  for (let i = 0; i < 6; i++) {
    const egg = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eggMat);
    const a = i * 1.4;
    egg.position.set(Math.sin(a) * 0.07, 0.16 + (i % 3) * 0.08, Math.cos(a) * 0.05);
    g.add(egg);
  }
  g.userData.sway = true;
  return g;
}

// Animate every part in a group: emerge/grow, ease to level-up scale, sway,
// eye-gaze + blink, jaw chomp, neuron flicker. Shared by mutation + signature parts.
function animatePartGroup(grp, dt, elapsed, blinkAmt, gazeX, gazeZ) {
  if (!grp) return;
  for (const p of grp.children) {
    if (p.userData.growT < 1) {
      p.userData.growT = Math.min(1, p.userData.growT + dt * 2.0);
      p.scale.setScalar(Math.max(0.0001, easeOutBack(p.userData.growT) * p.userData.targetScale));
      if (p.userData.fromPos && p.userData.toPos) p.position.lerpVectors(p.userData.fromPos, p.userData.toPos, p.userData.growT);
    } else {
      const cur = p.scale.x, tgt = p.userData.targetScale;
      if (Math.abs(cur - tgt) > 0.002) p.scale.setScalar(cur + (tgt - cur) * Math.min(1, dt * 3));
    }
    if (p.userData.sway) p.rotation.z = p.userData.baseRotZ + Math.sin(elapsed * 2 + p.userData.seed) * 0.18;
    if (p.userData.look) {
      p.userData.look.rotation.x = gazeX;
      p.userData.look.rotation.z = gazeZ;
      if (p.userData.growT >= 1) p.scale.y = p.scale.x * (1 - blinkAmt * 0.85);
    }
    if (p.userData.jaw) {
      const open = Math.max(0, Math.sin(elapsed * 1.1 + p.userData.seed)) * 0.5;
      p.userData.jaw.upper.rotation.x = -open;
      p.userData.jaw.lower.rotation.x = open;
    }
    if (p.userData.seed !== undefined) { // neuron orbs flicker like synapses
      p.traverse((o) => {
        if (o.userData.flick && o.material) o.material.emissiveIntensity = 1.0 + Math.abs(Math.sin(elapsed * 6 + o.position.x * 9)) * 1.4;
      });
    }
  }
}

function buildPart(type, color) {
  switch (type) {
    case "eye": return buildEye();
    case "spike": return buildSpikeCluster();
    case "tentacle": return buildTentacle();
    case "jaw": return buildMaw();
    case "frond": return buildFrond();
    case "cilia": return buildCilia();
    case "body": return buildExtraBody();
    case "claw": return buildClaw();
    case "shard": return buildShard(color);
    case "neuron": return buildNeuron(color);
    case "eggsac": return buildEggSac(color);
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
  if (partIndex >= QUALITY.maxParts) { partIndex++; return; } // quality-capped; count but don't render more meshes
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
  part.userData.partType = type;
  part.userData.baseRotZ = part.rotation.z;
  if (part.userData.seed === undefined) part.userData.seed = partIndex * 1.7;
  part.scale.setScalar(0.0001);
  partsGroup.add(part);
  partIndex++;
  relevelParts(); // re-evaluate evolution stages (more of a type = grander parts)
}

// Mutation evolution stages: the more of a body-part type you've grown, the
// grander every part of that type becomes (bigger + glowier). Eye → Eye II →
// Compound → Cosmic, etc. Re-applied whenever parts change.
const PART_TIERS = [
  { min: 1, scale: 1.0, emi: 0 },
  { min: 3, scale: 1.3, emi: 0.4 },
  { min: 6, scale: 1.65, emi: 1.0 },
  { min: 10, scale: 2.1, emi: 1.8 },
];
function partTierFor(count) {
  let t = PART_TIERS[0];
  for (const x of PART_TIERS) if (count >= x.min) t = x;
  return t;
}
function relevelParts() {
  if (!partsGroup) return;
  const counts = {};
  for (const p of partsGroup.children) {
    if (p.userData.partType) counts[p.userData.partType] = (counts[p.userData.partType] || 0) + 1;
  }
  for (const p of partsGroup.children) {
    if (!p.userData.partType) continue;
    const t = partTierFor(counts[p.userData.partType] || 1);
    p.userData.targetScale = t.scale;
    p.traverse((o) => {
      if (o.material && o.material.emissive) {
        if (o.userData._baseEmi === undefined) o.userData._baseEmi = o.material.emissiveIntensity || 0;
        o.material.emissiveIntensity = o.userData._baseEmi + t.emi;
      }
    });
  }
}

// Called whenever the player gains ANY mutation: hue drift + a satisfying squash.
export function onMutationGained(part) {
  // only a tiny tint per mutation, capped — so bought skins always read as their
  // colour (Magma stays molten, Amethyst stays purple) instead of drifting away
  hueShift = Math.min(0.07, hueShift + 0.006);
  applyHue();
  punch = 1.4; // big pop
  if (part) addMutationPart(part);
}

// Rebuild visuals from a saved game (parts = array of part types).
export function rebuildVisuals(parts, totalMutations) {
  hueShift = Math.min(0.07, 0.006 * (totalMutations || 0));
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

// Light auto-tap squash for drones (subtle — so idle play looks alive without
// overpowering a real player click). Adds, doesn't override, so manual clicks
// still read as bigger.
export function pulse(amount = 0.5) { punch = Math.min(punch + amount, 1.2); }

// build-dependent aura — the glow light colour + a cloud of orbiting particles
// tell you the build at a glance (recognize a build from a screenshot)
let glowLight, rimMesh, rimMat;
let auraGroup, auraPts, auraTrail = [], auraN = 0, auraColor = 0x66ffcc;
let auraAng, auraRad, auraYB, auraSpd, auraPhase;
export function setAura(hex, intensity = 0.8) {
  if (glowLight) { glowLight.color.setHex(hex); glowLight.intensity = intensity; }
  if (rimMat) rimMat.uniforms.uColor.value.setHex(hex);
  auraColor = hex;
  if (auraPts) auraPts.material.color.setHex(hex);
  for (const t of auraTrail) t.material.color.setHex(hex);
}
function buildAuraParticles(n) {
  if (!scene) return;
  if (!auraGroup) { auraGroup = new THREE.Group(); scene.add(auraGroup); }
  if (auraPts) { auraGroup.remove(auraPts); auraPts.geometry.dispose(); auraPts.material.dispose(); auraPts = null; }
  for (const t of auraTrail) { auraGroup.remove(t); t.geometry.dispose(); t.material.dispose(); }
  auraTrail = [];
  auraN = n;
  if (n <= 0) return;
  auraAng = new Float32Array(n); auraRad = new Float32Array(n);
  auraYB = new Float32Array(n); auraSpd = new Float32Array(n); auraPhase = new Float32Array(n);
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    auraAng[i] = (i * 2.39996) % (Math.PI * 2);
    auraRad[i] = 1.3 + ((i * 0.193) % 1) * 1.3;
    auraYB[i] = (((i * 0.371) % 1) * 2 - 1) * 1.2;
    auraSpd[i] = (0.3 + ((i * 0.117) % 1) * 0.6) * (i % 2 ? 1 : -1);
    auraPhase[i] = (i * 1.7) % (Math.PI * 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  auraPts = new THREE.Points(g, new THREE.PointsMaterial({
    color: auraColor, size: 0.08, sizeAttenuation: true,
    transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
  auraGroup.add(auraPts);
  // comet trails — lagging ghost layers (only at High, where n is large)
  if (n >= 50) {
    for (let k = 0; k < 3; k++) {
      const tg = new THREE.BufferGeometry();
      tg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const tp = new THREE.Points(tg, new THREE.PointsMaterial({
        color: auraColor, size: 0.07 - k * 0.012, sizeAttenuation: true,
        transparent: true, opacity: 0.4 - k * 0.11, depthWrite: false, blending: THREE.AdditiveBlending }));
      tp.userData.lag = (k + 1) * 0.09;
      auraGroup.add(tp); auraTrail.push(tp);
    }
  }
}
function auraFill(arr, elapsed, sc) {
  for (let i = 0; i < auraN; i++) {
    const a = auraAng[i] + elapsed * auraSpd[i];
    arr[i * 3] = Math.cos(a) * auraRad[i] * sc;
    arr[i * 3 + 1] = (auraYB[i] + Math.sin(elapsed * 1.5 + auraPhase[i]) * 0.3) * sc;
    arr[i * 3 + 2] = Math.sin(a) * auraRad[i] * sc;
  }
}
function updateAuraParticles(elapsed) {
  if (!auraPts || auraN <= 0) return;
  const sc = currentScale * 1.15;
  auraFill(auraPts.geometry.attributes.position.array, elapsed, sc);
  auraPts.geometry.attributes.position.needsUpdate = true;
  for (const t of auraTrail) {
    auraFill(t.geometry.attributes.position.array, elapsed - t.userData.lag, sc); // ghost lags behind = trail
    t.geometry.attributes.position.needsUpdate = true;
  }
}

// ---- Graphics quality: trade premium effects for framerate ----
const QUALITY_PRESETS = {
  low:    { pixelRatio: 1.0,  maxParts: 12, motes: 14, aura: 0,  env: false, rim: false, veins: false },
  medium: { pixelRatio: 1.25, maxParts: 18, motes: 30, aura: 26, env: false, rim: false, veins: true },
  high:   { pixelRatio: 1.75, maxParts: 28, motes: 60, aura: 54, env: true,  rim: true,  veins: true },
};
let QUALITY = QUALITY_PRESETS.medium;
export function setQuality(level) {
  QUALITY = QUALITY_PRESETS[level] || QUALITY_PRESETS.medium;
  if (renderer) renderer.setPixelRatio(Math.min(window.devicePixelRatio, QUALITY.pixelRatio));
  applyEnvMap(QUALITY.env);
  applyRim(QUALITY.rim);
  if (habitatGroup) rebuildMotes(QUALITY.motes);
  buildAuraParticles(QUALITY.aura);
  applyVeins(QUALITY.veins);
}

// Premium GLSL skin transformations — a shader shell over the body (proven-safe
// ShaderMaterial pattern, like the rim). Crystal = fresnel refraction sparkle;
// Galaxy = twinkling starfield on the flesh. Only built when such a skin is worn.
let skinShell, skinShellMat;
export function setSkinShader(mode, hex) {
  if (!organism) return;
  if (!mode) {
    if (skinShell) { organism.remove(skinShell); if (skinShellMat) skinShellMat.dispose(); skinShell = null; skinShellMat = null; }
    return;
  }
  if (skinShell) {
    skinShellMat.uniforms.uColor.value.setHex(hex);
    skinShellMat.uniforms.uMode.value = mode === "galaxy" ? 2 : 1;
    return;
  }
  try {
    skinShellMat = new THREE.ShaderMaterial({
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color(hex || 0x9fe8ff) }, uTime: { value: 0 }, uMode: { value: mode === "galaxy" ? 2 : 1 } },
      vertexShader: `varying vec3 vN; varying vec3 vView; varying vec3 vPos;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vView = normalize(-mv.xyz);
        vN = normalize(normalMatrix * normal); vPos = position; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uTime; uniform int uMode;
        varying vec3 vN; varying vec3 vView; varying vec3 vPos;
        float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
        void main(){
          float fres = pow(1.0 - max(dot(normalize(vN), normalize(vView)), 0.0), 2.0);
          vec3 col = uColor; float a = fres * 0.55;
          if (uMode == 2) {
            vec3 cell = floor(vPos * 9.0);
            float star = step(0.97, hash(cell));
            float tw = 0.5 + 0.5 * sin(uTime * 3.0 + hash(cell) * 30.0);
            a += star * tw * 0.9;
            col = mix(uColor, vec3(1.0), star * 0.7);
          } else {
            float spark = pow(max(0.0, sin(vPos.x * 18.0 + uTime) * sin(vPos.y * 18.0) * sin(vPos.z * 18.0)), 8.0);
            a += pow(fres, 4.0) * 0.7 + spark * 0.5;
          }
          gl_FragColor = vec4(col * a, a);
        }`,
    });
    skinShell = new THREE.Mesh(organism.geometry, skinShellMat);
    organism.add(skinShell);
  } catch (e) { skinShell = null; skinShellMat = null; }
}

// Vein network — faint glowing strands across the body that flush RED as the
// creature strains toward the metabolic wall. Thin additive lines (cheap).
let veinGroup;
function applyVeins(on) {
  if (!organism) return;
  if (on && !veinGroup) {
    veinGroup = new THREE.Group();
    organism.add(veinGroup);
    for (let s = 0; s < 6; s++) {
      const pts = [], tilt = (s / 6) * Math.PI, yaw = s * 1.3;
      for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.16) {
        const v = new THREE.Vector3(Math.cos(a), Math.sin(a) * Math.cos(tilt), Math.sin(a) * Math.sin(tilt));
        v.applyAxisAngle(UP, yaw).normalize().multiplyScalar(surfaceRadius(v) * 1.02);
        pts.push(v);
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const m = new THREE.LineBasicMaterial({ color: 0xff5a4a, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false });
      veinGroup.add(new THREE.Line(g, m));
    }
  } else if (!on && veinGroup) {
    organism.remove(veinGroup);
    veinGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    veinGroup = null;
  }
}
function updateVeins(elapsed) {
  if (!veinGroup) return;
  const op = 0.05 + stress * 0.6 + (stress > 0.1 ? Math.sin(elapsed * 6) * 0.12 * stress : 0);
  for (const l of veinGroup.children) l.material.opacity = Math.max(0, op);
}
export function maxParts() { return QUALITY.maxParts; }

// Environment map (metallic reflections) — only on at High quality.
let envTex = null;
function applyEnvMap(on) {
  if (!renderer || !scene) return;
  if (on && !envTex) {
    try {
      const ec = document.createElement("canvas"); ec.width = 16; ec.height = 64;
      const ex = ec.getContext("2d");
      const eg = ex.createLinearGradient(0, 0, 0, 64);
      eg.addColorStop(0, "#a9c3e6"); eg.addColorStop(0.5, "#41566f"); eg.addColorStop(1, "#0a0f16");
      ex.fillStyle = eg; ex.fillRect(0, 0, 16, 64);
      const t = new THREE.CanvasTexture(ec); t.mapping = THREE.EquirectangularReflectionMapping;
      const p = new THREE.PMREMGenerator(renderer);
      envTex = p.fromEquirectangular(t).texture; t.dispose(); p.dispose();
    } catch (e) { envTex = null; }
  }
  scene.environment = on ? envTex : null;
}

// Fresnel subsurface-glow shell — only on at High quality (full-body overdraw).
function applyRim(on) {
  if (!organism) return;
  if (on && !rimMesh) {
    rimMat = new THREE.ShaderMaterial({
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color(0x66ffcc) }, uPower: { value: 2.6 }, uIntensity: { value: 0.6 } },
      vertexShader: `varying vec3 vN; varying vec3 vView;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vView = normalize(-mv.xyz);
        vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uPower; uniform float uIntensity; varying vec3 vN; varying vec3 vView;
        void main(){ float f = pow(1.0 - max(dot(normalize(vN), normalize(vView)), 0.0), uPower);
        gl_FragColor = vec4(uColor * f * uIntensity, f * uIntensity); }`,
    });
    rimMesh = new THREE.Mesh(organism.geometry, rimMat);
    organism.add(rimMesh);
  } else if (!on && rimMesh) {
    organism.remove(rimMesh);
    if (rimMat) rimMat.dispose();
    rimMesh = null; rimMat = null; // geometry is shared with the body — don't dispose
  }
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
