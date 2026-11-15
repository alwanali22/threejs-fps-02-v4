const SPOT_COOLDOWN = 8;
const ROTATE_COOLDOWN = 10;
const GUNFIRE_COOLDOWN = 10;
export function zoneName(x, z) {
  if (x >= -6.5 && x <= 6.5 && z <= -12 && z >= -19.7) return 'HANGAR A';
  if (x >= 14 && x <= 27 && z >= 6 && z <= 18) return 'FUEL B';
  if (x < -12 && z < 2) return 'A LONG';
  if (x > 18 && z < 0) return 'TOWER';
  if (x > 12 && z >= -8 && z < 2) return 'B CUT';
  if (x < -12 && z >= 2 && z < 12) return 'A CUT';
  if (z >= 12) return 'SPAWN';
  if (z >= -8 && z < 8) return 'MID';
  return 'YARD';
}
export function createRadio() {
  const lines = [];
  let lastSpotAt = -100;
  let lastRotateAt = -100;
  let lastKillAt = -100;
  let lastGunfireAt = -100;
  function push(text) {
    lines.unshift(text);
    if (lines.length > 4) lines.length = 4;
    return lines;
  }
  function spot(name, role, count, zone, now) {
    if (now - lastSpotAt < SPOT_COOLDOWN) return lines;
    lastSpotAt = now;
    const n = Math.max(1, Math.min(5, count | 0));
    return push(`${name} (${role}): Contact ${zone} — ${n} hostile${n > 1 ? 's' : ''}, rotating!`);
  }
  function rotate(name, role, zone, now) {
    if (now - lastRotateAt < ROTATE_COOLDOWN) return lines;
    lastRotateAt = now;
    return push(`${name} (${role}): Footsteps ${zone} — rotating to flank.`);
  }
  function gunfire(name, role, zone, now) {
    if (now - lastGunfireAt < GUNFIRE_COOLDOWN) return lines;
    lastGunfireAt = now;
    return push(`${name} (${role}): Gunfire heard ${zone} — rotating!`);
  }
  function kill(name, role, victim, zone, headshot, now) {
    if (now - lastKillAt < 2) return lines;
    lastKillAt = now;
    return push(`${name} (${role}): Dropped ${victim} at ${zone}${headshot ? ' — clean headshot' : ''}.`);
  }
  function plant(name, role, site) {
    return push(`${name} (${role}): Planting the Spark at SITE ${site} — cover me!`);
  }
  function planted(name, role, site) {
    return push(`${name} (${role}): Spark is live at SITE ${site} — hold it!`);
  }
  function defuse(name, role, site) {
    return push(`${name} (${role}): Defusing at SITE ${site} — buy me time!`);
  }
  function plan(name, role, text) {
    return push(`${name} (${role}): ${text}`);
  }
  return { lines, push, spot, rotate, kill, plant, planted, defuse, plan, gunfire };
}