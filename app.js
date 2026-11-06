'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('wheel');
  const ctx = canvas.getContext('2d');
  const STORAGE_KEY = 'name-picker:v1';
  const colors = ['#1d3a7a', '#0e5a6b', '#2a1f5c', '#0b6a62', '#243b8f', '#17496e', '#35308a', '#0a4f55'];
  let names = [], absent = new Set(), history = [], rotation = 0, busy = false;
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ names, absent: [...absent], noRepeat: $('no-repeat').checked }));
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
    ['names', 'no-repeat', 'example', 'clear', 'reset'].forEach(id => { $(id).disabled = busy; });
    draw();
  }

  // Rejection sampling avoids favouring any index when the range does not divide 2^32.
  function randomIndex(length) {
    const range = 0x100000000;
    const limit = range - range % length;
    const value = new Uint32Array(1);
    do { crypto.getRandomValues(value); } while (value[0] >= limit);
    return value[0] % length;
  }

  function finish(name) {
    history.push(name);
    // Limit session history when repeats are enabled.
    if (history.length > 200) history.shift();
    busy = false;
    $('result-label').textContent = 'THE FLOOR IS YOURS,';
    $('result').textContent = name;
    // Prepare the next pool after the winner popup closes.
    render();
    rotation = 0; canvas.style.transform = 'rotate(0deg)';
  }

  $('pick').addEventListener('click', () => {
    const entries = available(); if (busy || !entries.length) return;
    const index = randomIndex(entries.length);
    const name = entries[index];
    busy = true; render();
    $('result-label').textContent = 'A LITTLE SUSPENSE…'; $('result').textContent = 'Round and round';
    const target = 360 * 5 + (360 - (index + .5) * 360 / entries.length);
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    animation = canvas.animate([{ transform: `rotate(${rotation}deg)` }, { transform: `rotate(${target}deg)` }], { duration: reduceMotion ? 0 : 3600, easing: 'cubic-bezier(.12,.65,.12,1)', fill: 'forwards' });
    animation.onfinish = () => {
      canvas.style.transform = `rotate(${target}deg)`;
      animation.cancel();
      $('result-label').textContent = 'THE FLOOR IS YOURS,'; $('result').textContent = name;
      $('winner-name').textContent = name;
      $('winner-popup').hidden = false;
      setTimeout(() => {
        $('winner-popup').hidden = true;
        finish(name);
      }, 2500);
    };
  });

  function updateNames() {
    const parsed = parse($('names').value);
    names = parsed.names;
    absent = new Set([...absent].filter(name => names.includes(name)));
    history = history.filter(name => names.includes(name));
    $('input-note').textContent = [parsed.duplicates ? 'Duplicate names count once. Use an initial for people with the same name.' : '', parsed.overflow ? 'The first 100 unique names are included.' : ''].filter(Boolean).join(' ');
    $('result-label').textContent = 'READY WHEN YOU ARE';
    $('result').textContent = names.length ? 'Give it a spin' : 'Add your people';
    persist(); render();
  }
  $('names').addEventListener('input', updateNames);
  $('no-repeat').addEventListener('change', () => { persist(); render(); });
  $('remember').addEventListener('change', persist);
  $('example').addEventListener('click', () => { $('names').value = 'Alex\nJamie\nMorgan\nSam\nTaylor\nRobin'; absent.clear(); history = []; updateNames(); });
  $('clear').addEventListener('click', () => { $('names').value = ''; absent.clear(); history = []; updateNames(); });
  $('reset').addEventListener('click', () => { history = []; $('result-label').textContent = 'A BRAND NEW ROUND'; $('result').textContent = names.length ? 'Who’s next?' : 'Add your people'; render(); });

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.names)) {
      names = parse(saved.names.filter(name => typeof name === 'string').join('\n')).names;
      absent = new Set(Array.isArray(saved.absent) ? saved.absent.filter(name => names.includes(name)) : []);
      $('names').value = names.join('\n'); $('remember').checked = true; $('no-repeat').checked = saved.noRepeat !== false;
      $('result-label').textContent = 'WELCOME BACK'; $('result').textContent = names.length ? 'Give it a spin' : 'Add your people';
    }
  } catch { /* Storage is optional; the picker still works without it. */ }
  render();
})();
