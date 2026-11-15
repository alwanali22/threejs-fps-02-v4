import * as THREE from 'three';
import { ink, accent } from './palette.js';
const teal = '#5fb8a6';
const SKY = '#c96f3e';
const geometryCache = new Map();
function boxGeometry(x, y, z) {
  const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
  let geometry = geometryCache.get(key);
  if (!geometry) {
    geometry = new THREE.BoxGeometry(x, y, z);
    geometryCache.set(key, geometry);
  }
  return geometry;
}
function makeSign(text, width, height, bg = '#1e2228', fg = '#f0a830') {
  const canvasEl = document.createElement('canvas');
  canvasEl.width = 512;
  canvasEl.height = 128;
  const ctx = canvasEl.getContext('2d');
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);
  }
  ctx.fillStyle = fg;
  let fontSize = 64;
  ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
  while (ctx.measureText(text).width > 480 && fontSize > 20) {
    fontSize -= 2;
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 68);
  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, transparent: !bg })
  );
  return mesh;
}
function makeGlowTexture(inner, outer) {
  const canvasEl = document.createElement('canvas');
  canvasEl.width = 256;
  canvasEl.height = 256;
  const ctx = canvasEl.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.45, outer);
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
export function createWorld(scene) {
  const group = new THREE.Group();
  group.name = 'Kestrel Yard';
  const materials = {
    ground: new THREE.MeshStandardMaterial({ color: '#8a6a48', roughness: 0.96 }),
    wall: new THREE.MeshStandardMaterial({ color: '#7d6355', roughness: 0.9 }),
    container: new THREE.MeshStandardMaterial({ color: '#4a7a6c', roughness: 0.78 }),
    containerAlt: new THREE.MeshStandardMaterial({ color: '#c05a30', roughness: 0.78 }),
    containerBlue: new THREE.MeshStandardMaterial({ color: '#3a6a8a', roughness: 0.78 }),
    skyline: new THREE.MeshStandardMaterial({ color: '#4a3656', roughness: 1 }),
    decal: new THREE.MeshStandardMaterial({ color: '#33291f', roughness: 1 }),
    crate: new THREE.MeshStandardMaterial({ color: '#9a6f42', roughness: 0.88 }),
    dark: new THREE.MeshStandardMaterial({ color: '#5a4a42', roughness: 0.82 }),
    rib: new THREE.MeshStandardMaterial({ color: '#3a3f45', roughness: 0.85 }),
    trim: new THREE.MeshStandardMaterial({ color: ink, roughness: 0.72 }),
    accent: new THREE.MeshStandardMaterial({ color: accent, roughness: 0.7 }),
    teal: new THREE.MeshStandardMaterial({ color: teal, roughness: 0.75 }),
    tank: new THREE.MeshStandardMaterial({ color: '#a89a88', metalness: 0.35, roughness: 0.6 }),
    pipe: new THREE.MeshStandardMaterial({ color: '#98a0a8', metalness: 0.45, roughness: 0.55 }),
    sandbag: new THREE.MeshStandardMaterial({ color: '#8a724e', roughness: 0.95 }),
    lamp: new THREE.MeshStandardMaterial({
      color: '#3a3f45', emissive: '#ffd27a', emissiveIntensity: 2.6, roughness: 0.6
    })
  };
  const colliders = [];
  const shootables = [];
  function addBox(x, y, z, sx, sy, sz, material, options = {}) {
    const mesh = new THREE.Mesh(boxGeometry(sx, sy, sz), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = options.castShadow !== false;
    mesh.receiveShadow = true;
    mesh.name = options.name || 'yard-solid';
    group.add(mesh);
    const collider = new THREE.Box3(
      new THREE.Vector3(x - sx / 2, y - sy / 2, z - sz / 2),
      new THREE.Vector3(x + sx / 2, y + sy / 2, z + sz / 2)
    );
    colliders.push(collider);
    shootables.push(mesh);
    return mesh;
  }
  function addCrate(x, z, sx = 1, sz = 1, sy = 0.95, striped = false) {
    addBox(x, sy / 2, z, sx, sy, sz, materials.crate, { name: 'cargo-crate' });
    if (striped) {
      addBox(x, sy + 0.025, z, sx + 0.025, 0.05, sz + 0.025, materials.accent, {
        name: 'crate-stripe',
        castShadow: false
      });
    }
  }
  function addContainer(x, z, sx = 6.2, sz = 2.35, sy = 2.6, material = materials.container) {
    addBox(x, sy / 2, z, sx, sy, sz, material, { name: 'cargo-container' });
    const ribCount = Math.max(3, Math.floor(sx / 1.35));
    for (let i = 0; i < ribCount; i += 1) {
      const rx = x - sx / 2 + 0.35 + (sx - 0.7) * i / (ribCount - 1);
      addBox(rx, sy / 2, z - sz / 2 - 0.018, 0.075, sy - 0.12, 0.045, materials.rib, {
        name: 'container-rib',
        castShadow: false
      });
    }
  }
  function addCylinder(x, y, z, radius, length, material, axis = 'x') {
    const geometry = new THREE.CylinderGeometry(radius, radius, length, 16, 1);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    if (axis === 'x') mesh.rotation.z = Math.PI / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'fuel-yard-metal';
    group.add(mesh);
    const halfX = axis === 'x' ? length / 2 : radius;
    const halfZ = axis === 'z' ? length / 2 : radius;
    colliders.push(new THREE.Box3(
      new THREE.Vector3(x - halfX, y - radius, z - halfZ),
      new THREE.Vector3(x + halfX, y + radius, z + halfZ)
    ));
    shootables.push(mesh);
    return mesh;
  }
  function addFlat(x, z, sx, sz, material, name = 'yard-marking') {
    const mesh = new THREE.Mesh(boxGeometry(sx, 0.02, sz), material);
    mesh.position.set(x, 0.012, z);
    mesh.receiveShadow = true;
    mesh.name = name;
    group.add(mesh);
    return mesh;
  }
  const ground = new THREE.Mesh(boxGeometry(56, 0.2, 40), materials.ground);
  ground.position.set(0, -0.12, 0);
  ground.receiveShadow = true;
  ground.name = 'yard-ground';
  group.add(ground);
  addBox(0, 2.5, -20, 56, 5, 0.7, materials.wall, { name: 'north-perimeter' });
  addBox(0, 2.5, 20, 56, 5, 0.7, materials.wall, { name: 'south-perimeter' });
  addBox(-28, 2.5, 0, 0.7, 5, 40, materials.wall, { name: 'west-perimeter' });
  addBox(28, 2.5, 0, 0.7, 5, 40, materials.wall, { name: 'east-perimeter' });
  addBox(0, 5.1, -16.1, 12.8, 0.55, 7.4, materials.dark, { name: 'hangar-roof' });
  addBox(0, 2.5, -19.55, 12.8, 5, 0.45, materials.wall, { name: 'hangar-back' });
  addBox(-6.2, 2.5, -15.8, 0.55, 5, 7.4, materials.wall, { name: 'hangar-side' });
  addBox(6.2, 2.5, -15.8, 0.55, 5, 7.4, materials.wall, { name: 'hangar-side' });
  for (const x of [-4.2, 0, 4.2]) {
    addBox(x, 2.45, -12.2, 0.38, 4.9, 0.38, materials.trim, { name: 'hangar-pillar' });
  }
  addCrate(-3.8, -17.3, 1.5, 1.1, 1.2);
  addCrate(3.5, -17.5, 1.3, 1.2, 1.05, true);
  addCrate(0, -18.45, 1.2, 0.75, 0.9);
  addContainer(-6.8, -4.5, 7.1);
  addContainer(-6.8, 0.3, 7.1);
  addContainer(6.8, -4.5, 7.1, 7.1, 2.35, 2.6, materials.containerAlt);
  addContainer(6.8, 0.3, 7.1, 7.1, 2.35, 2.6, materials.containerAlt);
  addBox(-6.8, 3.9, -4.5, 6.2, 2.6, 2.35, materials.containerBlue, { name: 'stacked-container' });
  addBox(-1.9, 1.3, -2.1, 0.18, 2.6, 0.22, materials.accent, { name: 'door-marker' });
  addBox(1.9, 1.3, -2.1, 0.18, 2.6, 0.22, materials.teal, { name: 'door-marker' });
  addCrate(-17, -9.5, 1.2, 1.15, 1.05, true);
  addCrate(-20.5, -3.5, 1, 1, 0.95);
  addCrate(-16.5, 4, 1.1, 1, 1.05);
  addCrate(-22, 10, 1.25, 1.1, 1.1, true);
  addCrate(17, -9.5, 1.05, 1, 0.95);
  addCrate(21.5, -2, 1, 1.1, 1.05, true);
  addCrate(17, 4, 1.1, 1.05, 1);
  addBox(21.5, 2.2, -5.5, 5.6, 0.35, 4.2, materials.dark, { name: 'watchtower-platform' });
  for (let i = 0; i < 4; i += 1) {
    const height = 0.55 * (i + 1);
    addBox(19.1, height / 2, -2.35 + i * 0.78, 1.7, height, 0.82, materials.wall, {
      name: 'watchtower-stair'
    });
  }
  addBox(21.5, 1.35, -7.62, 0.24, 2.7, 0.24, materials.teal, { name: 'tower-post' });
  for (const z of [9.4, 14.1]) {
    addCylinder(20.5, 1.65, z, 0.95, 5.8, materials.tank);
    for (const x of [18.5, 22.5]) {
      addBox(x, 0.62, z, 0.42, 1.24, 1.45, materials.wall, { name: 'tank-saddle' });
    }
    addCylinder(20.5, 2.66, z, 0.1, 5.6, materials.pipe, 'z');
  }
  addCylinder(23.45, 0.8, 11.75, 0.12, 5.2, materials.pipe, 'z');
  addCylinder(23.45, 0.8, 9.15, 0.12, 5.9, materials.pipe);
  addCrate(15.8, 16.1, 1.05, 1, 1, true);
  addCrate(25.1, 7.2, 0.95, 1, 0.9);
  addCrate(-11.2, 9.2, 1, 1.1, 1);
  addCrate(-8.7, 13.7, 1.1, 0.9, 0.95);
  addCrate(10.5, 12.7, 1, 1, 0.95);
  addCrate(11, -11.2, 1, 0.9, 1.05);
  if (typeof document !== 'undefined') {
    const signA = makeSign('SITE A — HANGAR', 4.5, 1.0);
    signA.position.set(0, 3.4, -19.28);
    group.add(signA);
    const signB = makeSign('SITE B — FUEL DEPOT', 6.5, 1.4);
    signB.position.set(20, 2.6, 19.62);
    signB.rotation.y = Math.PI;
    group.add(signB);
    const stencilWest = makeSign('EMB-04', 2.4, 0.6, null, '#1e2228');
    stencilWest.position.set(-6.8, 1.5, -3.3);
    group.add(stencilWest);
    const stencilEast = makeSign('KST-11', 2.4, 0.6, null, '#1e2228');
    stencilEast.position.set(6.8, 1.5, 1.5);
    group.add(stencilEast);
    const stencilStack = makeSign('KST-07', 2.4, 0.6, null, '#1e2228');
    stencilStack.position.set(-6.8, 3.9, -3.3);
    group.add(stencilStack);
    const sunTexture = makeGlowTexture('rgba(255,190,120,1)', 'rgba(255,120,50,0.6)');
    const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: sunTexture, transparent: true, opacity: 0.95, fog: false, depthWrite: false
    }));
    sunSprite.position.set(-24, 16, -55);
    sunSprite.scale.set(26, 26, 1);
    sunSprite.name = 'sun-disc';
    group.add(sunSprite);
    const cloudTexture = makeGlowTexture('rgba(255,190,150,0.85)', 'rgba(200,120,140,0.4)');
    for (const [cx, cy, cz, cw] of [
      [-20, 42, -42, 38], [15, 48, -38, 44], [32, 40, 18, 34],
      [-30, 46, 26, 40], [2, 52, -52, 48]
    ]) {
      const cloud = new THREE.Sprite(new THREE.SpriteMaterial({
        map: cloudTexture, transparent: true, opacity: 0.6, fog: false, depthWrite: false
      }));
      cloud.position.set(cx, cy, cz);
      cloud.scale.set(cw, cw * 0.32, 1);
      cloud.name = 'cloud';
      group.add(cloud);
    }
    const stringMat = new THREE.MeshStandardMaterial({
      color: '#ffd27a', emissive: '#ffd27a', emissiveIntensity: 3.2, roughness: 0.5
    });
    const stringPoints = [];
    for (let i = 0; i <= 8; i += 1) {
      const x = -9 + (18 * i) / 8;
      const y = 4.5 - 1.1 * (1 - (x / 10) * (x / 10));
      stringPoints.push(new THREE.Vector3(x, y, -10));
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), stringMat);
      bulb.position.copy(stringPoints[i]);
      bulb.name = 'string-light';
      group.add(bulb);
    }
    const stringLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(stringPoints),
      new THREE.LineBasicMaterial({ color: '#2c323a' })
    );
    stringLine.name = 'string-wire';
    group.add(stringLine);
    for (const px of [-10, 10]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.5, 8), materials.rib);
      pole.position.set(px, 2.25, -10);
      pole.name = 'string-pole';
      group.add(pole);
    }
  }
  for (const [px, pz, ry] of [[-25, 2, 0.5], [25, -12, -0.5]]) {
    addBox(px, 2.75, pz, 0.18, 5.5, 0.18, materials.rib, { name: 'floodlight-pole' });
    const head = new THREE.Mesh(boxGeometry(0.7, 0.25, 0.35), materials.lamp);
    head.position.set(px, 5.55, pz);
    head.rotation.y = ry;
    head.castShadow = false;
    head.name = 'floodlight-head';
    group.add(head);
  }
  for (const sx of [-3.2, 3.2]) {
    for (const sz of [-3.0, -2.1, -1.2]) {
      const bag = new THREE.Mesh(boxGeometry(0.55, 0.32, 0.4), materials.sandbag);
      bag.position.set(sx, 0.16, sz);
      bag.castShadow = true;
      bag.receiveShadow = true;
      bag.name = 'sandbag';
      group.add(bag);
    }
  }
  addCylinder(16.5, 0.55, 14.5, 0.42, 1.05, materials.containerAlt, 'y');
  addCylinder(24.5, 0.55, 15.5, 0.42, 1.05, materials.containerAlt, 'y');
  addFlat(0, 0, 0.25, 20, materials.accent, 'lane-line');
  [-3, -1, 1, 3].forEach((hx, i) => {
    addFlat(hx, -12.2, 0.9, 0.5, i % 2 === 0 ? materials.accent : materials.dark, 'hazard-stripe');
  });
  [16, 18.5, 21, 23.5].forEach((hx, i) => {
    addFlat(hx, 6, 0.9, 0.5, i % 2 === 0 ? materials.accent : materials.dark, 'hazard-stripe');
  });
  for (const lx of [-20.6, -19.4]) addFlat(lx, -2, 0.35, 20, materials.decal, 'tyre-track');
  for (const lx of [19.4, 20.6]) addFlat(lx, 0, 0.35, 16, materials.decal, 'tyre-track');
  addFlat(20.5, 12, 1.4, 1.1, materials.decal, 'oil-stain');
  addFlat(16, 15.2, 1.1, 0.9, materials.decal, 'oil-stain');
  addFlat(0, -6, 1.3, 1.0, materials.decal, 'oil-stain');
  const skylineBoxes = [
    [-40, -32, 8, 14], [-28, -32, 10, 20], [-12, -32, 7, 11], [4, -32, 9, 17],
    [18, -32, 8, 12], [32, -32, 10, 22], [44, -32, 7, 10],
    [-36, 32, 8, 12], [-18, 32, 9, 18], [2, 32, 8, 10], [22, 32, 9, 15], [40, 32, 8, 13],
    [-42, -12, 8, 16], [-42, 8, 8, 11], [42, -18, 8, 13], [42, 6, 8, 19]
  ];
  for (const [sx, sz, sw, sh] of skylineBoxes) {
    const slab = new THREE.Mesh(boxGeometry(sw, sh, 4), materials.skyline);
    slab.position.set(sx, sh / 2, sz);
    slab.castShadow = false;
    slab.receiveShadow = false;
    slab.name = 'skyline-slab';
    group.add(slab);
  }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4, 8),
    materials.rib);
  mast.position.set(4.5, 7.4, -17.5);
  mast.castShadow = false;
  mast.name = 'antenna-mast';
  group.add(mast);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8),
    new THREE.MeshStandardMaterial({ color: '#7a1f1a', emissive: '#ff2a1e', emissiveIntensity: 2.2 }));
  beacon.position.set(4.5, 9.45, -17.5);
  beacon.name = 'antenna-beacon';
  group.add(beacon);
  const sockPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 4.5, 8),
    materials.rib);
  sockPole.position.set(-12, 2.25, 6);
  sockPole.castShadow = false;
  sockPole.name = 'windsock-pole';
  group.add(sockPole);
  const sock = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.4, 8),
    new THREE.MeshStandardMaterial({ color: '#e86a2a', roughness: 0.8 }));
  sock.position.set(-11.4, 4.3, 6);
  sock.rotation.z = -Math.PI / 2;
  sock.castShadow = false;
  sock.name = 'windsock';
  group.add(sock);
  const sun = new THREE.DirectionalLight(0xff8f3c, 5.0);
  sun.position.set(-40, 20, -14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -31;
  sun.shadow.camera.right = 31;
  sun.shadow.camera.top = 24;
  sun.shadow.camera.bottom = -24;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 90;
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.025;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xa87a8a, 0x6a4a38, 2.2));
  const fill = new THREE.DirectionalLight(0xffc080, 1.2);
  fill.position.set(30, 25, 40);
  scene.add(fill);
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 45, 130);
  scene.add(group);
  const siteA = new THREE.Box3(
    new THREE.Vector3(-6.5, 0, -19.7),
    new THREE.Vector3(6.5, 5.5, -12)
  );
  const siteB = new THREE.Box3(
    new THREE.Vector3(14, 0, 6),
    new THREE.Vector3(27, 4, 18)
  );
  const waypoints = [
    { p: new THREE.Vector3(-2, 0, 16), links: [5, 6] },
    { p: new THREE.Vector3(-1, 0, 16.5), links: [5, 6] },
    { p: new THREE.Vector3(0, 0, 17), links: [5, 6] },
    { p: new THREE.Vector3(1, 0, 16.5), links: [5, 6] },
    { p: new THREE.Vector3(2, 0, 16), links: [5, 6] },
    { p: new THREE.Vector3(-8, 0, 13), links: [0, 1, 2, 3, 4, 7, 11] },
    { p: new THREE.Vector3(8, 0, 13), links: [0, 1, 2, 3, 4, 8, 12] },
    { p: new THREE.Vector3(-18, 0, 8), links: [5, 9, 13] },
    { p: new THREE.Vector3(18, 0, 8), links: [6, 10, 14] },
    { p: new THREE.Vector3(-18, 0, 0), links: [7, 11, 15] },
    { p: new THREE.Vector3(18, 0, 0), links: [8, 12, 16] },
    { p: new THREE.Vector3(-12, 0, -3), links: [5, 9, 15, 17] },
    { p: new THREE.Vector3(12, 0, -3), links: [6, 10, 16, 18] },
    { p: new THREE.Vector3(-22, 0, 12), links: [7, 19] },
    { p: new THREE.Vector3(23, 0, 12), links: [8, 20] },
    { p: new THREE.Vector3(-4, 0, -2), links: [9, 11, 17, 18, 21] },
    { p: new THREE.Vector3(4, 0, -2), links: [10, 12, 17, 18, 22] },
    { p: new THREE.Vector3(-2, 0, -2), links: [11, 15, 16, 18, 21, 22] },
    { p: new THREE.Vector3(2, 0, -2), links: [12, 16, 17, 22, 23] },
    { p: new THREE.Vector3(-2, 0, -12), links: [13, 21, 24] },
    { p: new THREE.Vector3(2, 0, -12), links: [14, 22, 25] },
    { p: new THREE.Vector3(-3, 0, -8), links: [15, 17, 19, 22, 24] },
    { p: new THREE.Vector3(3, 0, -8), links: [16, 17, 18, 20, 21, 25] },
    { p: new THREE.Vector3(0, 0, -10), links: [18, 21, 22, 24, 25] },
    { p: new THREE.Vector3(-2, 0, -15), links: [19, 21, 23] },
    { p: new THREE.Vector3(2, 0, -15), links: [20, 22, 23] }
  ];
  const bombGroup = new THREE.Group();
  const bombBody = new THREE.Mesh(boxGeometry(0.55, 0.35, 0.4), new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: 0.5, metalness: 0.6 }));
  bombBody.position.y = 0.18;
  const bombCore = new THREE.Mesh(boxGeometry(0.3, 0.12, 0.24), new THREE.MeshStandardMaterial({ color: '#ff2a1e', emissive: '#ff2a1e', emissiveIntensity: 2.2 }));
  bombCore.position.y = 0.4;
  const bombLight = new THREE.PointLight(0xff2a1e, 1.6, 6);
  bombLight.position.y = 0.8;
  const bombRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.0, 32), new THREE.MeshBasicMaterial({ color: 0xff2a1e, side: THREE.DoubleSide }));
  bombRing.rotation.x = -Math.PI / 2;
  bombRing.position.y = 0.02;
  bombGroup.add(bombBody, bombCore, bombLight, bombRing);
  bombGroup.visible = false;
  group.add(bombGroup);
  function setBomb(site) {
    if (!site) { bombGroup.visible = false; return; }
    const spot = site === 'A' ? new THREE.Vector3(0, 0, -15) : new THREE.Vector3(20, 0, 11);
    bombGroup.position.copy(spot);
    bombGroup.visible = true;
  }
  return {
    colliders,
    shootables,
    group,
    sites: { A: siteA, B: siteB },
    spawns: {
      ember: [
        new THREE.Vector3(-2, 0, 16),
        new THREE.Vector3(-1, 0, 16.5),
        new THREE.Vector3(0, 0, 17),
        new THREE.Vector3(1, 0, 16.5),
        new THREE.Vector3(2, 0, 16)
      ],
      kestrel: [
        new THREE.Vector3(-2, 0, -16),
        new THREE.Vector3(-1, 0, -16.5),
        new THREE.Vector3(0, 0, -17),
        new THREE.Vector3(1, 0, -16.5),
        new THREE.Vector3(2, 0, -16)
      ]
    },
    plantSpots: {
      A: new THREE.Vector3(0, 0, -15),
      B: new THREE.Vector3(20, 0, 11)
    },
    waypoints,
    bounds: { minX: -27, maxX: 27, minZ: -19, maxZ: 19 },
    setBomb
  };
}