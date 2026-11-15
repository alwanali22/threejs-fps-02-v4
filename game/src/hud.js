const MODE_COPY = {
  start: {
    title: 'EMBERLINE',
    copy: 'A round-based tactical engagement. Secure the site, protect your team, and outlast the opposition.',
    action: 'DEPLOY'
  },
  paused: {
    title: 'PAUSED',
    copy: 'The operation is on hold.',
    action: 'RESUME'
  },
  roundEnd: {
    title: 'ROUND COMPLETE',
    copy: '',
    action: 'CONTINUE'
  },
  matchEnd: {
    title: 'MATCH COMPLETE',
    copy: '',
    action: 'RETURN TO YARD'
  }
};
export function createHud() {
  const ids = [
    'health-fill', 'health-num', 'armour-num', 'ammo-mag', 'ammo-reserve',
    'weapon-name', 'money', 'timer', 'score-ember', 'score-kestrel',
    'alive-ember', 'alive-kestrel', 'bomb-line', 'killfeed', 'vignette',
    'minimap', 'buy', 'buy-grid', 'buy-money', 'banner', 'banner-title',
    'banner-sub', 'overlay', 'overlay-title', 'overlay-copy', 'play',
    'crosshair', 'round-text', 'funds-text', 'grenade-text', 'slots',
    'objective-text', 'carrier-badge', 'flash-overlay', 'scope-overlay',
    'pointer-hint', 'roster', 'roster-body', 'scoreboard', 'scoreboard-body',
    'radio', 'radio-body', 'location', 'plan-line', 'dmg-number'
  ];
  const elements = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
  const cache = new Map();
  const feed = [];
  const radioFeed = [];
  let shotMode = false;
  let buyItems = [];
  let buyHandler = null;
  let playHandler = null;
  let bannerTimeout = 0;
  let markerTimeout = 0;
  let flashTimeout = 0;
  let minimapTime = -Infinity;
  let flashStart = 0;
  let flashDuration = 0;
  function write(id, value) {
    const element = elements[id];
    if (!element) return;
    const text = String(value);
    if (cache.get(id) === text) return;
    cache.set(id, text);
    element.textContent = text;
  }
  function writeHtml(id, value) {
    const element = elements[id];
    if (!element) return;
    const html = String(value);
    if (cache.get(id) === html) return;
    cache.set(id, html);
    element.innerHTML = html;
  }
  function formatMoney(amount) {
    const value = Math.max(0, Math.floor(Number(amount) || 0));
    return `$${value.toLocaleString('en-US')}`;
  }
  function setHealth(hp, armour) {
    const health = Math.max(0, Math.min(100, Number(hp) || 0));
    write('health-num', Math.round(health));
    write('armour-num', Math.max(0, Math.round(Number(armour) || 0)));
    const fill = elements['health-fill'];
    if (fill) {
      const width = `${health}%`;
      if (cache.get('health-width') !== width) {
        cache.set('health-width', width);
        fill.style.width = width;
      }
      const low = health < 30;
      if (cache.get('health-low') !== low) {
        cache.set('health-low', low);
        fill.classList.toggle('low', low);
      }
    }
  }
  function setAmmo(mag, reserve, name) {
    write('ammo-mag', Math.max(0, Math.floor(Number(mag) || 0)));
    write('ammo-reserve', `/ ${Math.max(0, Math.floor(Number(reserve) || 0))}`);
    write('weapon-name', name || '');
  }
  function setMoney(amount) {
    const value = formatMoney(amount);
    write('money', value);
    write('buy-money', value);
  }
  function setTimer(seconds, phase) {
    const time = Math.max(0, Math.ceil(Number(seconds) || 0));
    const minutes = Math.floor(time / 60);
    const remainder = String(time % 60).padStart(2, '0');
    write('timer', phase === 'planted' ? `BOMB ${minutes}:${remainder}` : `${minutes}:${remainder}`);
    const timer = elements.timer;
    if (timer) {
      const urgent = phase === 'planted' || time < 10;
      if (cache.get('timer-urgent') !== urgent) {
        cache.set('timer-urgent', urgent);
        timer.style.color = urgent ? 'var(--accent)' : '';
      }
    }
  }
  function setScore(ember, kestrel) {
    write('score-ember', `EMBER ${Math.max(0, Math.floor(Number(ember) || 0))}`);
    write('score-kestrel', `${Math.max(0, Math.floor(Number(kestrel) || 0))} KESTREL`);
  }
  function setAlive(ember, kestrel) {
    write('alive-ember', Math.max(0, Math.floor(Number(ember) || 0)));
    write('alive-kestrel', Math.max(0, Math.floor(Number(kestrel) || 0)));
  }
  function setBomb(text, fuseFrac = null) {
    write('bomb-line', text || '');
    const line = elements['bomb-line'];
    if (!line) return;
    const value = fuseFrac == null ? '' : `${Math.max(0, Math.min(1, Number(fuseFrac) || 0))}`;
    if (cache.get('bomb-fuse') !== value) {
      cache.set('bomb-fuse', value);
      line.style.setProperty('--fuse-frac', value);
    }
  }
  function setRound(round, maxRounds) {
    write('round-text', `ROUND ${Math.max(1, Math.floor(Number(round) || 1))} / ${Math.max(1, Math.floor(Number(maxRounds) || 9))}`);
  }
  function setFunds(money) {
    write('funds-text', `TEAM FUNDS ${formatMoney(money)}`);
  }
  function setGrenades(counts, selectedId) {
    const parts = ['frag', 'flash', 'smoke'].map(id => {
      const label = `${id.toUpperCase()} ${Math.max(0, Math.floor(Number(counts?.[id]) || 0))}`;
      return id === selectedId ? `<b>${label}</b>` : label;
    });
    writeHtml('grenade-text', parts.join(' · '));
  }
  function setSlots(weapons, currentId) {
    const order = ['p9', 'vk7', 'kx9', 'lr88'];
    const rows = order.map((id, i) => {
      const name = weapons?.[id]?.name || id.toUpperCase();
      const label = `${i + 1} ${name}`;
      return id === currentId ? `<b>${label}</b>` : label;
    });
    writeHtml('slots', rows.join('<br>'));
  }
  function setObjective(text) {
    write('objective-text', text || '');
  }
  function setCarrier(on) {
    const badge = elements['carrier-badge'];
    if (!badge) return;
    const show = Boolean(on);
    if (cache.get('carrier-badge') !== show) {
      cache.set('carrier-badge', show);
      badge.hidden = !show;
    }
  }
  function setRoster(players) {
    if (!Array.isArray(players) || !players.length) return;
    const teams = { ember: [], kestrel: [] };
    for (const p of players) {
      if (teams[p.team]) teams[p.team].push(p);
    }
    let html = '';
    for (const team of ['ember', 'kestrel']) {
      html += `<div class="roster-head roster-${team}">${team.toUpperCase()}</div>`;
      for (const p of teams[team]) {
        const cls = p.alive ? '' : ' dead';
        const who = p.me ? 'You' : p.name;
        html += `<div class="roster-row${cls}"><span>${who}</span><span>${p.role} · ${p.weapon}</span></div>`;
      }
    }
    writeHtml('roster-body', html);
  }
  function setScoreboard(players, history, mvp) {
    let html = '';
    if (Array.isArray(players) && players.length) {
      html += '<div class="sb-table"><div class="sb-row sb-head"><span>PLAYER</span><span>ROLE</span><span>K</span><span>D</span><span>DMG</span><span>MVP</span></div>';
      for (const p of players) {
        const s = p.stats || { kills: 0, deaths: 0, dmg: 0 };
        const star = mvp && mvp.name === p.name && mvp.kills > 0 ? '★' : '';
        const who = p.me ? 'You' : p.name;
        html += `<div class="sb-row${p.alive ? '' : ' dead'}"><span>${who}</span><span>${p.role}</span><span>${s.kills}</span><span>${s.deaths}</span><span>${s.dmg}</span><span>${star}</span></div>`;
      }
      html += '</div>';
    }
    if (Array.isArray(history) && history.length) {
      html += '<div class="sb-wl">';
      for (const h of history) {
        html += `<span class="sb-chip ${h.winner === 'ember' ? 'win' : 'loss'}">${h.winner === 'ember' ? 'W' : 'L'}</span>`;
      }
      html += '</div>';
    }
    if (mvp && mvp.kills > 0) {
      html += `<div class="sb-mvp">MVP · ${mvp.name} — ${mvp.kills} kill${mvp.kills === 1 ? '' : 's'}</div>`;
    }
    if (!html) html = '<div class="sb-row"><span>—</span><span>NO ROUNDS FINISHED YET</span><span>0—0</span><span></span></div>';
    writeHtml('scoreboard-body', html);
  }
  function showScoreboard(on) {
    const panel = elements.scoreboard;
    if (!panel) return;
    const show = Boolean(on);
    if (cache.get('scoreboard-visible') !== show) {
      cache.set('scoreboard-visible', show);
      panel.hidden = !show;
    }
  }
  function scoreboardVisible() {
    return Boolean(elements.scoreboard && !elements.scoreboard.hidden);
  }
  function flashScreen(seconds) {
    const overlay = elements['flash-overlay'];
    if (!overlay) return;
    flashStart = performance.now();
    flashDuration = Math.max(0.2, Number(seconds) || 1) * 1000;
    overlay.style.opacity = '0.95';
  }
  let dmgTimer = 0;
  function showDamage(text) {
    const el = elements['dmg-number'];
    if (!el || !text) return;
    el.textContent = text;
    el.classList.add('show');
    if (dmgTimer) clearTimeout(dmgTimer);
    if (!shotMode) dmgTimer = setTimeout(() => el.classList.remove('show'), 700);
  }
  function setScope(on) {
    const overlay = elements['scope-overlay'];
    if (!overlay) return;
    const show = Boolean(on);
    if (cache.get('scope-overlay') !== show) {
      cache.set('scope-overlay', show);
      overlay.hidden = !show;
    }
  }
  function update() {
    if (!flashDuration) return;
    const overlay = elements['flash-overlay'];
    if (!overlay) return;
    const elapsed = performance.now() - flashStart;
    if (elapsed >= flashDuration) {
      overlay.style.opacity = '0';
      flashDuration = 0;
      return;
    }
    overlay.style.opacity = String(0.95 * (1 - elapsed / flashDuration));
  }
  function renderKillfeed() {
    const element = elements.killfeed;
    if (!element) return;
    element.replaceChildren();
    const now = performance.now();
    for (const entry of feed) {
      const row = document.createElement('div');
      row.textContent = entry.text;
      row.style.opacity = shotMode ? '1' : String(Math.max(0.15, 1 - (now - entry.time - 3500) / 1500));
      element.appendChild(row);
    }
  }
  function addKill(text) {
    feed.unshift({ text: String(text), time: performance.now() });
    if (feed.length > 8) feed.length = 8;
    renderKillfeed();
    if (shotMode) return;
    setTimeout(() => {
      for (let i = feed.length - 1; i >= 0; i -= 1) {
        if (performance.now() - feed[i].time >= 5000) feed.splice(i, 1);
      }
      renderKillfeed();
    }, 5050);
  }
  function renderRadio() {
    const element = elements['radio-body'];
    if (!element) return;
    element.replaceChildren();
    for (const text of radioFeed) {
      const row = document.createElement('div');
      const tag = document.createElement('span');
      tag.className = 'radio-tag';
      tag.textContent = '[RADIO] ';
      row.append(tag, document.createTextNode(text));
      element.appendChild(row);
    }
  }
  function addRadio(text) {
    radioFeed.unshift(String(text));
    if (radioFeed.length > 4) radioFeed.length = 4;
    renderRadio();
  }
  function setRadioLines(lines) {
    radioFeed.length = 0;
    for (const text of lines.slice(0, 4)) radioFeed.push(String(text));
    renderRadio();
  }
  function setPlan(text) {
    write('plan-line', text || '');
  }
  function setLocation(text) {
    write('location', text || '');
  }
  function setShotMode(on) {
    shotMode = Boolean(on);
    renderKillfeed();
    renderRadio();
  }
  function hitMarker(killed, holdMs = 90) {
    const element = document.getElementById('hitmarker');
    if (!element) return;
    element.classList.toggle('killed', Boolean(killed));
    element.classList.add('active');
    clearTimeout(markerTimeout);
    markerTimeout = setTimeout(() => element.classList.remove('active'), holdMs);
  }
  function damageFlash() {
    const element = elements.vignette;
    if (!element) return;
    element.style.opacity = '1';
    clearTimeout(flashTimeout);
    flashTimeout = setTimeout(() => { element.style.opacity = '0'; }, 180);
  }
  function setCrosshairGap(px) {
    const element = elements.crosshair;
    if (!element) return;
    const gap = `${Math.max(0, Number(px) || 0)}px`;
    if (cache.get('crosshair-gap') === gap) return;
    cache.set('crosshair-gap', gap);
    element.style.setProperty('--gap', gap);
  }
  function showBuy(items, money, onBuy) {
    buyItems = Array.isArray(items) ? items.slice(0, 12) : [];
    buyHandler = typeof onBuy === 'function' ? onBuy : null;
    write('buy-money', formatMoney(money));
    const grid = elements['buy-grid'];
    if (grid) {
      grid.replaceChildren();
      let lastCat = '';
      for (const item of buyItems) {
        if (item.cat && item.cat !== lastCat) {
          lastCat = item.cat;
          const head = document.createElement('div');
          head.className = 'buy-cat';
          head.textContent = lastCat;
          grid.appendChild(head);
        }
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'buy-item';
        button.dataset.buy = String(item.key);
        const label = document.createElement('span');
        label.className = 'buy-label';
        const name = document.createElement('span');
        name.textContent = item.name || '';
        const desc = document.createElement('span');
        desc.className = 'buy-desc';
        desc.textContent = item.desc || '';
        label.append(name, desc);
        const price = document.createElement('span');
        price.className = 'buy-price';
        price.textContent = formatMoney(item.price);
        button.append(label, price);
        if (item.owned) {
          button.disabled = true;
          button.setAttribute('aria-label', `${item.name || 'Item'}, owned`);
        } else {
          button.addEventListener('click', () => {
            if (buyHandler) buyHandler(item);
          });
        }
        grid.appendChild(button);
      }
    }
    if (elements.buy) elements.buy.hidden = false;
  }
  function hideBuy() {
    if (elements.buy) elements.buy.hidden = true;
    buyItems = [];
    buyHandler = null;
  }
  function buyVisible() {
    return Boolean(elements.buy && !elements.buy.hidden);
  }
  function showBanner(title, sub, ms = 2600) {
    write('banner-title', title || '');
    write('banner-sub', sub || '');
    if (elements.banner) elements.banner.hidden = false;
    clearTimeout(bannerTimeout);
    bannerTimeout = setTimeout(() => {
      if (elements.banner) elements.banner.hidden = true;
    }, Math.max(0, ms));
  }
  function showOverlay(mode, data = {}) {
    const copy = MODE_COPY[mode] || MODE_COPY.start;
    let title = copy.title;
    let text = copy.copy;
    let action = copy.action;
    if (mode === 'roundEnd') {
      const winner = data.winner || 'Round complete';
      const reason = data.reason ? ` · ${data.reason}` : '';
      const score = data.score || {};
      title = `${winner.toUpperCase()} WINS`;
      text = `${reason.replace(/^ · /, '')}${reason ? ' · ' : ''}EMBER ${score.ember ?? 0} — ${score.kestrel ?? 0} KESTREL`;
      if (data.mvp && data.mvp.kills > 0) {
        text += ` · MVP ${data.mvp.name} — ${data.mvp.kills} kill${data.mvp.kills === 1 ? '' : 's'}`;
      }
    } else if (mode === 'matchEnd') {
      const score = data.score || {};
      title = data.winner ? `${String(data.winner).toUpperCase()} WINS THE MATCH` : 'MATCH DRAW';
      text = `FINAL SCORE · EMBER ${score.ember ?? 0} — ${score.kestrel ?? 0} KESTREL`;
    }
    write('overlay-title', data.title || title);
    write('overlay-copy', data.copy || text);
    write('play', data.action || action);
    if (elements.overlay) elements.overlay.hidden = false;
    if (elements['pointer-hint']) elements['pointer-hint'].hidden = mode !== 'start';
  }
  function hideOverlay() {
    if (elements.overlay) elements.overlay.hidden = true;
  }
  function onPlay(handler) {
    playHandler = typeof handler === 'function' ? handler : null;
    const button = elements.play;
    if (!button) return;
    button.onclick = () => playHandler?.();
  }
  function drawMinimap(world, dots = []) {
    const canvas = elements.minimap;
    if (!canvas || !world || !world.bounds) return;
    const now = performance.now();
    if (now - minimapTime < 150) return;
    minimapTime = now;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    const bounds = world.bounds;
    const rangeX = bounds.maxX - bounds.minX;
    const rangeZ = bounds.maxZ - bounds.minZ;
    const pad = 8;
    const scale = Math.min((width - pad * 2) / rangeX, (height - pad * 2) / rangeZ);
    const ox = (width - rangeX * scale) * 0.5;
    const oy = (height - rangeZ * scale) * 0.5;
    const px = x => ox + (x - bounds.minX) * scale;
    const pz = z => oy + (z - bounds.minZ) * scale;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#14161a';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#98a0a8';
    ctx.lineWidth = 2;
    ctx.strokeRect(px(bounds.minX), pz(bounds.minZ), rangeX * scale, rangeZ * scale);
    ctx.strokeStyle = '#2c323a';
    ctx.lineWidth = 1;
    if (world.sites) {
      for (const key of ['A', 'B']) {
        const site = world.sites[key];
        if (!site) continue;
        const min = site.min;
        const max = site.max;
        const x1 = min.x ?? min[0];
        const z1 = min.z ?? min[2];
        const x2 = max.x ?? max[0];
        const z2 = max.z ?? max[2];
        ctx.strokeRect(px(x1), pz(z1), (x2 - x1) * scale, (z2 - z1) * scale);
        ctx.fillStyle = '#e9e6df';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.fillText(key, px(x1) + 3, pz(z1) + 11);
      }
    }
    ctx.strokeStyle = '#2c323a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px(-27), pz(0));
    ctx.lineTo(px(27), pz(0));
    ctx.moveTo(px(0), pz(bounds.minZ));
    ctx.lineTo(px(0), pz(bounds.maxZ));
    ctx.stroke();
    for (const dot of dots) {
      const x = px(dot.x);
      const y = pz(dot.z);
      if (dot.me) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.strokeStyle = '#e9e6df';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#e9e6df';
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = dot.team === 'kestrel' ? '#5fb8a6' : '#f0a830';
        ctx.fill();
      }
    }
  }
  function handleKey(event) {
    if (!buyVisible()) return;
    if (event.key === 'Escape' || event.key.toLowerCase() === 'b') {
      hideBuy();
      return;
    }
    const item = buyItems.find(entry => String(entry.key) === event.key);
    if (item && !item.owned) buyHandler?.(item);
  }
  document.addEventListener('keydown', handleKey);
  return {
    setHealth,
    setAmmo,
    setMoney,
    setTimer,
    setScore,
    setAlive,
    setBomb,
    setRound,
    setFunds,
    setGrenades,
    setSlots,
    setObjective,
    setCarrier,
    setRoster,
    setScoreboard,
    showScoreboard,
    scoreboardVisible,
    flashScreen,
    setScope,
    update,
    addKill,
    addRadio,
    setRadioLines,
    setPlan,
    setLocation,
    setShotMode,
    hitMarker,
    showDamage,
    damageFlash,
    setCrosshairGap,
    showBuy,
    hideBuy,
    buyVisible,
    showBanner,
    showOverlay,
    hideOverlay,
    onPlay,
    drawMinimap
  };
}