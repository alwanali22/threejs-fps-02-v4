import * as THREE from 'three';
import { GRENADE_DEFS } from './weapons.js';
const MAX_LIVE = 6;
const MAX_CLOUDS = 3;
const SMOKE_PUFFS = 6;
const GRAVITY = 9.8;
const GROUND_Y = 0.09;
const PUFF_OFFSETS = [
  new THREE.Vector3(0, 0.9, 0),
  new THREE.Vector3(0.55, 0.5, 0.3),
  new THREE.Vector3(-0.5, 0.6, 0.35),
  new THREE.Vector3(0.3, 0.4, -0.55),
  new THREE.Vector3(-0.35, 0.45, -0.5),
  new THREE.Vector3(0, 1.35, -0.1)
];
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
export function createGrenadeField(scene, hooks = {}) {
  const live = [];
  const clouds = [];
  let time = 0;
  const grenadeGeometry = new THREE.SphereGeometry(0.09, 8, 6);
  const grenadeMaterial = new THREE.MeshStandardMaterial({ color: '#2c323a', roughness: 0.6, metalness: 0.4 });
  const puffGeometry = new THREE.SphereGeometry(1, 10, 8);
  const puffMaterial = new THREE.MeshBasicMaterial({
    color: '#9aa0a8', transparent: true, opacity: 0.55, depthWrite: false
  });
  for (let i = 0; i < MAX_LIVE; i += 1) {
    const mesh = new THREE.Mesh(grenadeGeometry, grenadeMaterial);
    mesh.visible = false;
    mesh.castShadow = true;
    scene.add(mesh);
    live.push({ mesh, type: null, pos: mesh.position, vel: new THREE.Vector3(), fuse: 0, alive: false });
  }
  for (let i = 0; i < MAX_CLOUDS; i += 1) {
    const group = new THREE.Group();
    group.visible = false;
    const puffs = [];
    for (let j = 0; j < SMOKE_PUFFS; j += 1) {
      const puff = new THREE.Mesh(puffGeometry, puffMaterial.clone());
      puff.visible = false;
      group.add(puff);
      puffs.push(puff);
    }
    scene.add(group);
    clouds.push({ group, puffs, pos: new THREE.Vector3(), radius: 6, until: 0, active: false });
  }
  function throwGrenade(type, pos, dir) {
    const def = GRENADE_DEFS[type];
    if (!def) return false;
    const slot = live.find(g => !g.alive);
    if (!slot) return false;
    slot.type = type;
    slot.pos.copy(pos);
    slot.vel.copy(dir);
    slot.fuse = def.fuse;
    slot.alive = true;
    slot.mesh.visible = true;
    return true;
  }
  function spawnSmoke(pos, radius, seconds) {
    const slot = clouds.find(c => !c.active);
    if (!slot) return false;
    slot.pos.copy(pos);
    slot.pos.y = Math.max(0.9, pos.y);
    slot.radius = radius;
    slot.until = time + seconds;
    slot.active = true;
    slot.group.visible = true;
    slot.group.position.copy(slot.pos);
    for (let j = 0; j < SMOKE_PUFFS; j += 1) {
      const puff = slot.puffs[j];
      puff.visible = true;
      puff.position.copy(PUFF_OFFSETS[j]).multiplyScalar(radius * 0.55);
      puff.scale.setScalar(radius * 0.38);
      puff.material.opacity = 0.45;
    }
    return true;
  }
  function resolve(slot) {
    const def = GRENADE_DEFS[slot.type];
    slot.alive = false;
    slot.mesh.visible = false;
    if (!def) return;
    if (slot.type === 'frag') {
      hooks.onFrag?.(slot.pos, def.radius, def.damage);
    } else if (slot.type === 'flash') {
      hooks.onFlash?.(slot.pos, def.radius, def.seconds);
    } else if (slot.type === 'smoke') {
      spawnSmoke(slot.pos, def.radius, def.seconds);
      hooks.onSmoke?.(slot.pos, def.radius, def.seconds);
    }
  }
  function smokeBlocks(from, to) {
    for (const cloud of clouds) {
      if (!cloud.active) continue;
      tmpA.subVectors(to, from);
      const lenSq = tmpA.lengthSq();
      if (lenSq <= 0.000001) continue;
      tmpB.subVectors(cloud.pos, from);
      const t = Math.max(0, Math.min(1, tmpB.dot(tmpA) / lenSq));
      tmpC.copy(from).addScaledVector(tmpA, t);
      if (tmpC.distanceToSquared(cloud.pos) < cloud.radius * cloud.radius) return true;
    }
    return false;
  }
  function step(dt) {
    const elapsed = Math.max(0, dt);
    time += elapsed;
    for (const slot of live) {
      if (!slot.alive) continue;
      slot.fuse -= elapsed;
      slot.vel.y -= GRAVITY * elapsed;
      slot.pos.addScaledVector(slot.vel, elapsed);
      if (slot.pos.y < GROUND_Y) {
        slot.pos.y = GROUND_Y;
        slot.vel.y *= -0.45;
        slot.vel.x *= 0.7;
        slot.vel.z *= 0.7;
      }
      if (slot.fuse <= 0) resolve(slot);
    }
    for (const cloud of clouds) {
      if (!cloud.active) continue;
      const remain = cloud.until - time;
      if (remain <= 0) {
        cloud.active = false;
        cloud.group.visible = false;
        for (const puff of cloud.puffs) puff.visible = false;
        continue;
      }
      const age = Math.max(0, 1 - remain / 12);
      const grow = 1 + age * 0.35;
      const fade = remain < 3 ? 0.12 + 0.33 * (remain / 3) : 0.45;
      for (let j = 0; j < SMOKE_PUFFS; j += 1) {
        const puff = cloud.puffs[j];
        puff.scale.setScalar(cloud.radius * 0.38 * grow);
        puff.material.opacity = fade;
      }
    }
  }
  function reset() {
    time = 0;
    for (const slot of live) {
      slot.alive = false;
      slot.mesh.visible = false;
    }
    for (const cloud of clouds) {
      cloud.active = false;
      cloud.group.visible = false;
      for (const puff of cloud.puffs) puff.visible = false;
    }
  }
  return {
    get time() { return time; },
    smokeVolumes: clouds.filter(c => c.active).map(c => ({ pos: c.pos, radius: c.radius, until: c.until })),
    throw: throwGrenade,
    spawnSmoke,
    smokeBlocks,
    step,
    reset
  };
}