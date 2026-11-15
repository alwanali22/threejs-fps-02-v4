import * as THREE from 'three';
import { accent, ink, hairline } from './palette.js';
const BOT_NAMES = {
  ember: ['Ash', 'Bram', 'Cy', 'Dove'],
  kestrel: ['Fenn', 'Gale', 'Hob', 'Ivo', 'Juno']
};
const BOT_WEAPONS = {
  ember: ['VK-7', 'KX-9', 'LR-88', 'P9'],
  kestrel: ['VK-7', 'KX-9', 'LR-88', 'P9', 'VK-7']
};
const BOT_ROLES = {
  ember: ['Assault', 'Assault', 'Sniper', 'Support'],
  kestrel: ['Assault', 'Assault', 'Sniper', 'Support', 'Anchor']
};
const TEAM_COLORS = { ember: accent, kestrel: '#5fb8a6' };
const STEP = 1 / 60;
const RADIUS = 0.34;
const HEIGHT = 1.72;
const LIFT = 0.04;
const scratchA = new THREE.Vector3();
const scratchB = new THREE.Vector3();
const scratchC = new THREE.Vector3();
const scratchColor = new THREE.Color();
const barGreen = new THREE.Color('#7dd87d');
const barAmber = new THREE.Color('#f0a830');
const barRed = new THREE.Color('#e05a4e');
const HAS_DOM = typeof document !== 'undefined';
let sharedBarTexture = null;
function barTexture() {
  if (sharedBarTexture) return sharedBarTexture;
  const canvasEl = document.createElement('canvas');
  canvasEl.width = 1;
  canvasEl.height = 1;
  const ctx = canvasEl.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1, 1);
  sharedBarTexture = new THREE.CanvasTexture(canvasEl);
  return sharedBarTexture;
}
function nameTexture(name, role) {
  const canvasEl = document.createElement('canvas');
  canvasEl.width = 256;
  canvasEl.height = 32;
  const ctx = canvasEl.getContext('2d');
  const label = role ? `${name} · ${role}` : name;
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(10,10,12,0.9)';
  ctx.strokeText(label, 128, 17);
  ctx.fillStyle = '#e9e6df';
  ctx.fillText(label, 128, 17);
  const texture = new THREE.CanvasTexture(canvasEl);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
export function createBots(scene, world, hooks) {
  const list = [];
  const hitMeshes = [];
  const bodyGeometry = new THREE.CylinderGeometry(0.29, 0.32, 1.08, 8);
  const headGeometry = new THREE.SphereGeometry(0.22, 8, 6);
  const torsoMaterial = {
    ember: new THREE.MeshStandardMaterial({ color: '#c07a24', roughness: 0.85 }),
    kestrel: new THREE.MeshStandardMaterial({ color: '#2e7d6e', roughness: 0.85 })
  };
  const headMaterial = {
    ember: new THREE.MeshStandardMaterial({ color: '#e8c268', roughness: 0.82 }),
    kestrel: new THREE.MeshStandardMaterial({ color: '#7fc9b8', roughness: 0.82 })
  };
  const visorMaterial = {
    ember: new THREE.MeshStandardMaterial({ color: accent, roughness: 0.45, metalness: 0.15 }),
    kestrel: new THREE.MeshStandardMaterial({ color: '#5fb8a6', roughness: 0.45, metalness: 0.15 })
  };
  const weaponMaterial = new THREE.MeshStandardMaterial({ color: ink, roughness: 0.65, metalness: 0.2 });
  const gripMaterial = new THREE.MeshStandardMaterial({ color: hairline, roughness: 0.8 });
  let nextId = 0;
  let objectiveSite = null;
  let roundSeed = 1;
  let now = 0;
  const smokedThisRound = { ember: false, kestrel: false };
  const lastSmokeAt = { ember: -100, kestrel: -100 };
  function overlaps(x, y, z) {
    const minY = y + LIFT;
    const maxY = y + HEIGHT;
    for (const box of world.colliders) {
      if (x + RADIUS <= box.min.x || x - RADIUS >= box.max.x) continue;
      if (z + RADIUS <= box.min.z || z - RADIUS >= box.max.z) continue;
      if (maxY <= box.min.y || minY >= box.max.y) continue;
      return true;
    }
    return false;
  }
  function makeBot(team, name, index) {
    const group = new THREE.Group();
    group.name = `${team}-${name}`;
    const torsoMesh = new THREE.Mesh(bodyGeometry, torsoMaterial[team]);
    torsoMesh.position.y = 0.91;
    torsoMesh.castShadow = true;
    torsoMesh.userData.part = 'torso';
    const headMesh = new THREE.Mesh(headGeometry, headMaterial[team]);
    headMesh.position.y = 1.58;
    headMesh.castShadow = true;
    headMesh.userData.part = 'head';
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.11), visorMaterial[team]);
    visor.position.set(0, 1.62, -0.18);
    group.add(torsoMesh, headMesh, visor);
    const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.72), weaponMaterial);
    rifle.position.set(0.28, 1.1, -0.34);
    rifle.castShadow = true;
    group.add(rifle);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.2), gripMaterial);
    stock.position.set(0.28, 1.1, 0.1);
    group.add(stock);
    let nameSprite = null;
    let barSprite = null;
    let barMaterial = null;
    if (HAS_DOM) {
      const nameMaterial = new THREE.SpriteMaterial({
        map: nameTexture(name, BOT_ROLES[team][index % BOT_ROLES[team].length]), transparent: true, depthWrite: false
      });
      nameSprite = new THREE.Sprite(nameMaterial);
      nameSprite.position.y = 2.15;
      nameSprite.scale.set(2.1, 0.42, 1);
      group.add(nameSprite);
      barMaterial = new THREE.SpriteMaterial({
        map: barTexture(), color: '#7dd87d', transparent: true, depthWrite: false
      });
      barSprite = new THREE.Sprite(barMaterial);
      barSprite.position.y = 1.92;
      barSprite.scale.set(0.9, 0.09, 1);
      group.add(barSprite);
    }
    const bot = {
      id: nextId++,
      name,
      team,
      weapon: BOT_WEAPONS[team][index % BOT_WEAPONS[team].length],
      combatRole: BOT_ROLES[team][index % BOT_ROLES[team].length],
      group,
      torsoMesh,
      headMesh,
      nameSprite,
      barSprite,
      barMaterial,
      lastBarHealth: 100,
      health: 100,
      alive: true,
      pos: group.position,
      yaw: 0,
      speed: 0,
      state: 'route',
      path: [],
      pathCursor: 0,
      holdUntil: 0,
      lastFootstepAt: -100,
      target: null,
      reactionAt: 0,
      burstLeft: 0,
      nextShotAt: 0,
      hearPos: null,
      plantProgress: 0,
      defuseProgress: 0,
      deathTime: 0,
      deathStartY: 0,
      seed: 0,
      role: '',
      site: null,
      assignedObjective: false,
      plantStarted: false,
      defuseStarted: false,
      lastSeenAt: 0,
      goal: null,
      goalNode: -1,
      blindUntil: 0
    };
    torsoMesh.userData.bot = bot;
    headMesh.userData.bot = bot;
    hitMeshes.push(torsoMesh, headMesh);
    group.add(torsoMesh, headMesh);
    scene.add(group);
    return bot;
  }
  for (const team of ['ember', 'kestrel']) {
    for (let i = 0; i < BOT_NAMES[team].length; i += 1) {
      list.push(makeBot(team, BOT_NAMES[team][i], i));
    }
  }
  function random(bot) {
    bot.seed = (Math.imul(bot.seed, 1664525) + 1013904223) >>> 0;
    return bot.seed / 4294967296;
  }
  function setPath(bot, nodes) {
    bot.path.length = 0;
    for (const node of nodes) bot.path.push(node);
    bot.pathCursor = 0;
    bot.goalNode = nodes.length ? nodes[nodes.length - 1] : -1;
    bot.goal = bot.goalNode >= 0 ? world.waypoints[bot.goalNode].p : null;
  }
  function routeTo(bot, node) {
    const start = nearestNode(bot.pos);
    if (start < 0 || node < 0) {
      setPath(bot, [node]);
      return;
    }
    const count = world.waypoints.length;
    const distance = new Float32Array(count);
    const previous = new Int16Array(count);
    const visited = new Uint8Array(count);
    distance.fill(Infinity);
    previous.fill(-1);
    distance[start] = 0;
    for (let n = 0; n < count; n += 1) {
      let current = -1;
      let best = Infinity;
      for (let i = 0; i < count; i += 1) {
        if (!visited[i] && distance[i] < best) {
          current = i;
          best = distance[i];
        }
      }
      if (current < 0 || current === node) break;
      visited[current] = 1;
      const links = world.waypoints[current].links;
      for (const neighbor of links) {
        const a = world.waypoints[current].p;
        const b = world.waypoints[neighbor].p;
        const edge = a.distanceTo(b);
        const candidate = best + edge;
        if (candidate < distance[neighbor]) {
          distance[neighbor] = candidate;
          previous[neighbor] = current;
        }
      }
    }
    const reverse = [];
    let cursor = node;
    while (cursor >= 0 && cursor !== start && reverse.length < count) {
      reverse.push(cursor);
      cursor = previous[cursor];
    }
    reverse.push(start);
    bot.path.length = 0;
    for (let i = reverse.length - 1; i >= 0; i -= 1) bot.path.push(reverse[i]);
    bot.pathCursor = bot.path.length > 1 ? 1 : 0;
    bot.goalNode = node;
    bot.goal = world.waypoints[node].p;
  }
  function nearestNode(pos) {
    let result = -1;
    let best = Infinity;
    for (let i = 0; i < world.waypoints.length; i += 1) {
      const p = world.waypoints[i].p;
      const dx = p.x - pos.x;
      const dz = p.z - pos.z;
      const dist = dx * dx + dz * dz;
      if (dist < best) {
        best = dist;
        result = i;
      }
    }
    return result;
  }
  function nodeForSite(site, interior = false) {
    if (site === 'A') return interior ? 24 : 19;
    if (site === 'B') return interior ? 14 : 8;
    return 17;
  }
  function spawnAll(roles = {}) {
    const emberSpawns = world.spawns.ember;
    const kestrelSpawns = world.spawns.kestrel;
    let ei = 0;
    let ki = 0;
    for (const bot of list) {
      const point = bot.team === 'ember' ? emberSpawns[ei++] : kestrelSpawns[ki++];
      bot.pos.copy(point);
      bot.pos.y = 0;
      bot.group.rotation.set(0, bot.team === 'ember' ? Math.PI : 0, 0);
      bot.yaw = bot.group.rotation.y;
      bot.speed = 0;
      bot.health = 100;
      bot.alive = true;
      bot.group.visible = true;
      bot.group.rotation.z = 0;
      bot.state = 'route';
      bot.holdUntil = 0;
      bot.target = null;
      bot.reactionAt = 0;
      bot.burstLeft = 0;
      bot.nextShotAt = 0;
      bot.hearPos = null;
      bot.plantProgress = 0;
      bot.defuseProgress = 0;
      bot.deathTime = 0;
      bot.deathStartY = 0;
      bot.plantStarted = false;
      bot.defuseStarted = false;
      bot.lastSeenAt = 0;
      bot.blindUntil = 0;
      bot.lastBarHealth = 100;
      if (bot.nameSprite) bot.nameSprite.visible = true;
      if (bot.barSprite) {
        bot.barSprite.visible = true;
        bot.barSprite.scale.set(0.9, 0.09, 1);
        bot.barMaterial.color.set('#7dd87d');
      }
      bot.seed = (roundSeed++ * 2654435761) >>> 0;
      const customRole = roles[bot.name] || roles[bot.id];
      bot.role = customRole || '';
      bot.site = null;
      bot.assignedObjective = false;
      bot.path.length = 0;
      bot.pathCursor = 0;
      bot.goal = null;
      bot.goalNode = -1;
    }
    smokedThisRound.ember = false;
    smokedThisRound.kestrel = false;
    const emberBots = list.filter(bot => bot.team === 'ember');
    const kestrelBots = list.filter(bot => bot.team === 'kestrel');
    const emberRoles = ['A', 'B', 'mid', 'flank'];
    for (let i = 0; i < emberBots.length; i += 1) {
      const bot = emberBots[i];
      bot.site = bot.role === 'A' || bot.role === 'B' ? bot.role : emberRoles[i];
      const node = bot.site === 'A' ? 19 : bot.site === 'B' ? 8 : bot.site === 'mid' ? 17 : 13;
      routeTo(bot, node);
    }
    const kestrelRoles = ['A', 'A', 'B', 'B', 'mid'];
    for (let i = 0; i < kestrelBots.length; i += 1) {
      const bot = kestrelBots[i];
      bot.site = bot.role === 'A' || bot.role === 'B' ? bot.role : kestrelRoles[i];
      const node = bot.site === 'A' ? 19 : bot.site === 'B' ? 14 : 16;
      routeTo(bot, node);
      bot.state = bot.site === 'mid' ? 'route' : 'hold';
    }
  }
  function damage(bot, amount, part = 'torso') {
    if (!bot || !bot.alive) return false;
    bot.health = Math.max(0, bot.health - amount);
    if (bot.health > 0) return false;
    bot.alive = false;
    bot.state = 'dead';
    bot.deathTime = 0;
    bot.deathStartY = bot.pos.y;
    bot.target = null;
    return true;
  }
  function aliveCount(team) {
    let count = 0;
    for (const bot of list) if (bot.alive && bot.team === team) count += 1;
    return count;
  }
  function setObjective(site) {
    objectiveSite = site === 'A' || site === 'B' ? site : null;
    if (!objectiveSite) return;
    let assigned = 0;
    const candidates = [];
    for (const bot of list) {
      if (bot.alive && bot.team === 'ember') candidates.push(bot);
    }
    candidates.sort((a, b) => a.pos.distanceToSquared(world.plantSpots[objectiveSite]) -
      b.pos.distanceToSquared(world.plantSpots[objectiveSite]));
    for (const bot of candidates) {
      if (assigned >= 2) break;
      bot.site = objectiveSite;
      bot.assignedObjective = true;
      routeTo(bot, nodeForSite(objectiveSite, false));
      bot.state = 'route';
      assigned += 1;
    }
  }
  function resetRound() {
    objectiveSite = null;
    spawnAll();
  }
  function flashAt(pos, radius, seconds) {
    for (const bot of list) {
      if (!bot.alive) continue;
      scratchA.copy(pos);
      scratchA.y += 1.2;
      if (bot.pos.distanceToSquared(scratchA) > radius * radius) continue;
      if (!hooks.los(bot.pos, scratchA)) continue;
      scratchB.subVectors(scratchA, bot.pos).normalize();
      const facing = Math.sin(bot.yaw) * scratchB.x + Math.cos(bot.yaw) * scratchB.z;
      if (facing <= 0.2) continue;
      bot.blindUntil = Math.max(bot.blindUntil, now + seconds);
      bot.target = null;
    }
  }
  function targetPosition(target, ctx, out) {
    if (target === 'player') {
      out.copy(ctx.playerPos);
      out.y += ctx.playerCrouching ? 0.85 : 1.45;
    } else {
      out.copy(target.pos);
      out.y += 1.15;
    }
    return out;
  }
  function smokeBlocked(from, to) {
    return Boolean(hooks.smokeBlocks && hooks.smokeBlocks(from, to));
  }
  function acquire(bot, ctx) {
    if (now < bot.blindUntil) {
      bot.target = null;
      return;
    }
    let best = 42 * 42;
    let chosen = null;
    let chosenPos = null;
    for (const enemy of list) {
      if (!enemy.alive || enemy.team === bot.team) continue;
      scratchA.copy(enemy.pos);
      scratchA.y += 1.2;
      const dist = bot.pos.distanceToSquared(scratchA);
      if (dist < best && hooks.los(bot.pos, scratchA) && !smokeBlocked(bot.pos, scratchA)) {
        best = dist;
        chosen = enemy;
        chosenPos = scratchA;
      }
    }
    if (bot.team !== 'ember' && ctx.playerAlive) {
      scratchA.copy(ctx.playerPos);
      scratchA.y += ctx.playerCrouching ? 0.85 : 1.45;
      const dist = bot.pos.distanceToSquared(scratchA);
      if (dist < best && hooks.los(bot.pos, scratchA) && !smokeBlocked(bot.pos, scratchA)) {
        best = dist;
        chosen = 'player';
        chosenPos = scratchA;
      }
    }
    if (chosen) {
      if (bot.target !== chosen) {
        bot.target = chosen;
        bot.reactionAt = ctx.time + 0.35 + random(bot) * 0.25;
        bot.burstLeft = 0;
        if (chosenPos) hooks.onSpot?.(bot, chosenPos);
      }
      bot.lastSeenAt = ctx.time;
      bot.state = 'engage';
      if (chosenPos) bot.yaw = Math.atan2(chosenPos.x - bot.pos.x, chosenPos.z - bot.pos.z);
    } else if (bot.target && ctx.time - bot.lastSeenAt > 1.1) {
      bot.target = null;
      bot.state = bot.state === 'engage' ? 'route' : bot.state;
    }
  }
  function shoot(bot, ctx, dt) {
    if (!bot.target || ctx.phase === 'buy' || ctx.time < bot.reactionAt) return;
    if (now < bot.blindUntil) return;
    if (ctx.time < bot.nextShotAt) return;
    if (bot.burstLeft <= 0) {
      bot.burstLeft = 3 + Math.floor(random(bot) * 3);
      bot.nextShotAt = ctx.time + 0.5 + random(bot) * 0.4;
      return;
    }
    targetPosition(bot.target, ctx, scratchB);
    if (!hooks.los(bot.pos, scratchB) || smokeBlocked(bot.pos, scratchB)) {
      bot.nextShotAt = ctx.time + 0.18;
      return;
    }
    const distance = bot.pos.distanceTo(scratchB);
    const targetSpeed = bot.target === 'player' ? (ctx.playerSpeed || 0) : bot.target.speed;
    const chance = Math.max(0.16, Math.min(0.78, 0.78 - distance * 0.012 - targetSpeed * 0.045));
    if (random(bot) < chance) {
      const headshot = random(bot) < 0.12;
      const amount = (headshot ? 34 : 26) * (headshot ? 4 : 1);
      if (bot.target === 'player') {
        hooks.damagePlayer(amount, bot.pos, headshot);
      } else if (damage(bot.target, amount, headshot ? 'head' : 'torso')) {
        hooks.onKill?.(bot.target.team, bot.team, bot.name, bot.target.name, headshot, bot.weapon);
      }
      hooks.onDamage?.(bot.name, amount);
    }
    bot.burstLeft -= 1;
    bot.nextShotAt = ctx.time + 0.09 + random(bot) * 0.04;
    if (bot.burstLeft <= 0) bot.nextShotAt += 0.5 + random(bot) * 0.4;
    hooks.hearNoise?.(bot.pos, 34, bot.team);
  }
  function moveToward(bot, target, dt) {
    if (!target) {
      bot.speed = THREE.MathUtils.lerp(bot.speed, 0, Math.min(1, dt * 5));
      return;
    }
    scratchC.set(target.x - bot.pos.x, 0, target.z - bot.pos.z);
    const distance = scratchC.length();
    if (distance < 0.28) {
      bot.speed = THREE.MathUtils.lerp(bot.speed, 0, Math.min(1, dt * 6));
      return;
    }
    scratchC.multiplyScalar(1 / distance);
    bot.yaw = Math.atan2(scratchC.x, scratchC.z);
    const desiredSpeed = 4.2 + (bot.id % 4) * 0.2;
    bot.speed = THREE.MathUtils.lerp(bot.speed, desiredSpeed, Math.min(1, dt * 3.5));
    const dx = scratchC.x * bot.speed * dt;
    const dz = scratchC.z * bot.speed * dt;
    const nextX = bot.pos.x + dx;
    const nextZ = bot.pos.z + dz;
    if (!overlaps(nextX, bot.pos.y, bot.pos.z)) bot.pos.x = nextX;
    if (!overlaps(bot.pos.x, bot.pos.y, nextZ)) bot.pos.z = nextZ;
    bot.group.rotation.y = bot.yaw;
  }
  function advancePath(bot) {
    if (bot.pathCursor < bot.path.length && bot.goal) {
      const p = bot.goal;
      if (Math.hypot(p.x - bot.pos.x, p.z - bot.pos.z) < 0.9) {
        bot.pathCursor += 1;
        if (bot.pathCursor < bot.path.length) {
          bot.goalNode = bot.path[bot.pathCursor];
          bot.goal = world.waypoints[bot.goalNode].p;
        } else {
          bot.goal = null;
        }
      }
    }
  }
  function objectiveStep(bot, ctx, dt) {
    if (bot.team === 'ember' && bot.assignedObjective && !ctx.bombPlanted) {
      const site = bot.site;
      const plant = world.plantSpots[site];
      if (site && plant && bot.pos.distanceToSquared(plant) < 2.2 * 2.2 && !bot.target &&
          hooks.los(bot.pos, plant)) {
        bot.state = 'plant';
        if (!bot.plantStarted) {
          bot.plantStarted = true;
          bot.plantProgress = 0;
          hooks.onPlant?.(site);
        }
        bot.plantProgress += dt;
        if (bot.plantProgress >= 3.2) {
          bot.plantProgress = 3.2;
          hooks.onPlanted?.(site);
          bot.assignedObjective = false;
          bot.plantStarted = false;
        }
        return true;
      }
      if (bot.plantStarted && bot.target) {
        bot.plantProgress = 0;
        bot.plantStarted = false;
      }
    }
    if (bot.team === 'kestrel' && ctx.bombPlanted && ctx.bombSite &&
        bot.site === ctx.bombSite && !bot.target) {
      const plant = world.plantSpots[ctx.bombSite];
      if (plant && bot.pos.distanceToSquared(plant) < 2.2 * 2.2 && hooks.los(bot.pos, plant)) {
        bot.state = 'defuse';
        if (!bot.defuseStarted) {
          bot.defuseStarted = true;
          bot.defuseProgress = 0;
          hooks.onDefuseStart?.(ctx.bombSite, bot);
        }
        bot.defuseProgress += dt;
        if (bot.defuseProgress >= 5) {
          bot.defuseProgress = 5;
          hooks.onDefused?.(ctx.bombSite, bot);
          bot.defuseStarted = false;
        }
        return true;
      }
    } else if (bot.defuseStarted && bot.target) {
      bot.defuseProgress = 0;
      bot.defuseStarted = false;
    }
    return false;
  }
  function updateBar(bot) {
    if (!bot.barSprite || bot.lastBarHealth === bot.health) return;
    bot.lastBarHealth = bot.health;
    const hp = Math.max(0, bot.health) / 100;
    bot.barSprite.scale.x = 0.9 * hp;
    if (hp >= 0.5) scratchColor.copy(barAmber).lerp(barGreen, (hp - 0.5) * 2);
    else scratchColor.copy(barRed).lerp(barAmber, hp * 2);
    bot.barMaterial.color.copy(scratchColor);
  }
  function step(dt, ctx) {
    const elapsed = Math.min(dt || STEP, 0.1);
    now = ctx.time || 0;
    for (const bot of list) {
      if (!bot.alive) {
        bot.deathTime = Math.min(0.4, bot.deathTime + elapsed);
        const t = Math.min(1, bot.deathTime / 0.4);
        bot.group.rotation.z = -Math.PI * 0.5 * t;
        bot.pos.y = bot.deathStartY - 0.16 * t;
        if (bot.nameSprite) bot.nameSprite.visible = false;
        if (bot.barSprite) bot.barSprite.visible = false;
        continue;
      }
      updateBar(bot);
      acquire(bot, ctx);
      if (bot.hearPos && !bot.target && (bot.state === 'hold' || bot.state === 'route')) {
        if (bot.pos.distanceToSquared(bot.hearPos) <= 28 * 28) {
          const node = nearestNode(bot.hearPos);
          if (node >= 0) routeTo(bot, node);
          bot.state = 'rotate';
        }
        bot.hearPos = null;
      }
      if (!bot.target && bot.state === 'route' && bot.site && world.plantSpots[bot.site] &&
          !smokedThisRound[bot.team] && now - lastSmokeAt[bot.team] > 20 &&
          bot.pos.distanceToSquared(world.plantSpots[bot.site]) < 14 * 14) {
        smokedThisRound[bot.team] = true;
        lastSmokeAt[bot.team] = now;
        hooks.throwGrenade?.(bot, 'smoke', world.plantSpots[bot.site]);
      }
      if (objectiveStep(bot, ctx, elapsed)) {
        bot.speed = 0;
        continue;
      }
      if (bot.target) {
        shoot(bot, ctx, elapsed);
        bot.speed = THREE.MathUtils.lerp(bot.speed, 0, Math.min(1, elapsed * 4));
      } else {
        advancePath(bot);
        if (bot.goal) {
          moveToward(bot, bot.goal, elapsed);
          if (bot.team === 'kestrel' && bot.speed > 1 && now - bot.lastFootstepAt > 12) {
            bot.lastFootstepAt = now;
            hooks.onFootsteps?.(bot);
          }
          if (bot.pathCursor >= bot.path.length) {
            bot.state = bot.team === 'kestrel' ? 'hold' : 'route';
            bot.holdUntil = ctx.time + 0.8;
          }
        } else if (bot.state === 'rotate' || bot.state === 'route') {
          if (bot.holdUntil <= ctx.time) {
            bot.state = 'hold';
            bot.holdUntil = ctx.time + 1.5 + random(bot);
          }
        }
      }
      bot.group.rotation.y = bot.yaw;
    }
  }
  for (const bot of list) {
    bot.hear = (pos, radius, team) => {
      if (!bot.alive || team === bot.team || bot.pos.distanceToSquared(pos) > radius * radius) return;
      bot.hearPos = pos.clone();
    };
  }
  return {
    list,
    hitMeshes,
    spawnAll,
    step,
    resetRound,
    aliveCount,
    damage,
    setObjective,
    flashAt,
    hearNoise(pos, radius, team) {
      for (const bot of list) bot.hear(pos, radius, team);
    }
  };
}