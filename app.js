'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('wheel');
  const ctx = canvas.getContext('2d');
  const STORAGE_KEY = 'name-picker:v1';
  const colors = ['#1d3a7a', '#0e5a6b', '#2a1f5c', '#0b6a62', '#243b8f', '#17496e', '#35308a', '#0a4f55'];
  let names = [], absent = new Set(), history = [], rotation = 0, busy = false;
  let stats = {}; // picks per name; kept in memory, saved only when "Remember my list" is on
  let animation;
  const available = () => names.filter(name => !absent.has(name) && (!$('no-repeat').checked || !history.includes(name)));

  function parse(value) {
    const all = value.split(/\r?\n/).map(name => name.trim()).filter(Boolean);
    const unique = [...new Set(all)];
    return { names: unique.slice(0, 100), duplicates: all.length - unique.length, overflow: unique.length > 100 };
  }

  function persist() {
    try {
      if ($('remember').checked) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ names, absent: [...absent], noRepeat: $('no-repeat').checked, stats }));
      } else localStorage.removeItem(STORAGE_KEY);
      $('storage-note').textContent = '';
    } catch {
      $('storage-note').textContent = 'Browser storage is unavailable. Your list works for this visit; saved data could not be updated or removed.';
    }
  }

  function draw() {
    const entries = available();
    const total = entries.length || 8;
    const step = Math.PI * 2 / total;
    ctx.clearRect(0, 0, 1000, 1000);
    for (let i = 0; i < total; i++) {
      const start = -Math.PI / 2 + step * i;
      ctx.beginPath(); ctx.moveTo(500, 500); ctx.arc(500, 500, 500, start, start + step); ctx.closePath();
      ctx.fillStyle = entries.length ? colors[i % colors.length] : '#16224a'; ctx.fill();
      ctx.strokeStyle = '#080f24'; ctx.lineWidth = 4; ctx.stroke();
      if (entries.length) {
        ctx.save(); ctx.translate(500, 500); ctx.rotate(start + step / 2);
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffffff';
        ctx.font = `700 ${total > 30 ? 30 : total > 16 ? 42 : total > 8 ? 56 : 66}px system-ui, sans-serif`;
        let label = entries[i];
        while (ctx.measureText(label).width > 340 && label.length > 1) label = label.slice(0, -1);
        if (label !== entries[i]) label = label.slice(0, -1) + '…';
        ctx.fillText(label, 465, 0); ctx.restore();
      }
    }
  }

  function render() {
    const entries = available();
    const active = names.filter(name => !absent.has(name));
    $('count').textContent = `${names.length} ${names.length === 1 ? 'person' : 'people'}`;
    $('pick').disabled = busy || !entries.length;
    $('pick').firstChild.textContent = busy ? 'Picking… ' : 'Pick someone ';
    $('remaining').textContent = !names.length ? 'Add at least one name to get rolling.' : !active.length ? 'Everyone’s away. Check a name to include them.' : !entries.length ? 'Everyone’s had a turn. Start fresh for another round.' : $('no-repeat').checked ? `${entries.length} of ${active.length} people left this round` : `${active.length} ${active.length === 1 ? 'person' : 'people'} in the mix · repeats allowed`;
    $('people').replaceChildren(...names.map(name => {
      const label = document.createElement('label');
      label.className = `person${absent.has(name) ? ' absent' : ''}${history.includes(name) ? ' picked' : ''}`;
      const input = document.createElement('input'); input.type = 'checkbox'; input.checked = !absent.has(name); input.disabled = busy;
      input.setAttribute('aria-label', `Include ${name}`);
      input.addEventListener('change', () => {
        if (input.checked) absent.delete(name); else absent.add(name);
        persist(); render();
      });
      label.append(input, document.createTextNode(name)); return label;
    }));
    $('history').replaceChildren(...history.map((name, i) => {
      const li = document.createElement('li'); const number = document.createElement('span'); number.textContent = `${i + 1}.`;
      li.append(number, document.createTextNode(name)); return li;
    }));
    $('empty-history').hidden = !!history.length;
    renderRig(); renderStats();
    ['names', 'no-repeat', 'example', 'clear', 'reset', 'rig', 'rig-who'].forEach(id => { $(id).disabled = busy; });
    draw();
  }

  function renderRig() {
    const select = $('rig-who'), previous = select.value;
    select.replaceChildren(...names.map(name => new Option(name, name)));
    if (names.includes(previous)) select.value = previous;
    $('rig-row').hidden = !$('rig').checked;
  }

  function renderStats() {
    const total = names.reduce((sum, name) => sum + (stats[name] || 0), 0);
    $('stats-summary').textContent = total ? `${total} ${total === 1 ? 'pick' : 'picks'} so far` : 'No picks yet.';
    const fair = names.length ? 100 / names.length : 0;
    $('stats').replaceChildren(...names.map(name => {
      const count = stats[name] || 0, share = total ? count / total * 100 : 0;
      const row = document.createElement('div'); row.className = 'stat-row';
      const label = document.createElement('span'); label.className = 'stat-name'; label.textContent = name;
      const bar = document.createElement('span'); bar.className = 'stat-bar';
      const fill = document.createElement('span'); fill.className = 'stat-fill'; fill.style.width = `${share}%`;
      const tick = document.createElement('span'); tick.className = 'stat-tick'; tick.style.left = `${fair}%`;
      bar.append(fill, tick);
      const value = document.createElement('span'); value.className = 'stat-value';
      value.textContent = `${count} · ${Math.round(share)}% (fair ${Math.round(fair)}%)`;
      row.append(label, bar, value); return row;
    }));
  }

  // Rejection sampling avoids favouring any index when the range does not divide 2^32.
  function randomIndex(length) {
    const range = 0x100000000;
    const limit = range - range % length;
    const value = new Uint32Array(1);
    do { crypto.getRandomValues(value); } while (value[0] >= limit);
    return value[0] % length;
  }

  // Silent celebration: a short confetti burst on a full-screen canvas.
  const confettiCanvas = $('confetti');
  const confettiCtx = confettiCanvas.getContext('2d');
  const confettiColors = ['#00d9a6', '#00f0b8', '#ffffff', '#4f7cff', '#35308a', '#ffd166', '#17496e'];
  let confettiFrame;

  function stopConfetti() {
    cancelAnimationFrame(confettiFrame);
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }

  function launchConfetti() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth, h = window.innerHeight;
    confettiCanvas.width = w * dpr; confettiCanvas.height = h * dpr;
    confettiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rand = (min, max) => min + Math.random() * (max - min);
    const burst = (x, y, count, spread) => Array.from({ length: count }, () => {
      const angle = -Math.PI / 2 + rand(-spread, spread);
      const speed = rand(9, 22);
      return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: rand(6, 12), rot: rand(0, 6.28), vr: rand(-.3, .3), color: confettiColors[Math.floor(rand(0, confettiColors.length))], round: Math.random() < .3, wobble: rand(0, 6.28) };
    });
    const pieces = [...burst(w / 2, h * .55, 110, 1.1), ...burst(w * .15, h * .9, 40, .5), ...burst(w * .85, h * .9, 40, .5)];
    const start = performance.now(), life = 3000;
    const tick = now => {
      const t = now - start;
      confettiCtx.clearRect(0, 0, w, h);
      for (const p of pieces) {
        p.vy += .35; p.vx *= .985; p.vy *= .985; p.x += p.vx + Math.sin(p.wobble += .08) * .8; p.y += p.vy; p.rot += p.vr;
        confettiCtx.save(); confettiCtx.globalAlpha = Math.max(0, Math.min(1, (life - t) / 700));
        confettiCtx.translate(p.x, p.y); confettiCtx.rotate(p.rot); confettiCtx.fillStyle = p.color;
        if (p.round) { confettiCtx.beginPath(); confettiCtx.arc(0, 0, p.size / 2, 0, 6.28); confettiCtx.fill(); }
        else confettiCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        confettiCtx.restore();
      }
      if (t < life) confettiFrame = requestAnimationFrame(tick); else stopConfetti();
    };
    confettiFrame = requestAnimationFrame(tick);
  }

  function wobblePointer() {
    const pointer = document.querySelector('.pointer');
    pointer.classList.remove('tick'); void pointer.offsetWidth; pointer.classList.add('tick');
  }

  function finish(name) {
    history.push(name);
    stats[name] = (stats[name] || 0) + 1;
    persist();
    // Limit session history when repeats are enabled.
    if (history.length > 200) history.shift();
    busy = false;
    // Prepare the next pool after the winner popup closes.
    render();
    rotation = 0; canvas.style.transform = 'rotate(0deg)';
  }

  $('pick').addEventListener('click', () => {
    const entries = available(); if (busy || !entries.length) return;
    // Joke mode: the first pick of a round goes to the chosen person (if they are in the pool).
    const rigIndex = $('rig').checked && !history.length ? entries.indexOf($('rig-who').value) : -1;
    const rigged = rigIndex !== -1;
    const index = rigged ? rigIndex : randomIndex(entries.length);
    const name = entries[index];
    busy = true; render();
    $('result-label').textContent = 'A LITTLE SUSPENSE…'; $('result').textContent = 'Round and round';
    const target = 360 * 5 + (360 - (index + .5) * 360 / entries.length);
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    animation = canvas.animate([{ transform: `rotate(${rotation}deg)` }, { transform: `rotate(${target}deg)` }], { duration: reduceMotion ? 0 : 3600, easing: 'cubic-bezier(.12,.65,.12,1)', fill: 'forwards' });
    animation.onfinish = () => {
      canvas.style.transform = `rotate(${target}deg)`;
      animation.cancel();
      $('result-label').textContent = rigged ? 'THE FLOOR IS YOURS, (RIGGED 😈)' : 'THE FLOOR IS YOURS,'; $('result').textContent = name;
      $('winner-name').textContent = name;
      $('winner-caption').textContent = rigged ? 'Totally random. Honest. 😈' : 'Your turn to shine.';
      $('winner-popup').hidden = false;
      wobblePointer(); launchConfetti();
      setTimeout(() => {
        stopConfetti();
        $('winner-popup').hidden = true;
        finish(name);
      }, 3200);
    };
  });

  function updateNames() {
    const parsed = parse($('names').value);
    names = parsed.names;
    absent = new Set([...absent].filter(name => names.includes(name)));
    history = history.filter(name => names.includes(name));
    stats = Object.fromEntries(Object.entries(stats).filter(([name]) => names.includes(name)));
    $('input-note').textContent = [parsed.duplicates ? 'Duplicate names count once. Use an initial for people with the same name.' : '', parsed.overflow ? 'The first 100 unique names are included.' : ''].filter(Boolean).join(' ');
    $('result-label').textContent = 'READY WHEN YOU ARE';
    $('result').textContent = names.length ? 'Give it a spin' : 'Add your people';
    persist(); render();
  }
  $('names').addEventListener('input', updateNames);
  $('no-repeat').addEventListener('change', () => { persist(); render(); });
  $('rig').addEventListener('change', render);
  $('reset-stats').addEventListener('click', () => { stats = {}; persist(); render(); });
  $('remember').addEventListener('change', persist);
  $('example').addEventListener('click', () => { $('names').value = 'Alex\nJamie\nMorgan\nSam\nTaylor\nRobin'; absent.clear(); history = []; stats = {}; updateNames(); });
  $('clear').addEventListener('click', () => { $('names').value = ''; absent.clear(); history = []; stats = {}; updateNames(); });
  $('reset').addEventListener('click', () => { history = []; $('result-label').textContent = 'A BRAND NEW ROUND'; $('result').textContent = names.length ? 'Who’s next?' : 'Add your people'; render(); });

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.names)) {
      names = parse(saved.names.filter(name => typeof name === 'string').join('\n')).names;
      absent = new Set(Array.isArray(saved.absent) ? saved.absent.filter(name => names.includes(name)) : []);
      const savedStats = saved.stats && typeof saved.stats === 'object' ? saved.stats : {};
      stats = Object.fromEntries(names.filter(name => Number.isInteger(savedStats[name]) && savedStats[name] > 0).map(name => [name, savedStats[name]]));
      $('names').value = names.join('\n'); $('remember').checked = true; $('no-repeat').checked = saved.noRepeat !== false;
      $('result-label').textContent = 'WELCOME BACK'; $('result').textContent = names.length ? 'Give it a spin' : 'Add your people';
    }
  } catch { /* Storage is optional; the picker still works without it. */ }
  render();
})();
