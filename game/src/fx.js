import * as THREE from 'three';
const MAX_TRACERS = 24;
const MAX_MUZZLE = 4;
const MAX_BURSTS = 8;
const BURST_PARTICLES = 12;
const MAX_EXPLOSIONS = 2;
const MAX_POOFS = 4;
function makeGlowTexture() {
  if (typeof document === 'undefined') return null;
  const canvasEl = document.createElement('canvas');
  canvasEl.width = 64;
  canvasEl.height = 64;
  const ctx = canvasEl.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,210,122,0.85)');
  gradient.addColorStop(1, 'rgba(255,210,122,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
export function createFx(scene) {
  const glowTexture = makeGlowTexture();
  const tracers = [];
  const muzzles = [];
  const bursts = [];
  const explosions = [];
  const poofs = [];
  const tracerGeometry = new THREE.BoxGeometry(0.035, 0.035, 1);
  for (let i = 0; i < MAX_TRACERS; i += 1) {
    const material = new THREE.MeshBasicMaterial({
      color: '#ffd27a', transparent: true, opacity: 0.9, depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(tracerGeometry, material);
    mesh.frustumCulled = false;
    mesh.visible = false;
    scene.add(mesh);
    tracers.push({ mesh, material, life: 0 });
  }
  for (let i = 0; i < MAX_MUZZLE; i += 1) {
    const material = new THREE.SpriteMaterial({
      map: glowTexture, color: '#ffd27a', transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    sprite.scale.setScalar(0.5);
    scene.add(sprite);
    muzzles.push({ sprite, material, life: 0 });
  }
  for (let i = 0; i < MAX_BURSTS; i += 1) {
    const positions = new Float32Array(BURST_PARTICLES * 3);
    const colors = new Float32Array(BURST_PARTICLES * 3);
    for (let j = 0; j < BURST_PARTICLES; j += 1) {
      colors[j * 3] = 1;
      colors[j * 3 + 1] = 0.72 + (j % 3) * 0.08;
      colors[j * 3 + 2] = 0.25;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: 0.12, vertexColors: true, transparent: true, opacity: 1, depthWrite: false
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    points.visible = false;
    scene.add(points);
    bursts.push({
      points, geometry, material, positions,
      velocities: new Float32Array(BURST_PARTICLES * 3), life: 0
    });
  }
  const explosionLight = new THREE.PointLight(0xffa743, 0, 20, 1.6);
  scene.add(explosionLight);
  let explosionLightLife = 0;
  for (let i = 0; i < MAX_EXPLOSIONS; i += 1) {
    const flashMaterial = new THREE.SpriteMaterial({
      map: glowTexture, color: '#ffd27a', transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false
    });
    const flash = new THREE.Sprite(flashMaterial);
    flash.visible = false;
    scene.add(flash);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: '#ffb347', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.55, 24), ringMaterial);
    ring.visible = false;
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);
    explosions.push({ flash, flashMaterial, ring, ringMaterial, life: 0 });
  }
  for (let i = 0; i < MAX_POOFS; i += 1) {
    const material = new THREE.SpriteMaterial({
      map: glowTexture, color: '#9aa0a8', transparent: true, opacity: 0, depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    scene.add(sprite);
    poofs.push({ sprite, material, life: 0 });
  }
  function tracer(from, to, color = '#ffd27a') {
    const slot = tracers.find(t => t.life <= 0) || tracers[0];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
    slot.mesh.position.set((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
    slot.mesh.scale.set(1, 1, len);
    slot.mesh.lookAt(to.x, to.y, to.z);
    slot.material.color.set(color);
    slot.material.opacity = 0.9;
    slot.mesh.visible = true;
    slot.life = 0.06;
  }
  function muzzle(pos, scale = 0.5) {
    const slot = muzzles.find(m => m.life <= 0) || muzzles[0];
    slot.sprite.position.copy(pos);
    slot.sprite.scale.setScalar(scale);
    slot.material.opacity = 0.95;
    slot.sprite.visible = true;
    slot.life = 0.07;
  }
  function burstAt(pos, normal, burst) {
    for (let j = 0; j < BURST_PARTICLES; j += 1) {
      burst.positions[j * 3] = pos.x;
      burst.positions[j * 3 + 1] = pos.y;
      burst.positions[j * 3 + 2] = pos.z;
      const spread = 2.2;
      burst.velocities[j * 3] = normal.x * 3 + (Math.random() - 0.5) * spread * 2;
      burst.velocities[j * 3 + 1] = Math.abs(normal.y) * 2 + Math.random() * 2.4;
      burst.velocities[j * 3 + 2] = normal.z * 3 + (Math.random() - 0.5) * spread * 2;
    }
    burst.geometry.attributes.position.needsUpdate = true;
    burst.material.opacity = 1;
    burst.points.visible = true;
    burst.life = 0.4;
  }
  function impact(pos, normal) {
    const slot = bursts.find(b => b.life <= 0) || bursts[0];
    burstAt(pos, normal, slot);
  }
  function explosion(pos) {
    const slot = explosions.find(e => e.life <= 0) || explosions[0];
    slot.flash.position.copy(pos);
    slot.flash.scale.setScalar(2.2);
    slot.flashMaterial.opacity = 0.95;
    slot.flash.visible = true;
    slot.ring.position.copy(pos);
    slot.ring.position.y = Math.max(0.15, pos.y - 0.4);
    slot.ring.scale.setScalar(0.5);
    slot.ringMaterial.opacity = 0.8;
    slot.ring.visible = true;
    slot.life = 0.5;
    explosionLight.position.copy(pos);
    explosionLight.intensity = 8;
    explosionLightLife = 0.35;
    impact(pos, new THREE.Vector3(0, 1, 0));
  }
  function death(pos) {
    const slot = poofs.find(p => p.life <= 0) || poofs[0];
    slot.sprite.position.copy(pos);
    slot.sprite.position.y = Math.max(0.6, pos.y + 0.4);
    slot.sprite.scale.setScalar(0.8);
    slot.material.opacity = 0.5;
    slot.sprite.visible = true;
    slot.life = 0.6;
  }
  function step(dt) {
    const elapsed = Math.max(0, dt);
    for (const slot of tracers) {
      if (slot.life <= 0) continue;
      slot.life -= elapsed;
      if (slot.life <= 0) slot.mesh.visible = false;
      else slot.material.opacity = 0.9 * (slot.life / 0.06);
    }
    for (const slot of muzzles) {
      if (slot.life <= 0) continue;
      slot.life -= elapsed;
      if (slot.life <= 0) slot.sprite.visible = false;
      else slot.material.opacity = 0.95 * (slot.life / 0.07);
    }
    for (const slot of bursts) {
      if (slot.life <= 0) continue;
      slot.life -= elapsed;
      if (slot.life <= 0) {
        slot.points.visible = false;
        continue;
      }
      for (let j = 0; j < BURST_PARTICLES; j += 1) {
        slot.velocities[j * 3 + 1] -= 5 * elapsed;
        slot.positions[j * 3] += slot.velocities[j * 3] * elapsed;
        slot.positions[j * 3 + 1] += slot.velocities[j * 3 + 1] * elapsed;
        slot.positions[j * 3 + 2] += slot.velocities[j * 3 + 2] * elapsed;
        if (slot.positions[j * 3 + 1] < 0.03) slot.positions[j * 3 + 1] = 0.03;
      }
      slot.geometry.attributes.position.needsUpdate = true;
      slot.material.opacity = slot.life / 0.4;
    }
    for (const slot of explosions) {
      if (slot.life <= 0) continue;
      slot.life -= elapsed;
      if (slot.life <= 0) {
        slot.flash.visible = false;
        slot.ring.visible = false;
        continue;
      }
      const t = slot.life / 0.5;
      slot.flashMaterial.opacity = 0.95 * t;
      slot.flash.scale.setScalar(2.2 + (1 - t) * 1.2);
      slot.ringMaterial.opacity = 0.8 * t;
      slot.ring.scale.setScalar(0.5 + (1 - t) * 5.5);
    }
    for (const slot of poofs) {
      if (slot.life <= 0) continue;
      slot.life -= elapsed;
      if (slot.life <= 0) {
        slot.sprite.visible = false;
        continue;
      }
      const t = slot.life / 0.6;
      slot.material.opacity = 0.5 * t;
      slot.sprite.scale.setScalar(0.8 + (1 - t) * 1.0);
    }
    if (explosionLightLife > 0) {
      explosionLightLife -= elapsed;
      explosionLight.intensity = Math.max(0, explosionLightLife * 22);
    }
  }
  function reset() {
    for (const slot of tracers) { slot.life = 0; slot.mesh.visible = false; }
    for (const slot of muzzles) { slot.life = 0; slot.sprite.visible = false; }
    for (const slot of bursts) { slot.life = 0; slot.points.visible = false; }
    for (const slot of explosions) {
      slot.life = 0;
      slot.flash.visible = false;
      slot.ring.visible = false;
    }
    for (const slot of poofs) { slot.life = 0; slot.sprite.visible = false; }
    explosionLight.intensity = 0;
    explosionLightLife = 0;
  }
  return { tracer, muzzle, impact, explosion, death, step, reset };
}