import * as THREE from 'three';
import { hairline, accent } from './palette.js';
export const WEAPON_DEFS = {
  p9: {
    id: 'p9', name: 'P9', price: 0, mag: 12, reserve: 36, damage: 26,
    headMult: 4, fireGap: 0.16, auto: false, reloadTime: 1.4,
    spreadStill: 0.004, spreadMove: 0.014, spreadAir: 0.035,
    recoilPitch: 0.006, recoilYaw: 0.003, range: 55, moveSpeed: 1,
    tracer: accent
  },
  vk7: {
    id: 'vk7', name: 'VK-7', price: 2700, mag: 30, reserve: 90, damage: 34,
    headMult: 4, fireGap: 0.096, auto: true, reloadTime: 1.9,
    spreadStill: 0.0022, spreadMove: 0.012, spreadAir: 0.04,
    recoilPitch: 0.014, recoilYaw: 0.006, range: 90, moveSpeed: 0.92,
    tracer: accent
  },
  kx9: {
    id: 'kx9', name: 'KX-9', price: 1500, mag: 32, reserve: 96, damage: 24,
    headMult: 4, fireGap: 0.075, auto: true, reloadTime: 1.7,
    spreadStill: 0.0045, spreadMove: 0.022, spreadAir: 0.045,
    recoilPitch: 0.011, recoilYaw: 0.008, range: 65, moveSpeed: 0.98,
    tracer: '#5fb8a6'
  },
  lr88: {
    id: 'lr88', name: 'LR-88', price: 4750, mag: 5, reserve: 15, damage: 95,
    headMult: 4, fireGap: 0.9, auto: false, reloadTime: 2.6,
    spreadStill: 0.0006, spreadMove: 0.02, spreadAir: 0.05,
    recoilPitch: 0.05, recoilYaw: 0.012, range: 120, moveSpeed: 0.84,
    scoped: true, zoom: 2.4,
    tracer: '#e9e6df'
  }
};
export const GRENADE_DEFS = {
  frag: {
    id: 'frag', name: 'Frag', price: 300, fuse: 1.6, radius: 9, damage: 120,
    key: '5', desc: 'Blast damage'
  },
  flash: {
    id: 'flash', name: 'Flash', price: 200, fuse: 1.1, radius: 14, seconds: 2.5,
    key: '6', desc: 'Blinds lookers'
  },
  smoke: {
    id: 'smoke', name: 'Smoke', price: 300, fuse: 1.2, radius: 6, seconds: 12,
    key: '7', desc: 'Blocks sight 12s'
  }
};
export const GRENADE_ORDER = ['frag', 'flash', 'smoke'];
export const GRENADE_MAX_CARRY = 2;
export const GRENADE_DEF = GRENADE_DEFS.frag;
export const KEVLAR_DEF = {
  name: 'Kevlar vest',
  price: 650,
  reduction: 0.25
};
export const HELMET_DEF = {
  name: 'Helmet',
  price: 350,
  reduction: 0.5
};
const weaponIds = Object.keys(WEAPON_DEFS);
export function createWeaponSet(camera) {
  const state = {
    current: 'p9',
    weapons: {
      p9: { mag: WEAPON_DEFS.p9.mag, reserve: WEAPON_DEFS.p9.reserve }
    },
    grenades: { frag: 0, flash: 0, smoke: 0 },
    kevlar: false,
    helmet: false
  };
  const fillLight = new THREE.PointLight(0xffe0b0, 0.55, 2.5, 2);
  fillLight.position.set(0, 0.35, 0.4);
  camera.add(fillLight);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: '#3a3f45',
    roughness: 0.65,
    metalness: 0.25
  });
  const gripMaterial = new THREE.MeshStandardMaterial({
    color: hairline,
    roughness: 0.85
  });
  const sightMaterial = new THREE.MeshStandardMaterial({
    color: accent,
    roughness: 0.45,
    metalness: 0.15
  });
  const flashMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd07a,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const models = {};
  const modelStates = {};
  for (const id of weaponIds) {
    const group = new THREE.Group();
    group.name = `${WEAPON_DEFS[id].name} view model`;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.13, 0.48), bodyMaterial);
    body.position.set(0, 0, -0.11);
    group.add(body);
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.32), gripMaterial);
    barrel.position.set(0, 0.015, -0.47);
    group.add(barrel);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.2, 0.13), gripMaterial);
    grip.position.set(0, -0.14, 0.02);
    grip.rotation.x = -0.13;
    group.add(grip);
    const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.17, 0.1), gripMaterial);
    magazine.position.set(0, -0.13, -0.16);
    magazine.rotation.x = 0.18;
    group.add(magazine);
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.09, 0.24), bodyMaterial);
    handguard.position.set(0, -0.01, -0.38);
    group.add(handguard);
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.035, 0.065), sightMaterial);
    sight.position.set(0, 0.09, -0.1);
    group.add(sight);
    for (const sx of [-0.045, 0.045]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.05, 0.018), sightMaterial);
      post.position.set(sx, 0.085, 0.02);
      group.add(post);
    }
    const frontPost = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.02), sightMaterial);
    frontPost.position.set(0, 0.075, -0.52);
    group.add(frontPost);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.1), gripMaterial);
    hand.position.set(0.01, -0.15, 0.03);
    hand.rotation.x = -0.13;
    group.add(hand);
    const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), flashMaterial);
    flash.position.set(0, 0.015, -0.66);
    flash.visible = false;
    group.add(flash);
    const light = new THREE.PointLight(0xffbb55, 0, 2.2, 2);
    light.position.set(0, 0.05, -0.9);
    group.add(light);
    group.position.set(0.28, -0.24, -0.48);
    group.visible = id === state.current;
    camera.add(group);
    models[id] = group;
    modelStates[id] = { flash, light, flashTime: 0, kick: 0, reload: 0 };
  }
  let fireCooldown = 0;
  let heat = 0;
  let reloading = false;
  let reloadTimeLeft = 0;
  let reloadWeapon = null;
  const casings = [];
  const casingMaterial = new THREE.MeshStandardMaterial({
    color: '#c9a227', metalness: 0.7, roughness: 0.35
  });
  for (let i = 0; i < 4; i += 1) {
    const casing = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.018, 0.05), casingMaterial);
    casing.visible = false;
    camera.add(casing);
    casings.push({ mesh: casing, vx: 0, vy: 0, vz: 0, spin: 0, life: 0 });
  }
  function ejectCasing() {
    const slot = casings.find(c => c.life <= 0) || casings[0];
    const group = models[state.current];
    slot.mesh.position.set(
      group.position.x + 0.1, group.position.y + 0.04, group.position.z - 0.1
    );
    slot.mesh.rotation.set(0, 0, 0);
    slot.vx = 0.7 + Math.random() * 0.5;
    slot.vy = 1.1 + Math.random() * 0.5;
    slot.vz = 0.2 + Math.random() * 0.3;
    slot.spin = 8 + Math.random() * 8;
    slot.life = 0.5;
    slot.mesh.visible = true;
  }
  function def(id = state.current) {
    return WEAPON_DEFS[id] || null;
  }
  function select(id) {
    if (!WEAPON_DEFS[id] || !state.weapons[id]) return false;
    if (state.current === id) return true;
    for (const key of weaponIds) models[key].visible = key === id;
    state.current = id;
    reloading = false;
    reloadTimeLeft = 0;
    return true;
  }
  function buy(id, money) {
    const weapon = WEAPON_DEFS[id];
    if (!weapon || id === 'p9' || state.weapons[id] || money < weapon.price) return -1;
    state.weapons[id] = { mag: weapon.mag, reserve: weapon.reserve };
    select(id);
    return weapon.price;
  }
  function buyGrenade(id, money) {
    const grenade = GRENADE_DEFS[id];
    if (!grenade || money < grenade.price) return -1;
    if (state.grenades[id] >= GRENADE_MAX_CARRY) return -1;
    state.grenades[id] += 1;
    return grenade.price;
  }
  function takeGrenade(id) {
    if (!GRENADE_DEFS[id] || state.grenades[id] <= 0) return false;
    state.grenades[id] -= 1;
    return true;
  }
  function buyKevlar(money) {
    if (state.kevlar || money < KEVLAR_DEF.price) return -1;
    state.kevlar = true;
    return KEVLAR_DEF.price;
  }
  function buyHelmet(money) {
    if (state.helmet || money < HELMET_DEF.price) return -1;
    state.helmet = true;
    return HELMET_DEF.price;
  }
  function give(id) {
    const weapon = WEAPON_DEFS[id];
    if (!weapon) return false;
    state.weapons[id] = { mag: weapon.mag, reserve: weapon.reserve };
    select(id);
    return true;
  }
  function resetLoadout() {
    state.weapons = {
      p9: { mag: WEAPON_DEFS.p9.mag, reserve: WEAPON_DEFS.p9.reserve }
    };
    state.grenades = { frag: 0, flash: 0, smoke: 0 };
    state.kevlar = false;
    state.helmet = false;
    state.current = 'p9';
    reloading = false;
    reloadTimeLeft = 0;
    fireCooldown = 0;
    heat = 0;
    for (const id of weaponIds) models[id].visible = id === 'p9';
  }
  function ready() {
    return !reloading && fireCooldown <= 0 && Boolean(state.weapons[state.current]);
  }
  function takeRound() {
    const ammo = state.weapons[state.current];
    if (!ammo || ammo.mag <= 0 || !ready()) return false;
    ammo.mag -= 1;
    fireCooldown = def().fireGap;
    heat = Math.min(1, heat + 0.09);
    const animation = modelStates[state.current];
    animation.kick = 1;
    animation.flashTime = 0.06;
    animation.flash.visible = true;
    animation.light.intensity = 0.25;
    ejectCasing();
    return true;
  }
  function pullTrigger() {
    return takeRound();
  }
  function reload() {
    const ammo = state.weapons[state.current];
    const weapon = def();
    if (!ammo || reloading || ammo.mag >= weapon.mag || ammo.reserve <= 0) return false;
    reloading = true;
    reloadTimeLeft = weapon.reloadTime;
    reloadWeapon = state.current;
    modelStates[state.current].reload = 1;
    return true;
  }
  function step(dt) {
    const elapsed = Math.max(0, dt);
    fireCooldown = Math.max(0, fireCooldown - elapsed);
    heat = Math.max(0, heat - elapsed * 0.5);
    for (const casing of casings) {
      if (casing.life <= 0) continue;
      casing.life -= elapsed;
      if (casing.life <= 0) {
        casing.mesh.visible = false;
        continue;
      }
      casing.vy -= 6 * elapsed;
      casing.mesh.position.x += casing.vx * elapsed;
      casing.mesh.position.y += casing.vy * elapsed;
      casing.mesh.position.z += casing.vz * elapsed;
      casing.mesh.rotation.x += casing.spin * elapsed;
      casing.mesh.rotation.z += casing.spin * 0.6 * elapsed;
    }
    for (const id of weaponIds) {
      const animation = modelStates[id];
      animation.flashTime = Math.max(0, animation.flashTime - elapsed);
      animation.flash.visible = animation.flashTime > 0;
      animation.light.intensity = animation.flashTime > 0 ? 0.25 : 0;
      animation.kick = Math.max(0, animation.kick - elapsed * 5);
      animation.reload = Math.max(0, animation.reload - elapsed * 1.8);
      const group = models[id];
      group.position.z = -0.48 + animation.kick * 0.055 + animation.reload * 0.12;
      group.position.y = -0.24 - animation.reload * 0.09;
      group.rotation.x = animation.kick * 0.09 + animation.reload * 0.12;
    }
    if (reloading) {
      reloadTimeLeft -= elapsed;
      if (reloadTimeLeft <= 0) {
        const ammo = state.weapons[reloadWeapon];
        const weapon = WEAPON_DEFS[reloadWeapon];
        if (ammo && weapon) {
          const loaded = Math.min(weapon.mag - ammo.mag, ammo.reserve);
          ammo.mag += loaded;
          ammo.reserve -= loaded;
        }
        reloading = false;
        reloadTimeLeft = 0;
        reloadWeapon = null;
      }
    }
  }
  function spread(moveSpeed = 0) {
    const weapon = def();
    if (!weapon) return 0;
    const moveFactor = weapon.spreadMove * Math.max(0, Math.min(1, moveSpeed));
    return weapon.spreadStill + moveFactor + weapon.spreadAir * 0 + heat * 0.02;
  }
  function muzzle() {
    const animation = modelStates[state.current];
    return animation ? { flash: animation.flash, light: animation.light } : null;
  }
  function refill() {
    for (const id of weaponIds) {
      const ammo = state.weapons[id];
      if (!ammo) continue;
      ammo.mag = WEAPON_DEFS[id].mag;
      ammo.reserve = WEAPON_DEFS[id].reserve;
    }
  }
  return {
    state,
    def,
    select,
    buy,
    buyGrenade,
    takeGrenade,
    buyKevlar,
    buyHelmet,
    give,
    resetLoadout,
    step,
    ready,
    pullTrigger,
    takeRound,
    reload,
    spread,
    get heat() { return heat; },
    muzzle,
    refill
  };
}