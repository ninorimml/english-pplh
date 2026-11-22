/* English PPLH — Lern-App fuer den Englischkurs des Teams von PPLH Puntondo.
   Daten in data.js (window.D), erzeugt aus der Wortliste und den Satzbau-Saetzen. */
(function () {
'use strict';
const D = window.D;
const app = document.getElementById('app');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const store = {
  get(k, d) { try { const v = localStorage.getItem('epplh.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('epplh.' + k, JSON.stringify(v)); } catch (e) {} }
};
/* Lernstand: 1 = sudah bisa, 0 = masih belajar (nur auf diesem Handy) */
const PROG = store.get('prog', { w: {}, s: {} });
if (!PROG.w) PROG.w = {}; if (!PROG.s) PROG.s = {};
const wkey = w => w.t + '|' + w.en, skey = s => s.en;
const stW = w => PROG.w[wkey(w)], stS = s => PROG.s[skey(s)];
function setW(w, ok) { PROG.w[wkey(w)] = ok ? 1 : 0; store.set('prog', PROG); }
function setS(s, ok) { PROG.s[skey(s)] = ok ? 1 : 0; store.set('prog', PROG); }
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
function toast(t) { const el = document.getElementById('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2600); }

/* ---------------------------------------------------------- Stimme */
let voice = null;
function pickVoice() {
  try {
    const vs = speechSynthesis.getVoices();
    voice = vs.find(v => /^en[-_]US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;   // amerikanisches Englisch (Entscheid 22.11.)
  } catch (e) { voice = null; }
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
const voiceState = { last: '', ok: false };
function speak(text) {
  if (!('speechSynthesis' in window)) { voiceState.last = 'no-api'; toast('Browser ini tidak punya suara. Buka di Chrome.'); return; }
  const ss = window.speechSynthesis;
  const t = String(text).replace(/…/g, '').replace(/\s*\/\s*/g, ', ');
  const go = () => {
    try {
      if (!voice) pickVoice();
      const u = new SpeechSynthesisUtterance(t);
      if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'en-US';
      u.rate = store.get('rate', 0.85);
      u.onstart = () => { voiceState.ok = true; voiceState.last = 'ok'; };
      u.onerror = e => { voiceState.last = e.error || 'error';
        if (e.error !== 'interrupted' && e.error !== 'canceled' && !speak.failShown) { speak.failShown = true; toast('Suara gagal (' + voiceState.last + ') — lihat Info.'); } };
      speak.cur = u;            // Referenz halten (Chrome verliert sonst die Ausgabe)
      try { ss.resume(); } catch (e) {}
      ss.speak(u);
    } catch (e) { voiceState.last = e.message; }
  };
  // Chrome auf Android verschluckt speak() direkt nach cancel(): kurz warten
  if (ss.speaking || ss.pending) { ss.cancel(); setTimeout(go, 150); } else go();
}

/* ---------------------------------------------------------- Bilder */
const POS = { top: [50, 20], bottom: [50, 80], left: [20, 50], right: [80, 50], middle: [50, 50] };
function pic(spec, opts) {
  opts = opts || {};
  const i = spec.indexOf(':'), k = spec.slice(0, i), v = spec.slice(i + 1);
  let h = '';
  const I = window.IMG || {};
  if (k === 'c') h = `<img src="${I['c/' + v] || 'img/c/' + v + '.jpg'}" alt="">`;
  else if (k === 'f') h = `<img class="ph" src="${I['f/' + v] || 'img/f/' + v + '.jpg'}" alt="">`;
  else if (k === 'v') h = `<img class="vb" src="${I['v/' + v] || 'img/v/' + v + '.png'}" alt="">`;
  else if (k === 'e') h = D.emoji[v] || '';
  else if (k === 'l') h = `<div class="lab">${esc(v)}</div>`;
  else if (k === 'd') h = `<div class="dig">${esc(v)}</div>`;
  else if (k === 's') h = `<div class="sw" style="background:${esc(v)}"></div>`;
  else if (k === 'pos') { const p = POS[v]; h = `<svg viewBox="0 0 100 100"><rect x="8" y="8" width="84" height="84" rx="8" fill="none" stroke="#14364F" stroke-width="5"/><circle cx="${p[0]}" cy="${p[1]}" r="11" fill="#E37226"/></svg>`; }
  return `<div class="pic">${h}</div>`;
}
const icon = key => `<span class="ic">${D.emoji[key] || ''}</span>`;

/* ---------------------------------------------------------- Rahmen */
function head(title, sub, back) {
  return `<div class="hd"><button class="backbtn" aria-label="Kembali" data-go="${esc(back || '#/')}">‹</button>
    <h1>${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ''}</h1></div>`;
}
app.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (g) { location.hash = g.dataset.go; return; }
  const s = e.target.closest('[data-say]'); if (s) speak(s.dataset.say);
});

function wordsOf(set) {
  if (set === '@learn') return D.words.filter(w => stW(w) === 0);
  if (set === '@known') return D.words.filter(w => stW(w) === 1);
  if (set[0] === 'L') { const n = +set.slice(1); return D.words.filter(w => w.l.includes(n)); }
  const t = D.themes[set]; return t ? t.w.map(id => D.wmap[id]) : [];
}
function setName(set) {
  if (set === '@learn') return ['Masih belajar', 'Semua tema · kata yang belum bisa'];
  if (set === '@known') return ['Sudah bisa', 'Semua tema · kata yang sudah bisa'];
  if (set[0] === 'L') { const L = D.lessons[+set.slice(1) - 1]; return [`Pelajaran ${L.n}`, L.idn]; }
  const t = D.themes[set]; return [t.idn, t.en];
}

/* ---------------------------------------------------------- Startseite */
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; const b = document.getElementById('inst'); if (b) b.style.display = 'block'; });
function home() {
  app.innerHTML = `<div class="hero"><h1>English for Staff</h1><p>Belajar bahasa Inggris · PPLH Puntondo</p></div>
  <div class="wrap"><div class="tiles">
    <a class="tile" data-go="#/kartu">${icon('1f0cf')}<b>Kartu Kata</b><small>Flashcards</small></a>
    <a class="tile" data-go="#/dengar">${icon('1f442')}<b>Dengar &amp; Pilih</b><small>Listen</small></a>
    <a class="tile" data-go="#/kalimat">${icon('1f9e9')}<b>Menyusun Kalimat</b><small>Sentences</small></a>
    <a class="tile" data-go="#/poster">${icon('1f4cb')}<b>Poster</b><small>Posters</small></a>
    <a class="tile wide" data-go="#/pelajaran">${icon('1f4da')}<span><b>Pelajaran 1–6</b><br><small>Materi dari setiap pertemuan kursus</small></span></a>
    <a class="tile wide" data-go="#/info">${icon('2139')}<span><b>Info</b><br><small>Cara baca · suara · tentang aplikasi</small></span></a>
  </div><button class="install" id="inst">Pasang di layar HP</button></div>`;
  if (installEvt) document.getElementById('inst').style.display = 'block';
  document.getElementById('inst').onclick = async () => { if (!installEvt) return; installEvt.prompt(); try { await installEvt.userChoice; } catch (e) {} installEvt = null; document.getElementById('inst').style.display = 'none'; };
}

/* ---------------------------------------------------------- Themenliste */
function themeList(mode) {
  const title = mode === 'kartu' ? 'Kartu Kata' : 'Dengar & Pilih';
  const sub = mode === 'kartu' ? 'Pilih tema' : 'Dengarkan, lalu pilih gambar yang benar';
  let h = head(title, sub, '#/') + '<div class="wrap">' + progButtons(mode, wordsOf('@learn').length, wordsOf('@known').length, 'kata', '@')
    + '<p class="small" style="margin:6px 2px 0">Tanda dibuat di Kartu Kata setelah kartu dibalik, dan otomatis di Dengar &amp; Pilih.</p>';
  D.sections.forEach(s => {
    h += `<div class="sec">${esc(s.idn)}</div><div class="list">`;
    s.t.forEach(id => { const t = D.themes[id];
      h += `<button class="item" data-go="#/${mode}/${id}">${icon(t.ic)}<span><b>${esc(t.idn)}</b><small>${t.w.length} kata</small></span></button>`; });
    h += '</div>';
  });
  app.innerHTML = h + '</div>';
}

function progButtons(mode, nL, nK, unit, pre) {
  const b = (cls, ic, n, title, txt, target) => `<button class="item row1 prog ${cls}" ${n ? `data-go="#/${mode}/${pre}${target}"` : 'disabled'}>${icon(ic)}<span><b>${title}</b><small>${n ? `${n} ${unit} — ${txt}` : 'Belum ada ' + unit + '.'}</small></span></button>`;
  return `<div class="list">${b('learn', '1f501', nL, 'Masih belajar', 'latih lagi', 'learn')}${b('known', '2705', nK, 'Sudah bisa', 'perkuat', 'known')}</div>`;
}

/* ---------------------------------------------------------- Karteikarten */
function cards(set) {
  const [name, sub] = setName(set);
  let list = wordsOf(set), i = 0, flipped = false;
  let reverse = store.get('reverse', false), mixed = false;
  const back = set[0] === 'L' ? `#/pelajaran/${set.slice(1)}` : '#/kartu';
  function card() {
    const w = list[i], long = w.en.length > 18;
    const front = reverse
      ? `<div class="bahasa-front">${esc(w.id)}</div>`
      : pic(w.img);
    const backFace = `${reverse ? `<div class="mini">${pic(w.img)}</div>` : ''}
      <div class="en${long ? ' long' : ''}">${esc(w.en)}</div><div class="pr">${esc(w.p)}</div><div class="id">${esc(w.id)}</div>`;
    const st = stW(w), badge = st === 1 ? '<span class="badge k">✓ sudah bisa</span>' : st === 0 ? '<span class="badge l">↻ masih belajar</span>' : '';
    return `<div class="fc${flipped ? ' flip' : ''}" id="fc"><div class="face front">${front}</div><div class="face bk">${backFace}</div>
      ${badge}<div class="hint">${flipped ? '' : 'Ketuk kartu untuk membalik'}</div></div>
      <div class="judge${flipped ? ' on' : ''}" id="judge"><button class="jb learn" id="jl">↻ Masih belajar</button><button class="jb known" id="jk">✓ Sudah bisa</button></div>`;
  }
  function render() {
    app.innerHTML = head(name, sub, back) + `<div class="wrap">
      <div class="bar"><button class="chip${mixed ? ' on' : ''}" id="mix">🔀 Acak</button>
      <button class="chip${reverse ? ' on' : ''}" id="rev">${reverse ? 'Bahasa → English' : 'Gambar → English'}</button>
      <span class="count">${i + 1} / ${list.length}</span></div>
      ${card()}
      <div class="ctrl"><button class="big" id="prev" aria-label="Sebelumnya">‹</button>
      <button class="big speak" id="spk">🔊 Dengar</button>
      <button class="big" id="nxt" aria-label="Berikutnya">›</button></div></div>`;
    const fc = document.getElementById('fc');
    let x0 = null, y0 = 0, moved = false;
    fc.addEventListener('pointerdown', e => { x0 = e.clientX; y0 = e.clientY; moved = false; });
    fc.addEventListener('pointerup', e => {
      if (x0 == null) return; const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { go(dx < 0 ? 1 : -1); return; }
      flipped = !flipped; fc.classList.toggle('flip', flipped);
      fc.querySelector('.hint').textContent = flipped ? '' : 'Ketuk kartu untuk membalik';
      document.getElementById('judge').classList.toggle('on', flipped);
      if (flipped) speak(list[i].en);
    });
    const judge = ok => { setW(list[i], ok); toast(ok ? '✓ Sudah bisa' : '↻ Masih belajar'); setTimeout(() => go(1), 250); };
    document.getElementById('jk').onclick = () => judge(true);
    document.getElementById('jl').onclick = () => judge(false);
    document.getElementById('prev').onclick = () => go(-1);
    document.getElementById('nxt').onclick = () => go(1);
    document.getElementById('spk').onclick = () => speak(list[i].en);
    document.getElementById('mix').onclick = () => { mixed = !mixed; list = mixed ? shuffle(wordsOf(set)) : wordsOf(set); i = 0; flipped = false; render(); };
    document.getElementById('rev').onclick = () => { reverse = !reverse; store.set('reverse', reverse); flipped = false; render(); };
  }
  function go(d) { i = (i + d + list.length) % list.length; flipped = false; render(); }
  if (!list.length) { app.innerHTML = head(name, sub, back) + '<div class="wrap"><div class="done">Belum ada kata di sini.</div></div>'; return; }
  render();
}

/* ---------------------------------------------------------- Dengar & Pilih */
function quiz(set) {
  const [name] = setName(set);
  const back = set[0] === 'L' ? `#/pelajaran/${set.slice(1)}` : '#/dengar';
  let pool = wordsOf(set); const all = D.words;
  let N = Math.min(10, pool.length);
  if (!N) { app.innerHTML = head('Dengar & Pilih', name, back) + '<div class="wrap"><div class="done">Belum ada kata di sini.</div></div>'; return; }
  let order = shuffle(pool).slice(0, N), q = 0, score = 0, firstTry = true, res = [];
  function options(target) {
    let others = shuffle(pool.filter(w => w !== target && w.img !== target.img && w.en !== target.en)).slice(0, 3);
    if (others.length < 3) others = others.concat(shuffle(all.filter(w => w !== target && !others.includes(w) && w.en !== target.en)).slice(0, 3 - others.length));
    return shuffle([target].concat(others));
  }
  function render() {
    if (q >= N) return finish();
    const t = order[q], opts = options(t); firstTry = true;
    app.innerHTML = head('Dengar & Pilih', name, back) + `<div class="wrap">
      <div class="q-top"><div class="dots">${order.map((_, k) => `<i class="${k < q ? (res[k] ? 'ok' : 'on') : ''}"></i>`).join('')}</div><span class="count">${q + 1} / ${N}</span></div>
      <button class="listen" id="ls">🔊 Dengar lagi</button>
      <div class="opts">${opts.map((o, k) => `<button class="opt" data-k="${k}">${pic(o.img)}</button>`).join('')}</div>
      <div class="msg" id="msg"></div><div id="nx"></div></div>`;
    document.getElementById('ls').onclick = () => speak(t.en);
    app.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      const o = opts[+b.dataset.k];
      if (b.classList.contains('bad') || document.getElementById('nx').innerHTML) return;
      if (o === t) {
        b.classList.add('ok'); b.insertAdjacentHTML('beforeend', `<div class="cap">${esc(t.en)}<i>${esc(t.p)}</i></div>`);
        res[q] = firstTry; if (firstTry) score++; setW(t, firstTry);
        const m = document.getElementById('msg'); m.textContent = 'Betul! 👍'; m.className = 'msg ok';
        speak(t.en);
        document.getElementById('nx').innerHTML = `<button class="next" id="go">Lanjut →</button>`;
        document.getElementById('go').onclick = () => { q++; render(); };
      } else {
        firstTry = false; b.classList.add('bad');
        const m = document.getElementById('msg'); m.textContent = 'Coba lagi.'; m.className = 'msg bad';
      }
    });
    setTimeout(() => speak(t.en), 250);
  }
  function finish() {
    app.innerHTML = head('Dengar & Pilih', name, back) + `<div class="wrap"><div class="done">
      <div>Selesai!</div><div class="score">${score} / ${N}</div><div class="small">benar pada percobaan pertama</div>
      <button class="next" id="again">Main lagi</button><button class="next" style="background:var(--card);color:var(--ink);border:1px solid var(--line)" data-go="${back}">Kembali</button></div></div>`;
    document.getElementById('again').onclick = () => {
      pool = wordsOf(set); N = Math.min(10, pool.length);
      if (!N) { location.hash = back; return; }
      order = shuffle(pool).slice(0, N); q = 0; score = 0; res = []; render(); };
  }
  render();
}

/* ---------------------------------------------------------- Satzbau */
function tileHTML(t, cls) {
  const w = esc(t.a) + (t.s ? '<span class="s">s</span>' : '') + esc(t.b);
  return `<span class="t k-${t.k}${cls ? ' ' + cls : ''}" data-id="${t.id}"><span>${w}</span><small>${esc(t.p)}</small></span>`;
}
function levels() {
  let h = head('Menyusun Kalimat', 'Pilih tingkat', '#/') + '<div class="wrap"><div class="card">Susun kalimat bahasa Inggris dari kotak-kotak berwarna. Tarik kotaknya, atau ketuk saja.<div class="legend">'
    + [['p', 'kata ganti'], ['v', 'kata kerja'], ['q', 'kata tanya'], ['b', 'do · does · be'], ['a', 'kata sifat'], ['r', 'sisa kalimat']]
      .map(([k, n]) => `<span class="t k-${k}"><span>${n}</span></span>`).join('') + '</div></div>'
    + progButtons('kalimat', D.sentences.filter(s => stS(s) === 0).length, D.sentences.filter(s => stS(s) === 1).length, 'kalimat', '')
    + '<p class="small" style="margin:6px 2px 0">Kalimat yang benar pada percobaan pertama = sudah bisa.</p><div class="sec">Tingkat</div><div class="list">';
  D.levels.forEach(L => {
    const n = L.n === 6 ? D.sentences.length : D.sentences.filter(s => s.l === L.n).length;
    h += `<button class="item row1" data-go="#/kalimat/${L.n}"><span class="num">${L.n}</span><span><b>${esc(L.idn)}</b><small>${esc(L.rule)} · ${n} kalimat</small></span></button>`;
  });
  app.innerHTML = h + '</div></div>';
}
const PSEUDO = { learn: { n: 'learn', idn: 'Masih belajar', rule: 'semua tingkat · kalimat yang belum bisa' },
                 known: { n: 'known', idn: 'Sudah bisa', rule: 'semua tingkat · kalimat yang sudah bisa' } };
function sentencesOf(level) {
  if (level === 'learn') return D.sentences.filter(s => stS(s) === 0);
  if (level === 'known') return D.sentences.filter(s => stS(s) === 1);
  return level === 6 ? D.sentences : D.sentences.filter(s => s.l === level);
}
function builder(level) {
  const L = PSEUDO[level] || D.levels.find(x => x.n === level);
  const back = '#/kalimat';
  let src = sentencesOf(level);
  let N = Math.min(10, src.length);
  if (!N) { app.innerHTML = head(L.idn, L.rule, back) + '<div class="wrap"><div class="done">Belum ada kalimat di sini.</div></div>'; return; }
  let order = shuffle(src).slice(0, N), q = 0, score = 0, firstTry = true, res = [];
  let target, placed, pool, done;
  function load() {
    if (q >= N) return finish();
    const S = order[q];
    target = S.t.map((t, k) => Object.assign({ id: 't' + k }, t));
    const dis = S.d.map((t, k) => Object.assign({ id: 'd' + k }, t));
    do { pool = shuffle(target.concat(dis)); } while (pool.length > 1 && pool.map(x => x.id).join() === target.map(x => x.id).join());
    placed = []; done = false; firstTry = true;
    render(S);
  }
  function render(S) {
    app.innerHTML = head(L.idn, L.rule, back) + `<div class="wrap">
      <div class="q-top"><div class="dots">${order.map((_, k) => `<i class="${k < q ? (res[k] ? 'ok' : 'on') : ''}"></i>`).join('')}</div><span class="count">${q + 1} / ${N}</span></div>
      <div class="prompt">${esc(S.id)}</div>
      <button class="chip" id="ls">🔊 Dengar</button>
      <div class="zone" id="zone"></div><div class="pool" id="pool"></div>
      <div class="msg" id="msg"></div>
      <div class="btns"><button class="reset" id="rs" aria-label="Ulangi">↺</button><button class="next" id="ck">Cek</button></div></div>`;
    draw();
    document.getElementById('ls').onclick = () => speak(S.en);
    document.getElementById('rs').onclick = () => { pool = shuffle(pool.concat(placed)); placed = []; draw(); clearMsg(); };
    document.getElementById('ck').onclick = () => check(S);
  }
  function draw() {
    const z = document.getElementById('zone'), p = document.getElementById('pool');
    z.innerHTML = placed.map(t => tileHTML(t, 'pt')).join('');
    p.innerHTML = pool.map(t => tileHTML(t, 'pt')).join('');
    z.classList.toggle('ok', done);
  }
  function clearMsg() { const m = document.getElementById('msg'); m.textContent = ''; m.className = 'msg'; }
  function move(id, toZone, index) {
    if (done) return;
    const t = placed.find(x => x.id === id) || pool.find(x => x.id === id);
    placed = placed.filter(x => x.id !== id); pool = pool.filter(x => x.id !== id);
    if (toZone) { if (index == null || index > placed.length) placed.push(t); else placed.splice(index, 0, t); } else pool.push(t);
    clearMsg(); draw();
  }
  function insertIndex(x, y) {
    const els = [...document.getElementById('zone').children];
    for (let k = 0; k < els.length; k++) { const r = els[k].getBoundingClientRect();
      if (y < r.top - 4) return k; if (y <= r.bottom + 4 && x < r.left + r.width / 2) return k; }
    return els.length;
  }
  function check(S) {
    if (done) { q++; load(); return; }
    const ids = placed.map(x => x.id), want = target.map(x => x.id);
    const m = document.getElementById('msg');
    if (ids.join() === want.join()) {
      done = true; res[q] = firstTry; if (firstTry) score++; setS(S, firstTry);
      m.textContent = 'Betul! 👍'; m.className = 'msg ok'; draw(); speak(S.en);
      document.getElementById('ck').textContent = 'Lanjut →';
    } else {
      firstTry = false;
      let k = 0; while (k < ids.length && ids[k] === want[k]) k++;
      const els = [...document.getElementById('zone').children];
      els.slice(k).forEach(el => el.classList.add('bad'));
      m.textContent = (ids.length < want.length && k === ids.length) ? 'Belum lengkap.' : 'Coba lagi.'; m.className = 'msg bad';
      setTimeout(() => els.forEach(el => el.classList.remove('bad')), 900);
    }
  }
  function finish() {
    app.innerHTML = head(L.idn, L.rule, back) + `<div class="wrap"><div class="done">
      <div>Selesai!</div><div class="score">${score} / ${N}</div><div class="small">benar pada percobaan pertama</div>
      <button class="next" id="again">Main lagi</button><button class="next" style="background:var(--card);color:var(--ink);border:1px solid var(--line)" data-go="${back}">Kembali</button></div></div>`;
    document.getElementById('again').onclick = () => {
      src = sentencesOf(level); N = Math.min(10, src.length);
      if (!N) { location.hash = back; return; }
      order = shuffle(src).slice(0, N); q = 0; score = 0; res = []; load(); };
  }
  // Ziehen (Touch + Maus) und Antippen
  let drag = null;
  function onDown(e) {
    const el = e.target.closest('.pt'); if (!el || done) return;
    drag = { el, id: el.dataset.id, x0: e.clientX, y0: e.clientY, moved: false, ghost: null, fromZone: !!el.closest('#zone') };
    try { el.setPointerCapture(e.pointerId); } catch (er) {}
  }
  function onMove(e) {
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8) return;
    if (!drag.moved) { drag.moved = true; drag.ghost = drag.el.cloneNode(true); drag.ghost.classList.add('ghost'); document.body.appendChild(drag.ghost); drag.el.classList.add('lift'); }
    drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px';
    const zr = document.getElementById('zone').getBoundingClientRect();
    document.getElementById('zone').classList.toggle('hot', e.clientY > zr.top - 24 && e.clientY < zr.bottom + 24);
  }
  function onUp(e) {
    if (!drag) return; const d = drag; drag = null;
    const zone = document.getElementById('zone'); if (!zone) return;
    zone.classList.remove('hot');
    if (!d.moved) { move(d.id, !d.fromZone); return; }
    d.ghost.remove();
    const zr = zone.getBoundingClientRect();
    if (e.clientY > zr.top - 24 && e.clientY < zr.bottom + 24) {
      let idx = insertIndex(e.clientX, e.clientY);
      if (d.fromZone) { const orig = placed.findIndex(x => x.id === d.id); if (orig < idx) idx--; }
      move(d.id, true, idx);
    } else move(d.id, false);
  }
  function onCancel() { if (drag && drag.ghost) drag.ghost.remove(); drag = null; if (document.getElementById('zone')) draw(); }
  app.addEventListener('pointerdown', onDown); document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp); document.addEventListener('pointercancel', onCancel);
  cleanup = () => { app.removeEventListener('pointerdown', onDown); document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp); document.removeEventListener('pointercancel', onCancel); };
  load();
}

/* ---------------------------------------------------------- Poster */
function posters() {
  let h = head('Poster', 'Sama seperti poster di dinding', '#/') + '<div class="wrap"><div class="list">';
  D.posters.forEach(p => { h += `<button class="item row1" data-go="#/poster/${p.n}"><span class="num">${p.n}</span><span><b>${esc(p.idn)}</b><small>${esc(p.en)}</small></span></button>`; });
  app.innerHTML = h + '</div><p class="small" style="margin:12px 2px">Ketuk kata bahasa Inggris untuk mendengarnya.</p></div>';
}
function sayBlock(en, p, idn) {
  return `<div class="ex say" data-say="${esc(en)}"><b>${esc(en)}</b>${p ? `<i>${esc(p)}</i>` : ''}<span>${esc(idn)}</span></div>`;
}
function tilesRow(tiles) { return tiles.map(t => `<span class="t k-${t.k}"><span>${esc(t.t)}</span><small>${esc(t.p)}</small></span>`).join(''); }
function poster(n) {
  const P = D.posters.find(x => x.n === n); let b = '';
  if (P.kind === 'pronouns') {
    P.rows.forEach(r => {
      b += `<div class="card"><div class="pn say" data-say="${esc(r[0])}"><span class="w">${esc(r[0])}</span><i>${esc(r[1])}</i><span class="bi">${esc(r[10])}</span></div>
      <div class="forms">${[[2, 3, 0], [4, 5, 1], [6, 7, 2], [8, 9, 3]].map(([a, c, k]) => `<div class="say" data-say="${esc(r[a])}"><b>${esc(r[a])}</b><i>${esc(r[c])}</i><small>${esc(P.cols[k + 1][1])}</small></div>`).join('')}</div></div>`;
    });
    b += '<div class="sec">Contoh</div><div class="card">' + P.ex.map(e => sayBlock(e.en, e.p, e.idn)).join('') + '</div>';
  } else if (P.kind === 'qwords') {
    P.items.forEach(q => { b += `<div class="card"><div class="pn say" data-say="${esc(q.en)}"><span class="w" style="color:var(--purple)">${esc(q.en)}</span><i>${esc(q.p)}</i><span class="bi">${esc(q.idn)}</span></div>${sayBlock(q.ex, q.exp, q.exidn)}</div>`; });
  } else if (P.kind === 'numbers') {
    b += '<div class="numgrid">' + D.themes.numbers.w.map(id => D.wmap[id]).map(w => `<div class="say" data-say="${esc(w.en)}"><div class="d">${esc(w.img.slice(2))}</div><div class="e">${esc(w.en)}</div><i>${esc(w.p)}</i><small>${esc(w.id)}</small></div>`).join('') + '</div>';
    b += `<div class="card">${esc(P.hint)}</div>`;
  } else if (P.kind === 'helpful') {
    b += `<div class="card"><b>${esc(P.note)}</b></div>`;
    P.items.forEach(h => { b += `<div class="card${h.top ? ' top3' : ''}">${sayBlock(h.en, h.p, h.idn).replace('class="ex say"', 'class="say"')}</div>`; });
  } else if (P.kind === 'build') {
    const part = (k, en, idn) => `<span class="t k-${k}"><span>${en}</span><small>${idn}</small></span>`;
    b += `<div class="sec">1 · Kalimat berita</div><div class="card"><div class="struct">${part('p', 'PRONOUN', 'kata ganti orang')}<span class="plus">+</span>${part('v', 'VERB', 'kata kerja')}<span class="plus">+</span>${part('r', 'REST', 'sisa kalimat')}</div>
      <p class="small">I · you · we · they · he · she · it</p>`
      + P.statements.map(s => `<div class="ex say" data-say="${esc(s.tiles.map(t => t.t).join(' '))}"><div>${tilesRow(s.tiles)}</div><span>${esc(s.idn)}</span></div>`).join('') + '</div>';
    b += `<div class="card"><b>he · she · it → VERB + <span style="color:var(--orange)">s</span></b><p class="small">Hanya untuk he / she / it. Yang lain tanpa -s.</p>
      <div class="ex say" data-say="${esc(P.s.tiles.map(t => t.t).join(' '))}"><div>${tilesRow(P.s.tiles)}</div><span>${esc(P.s.idn)}</span></div></div>`;
    b += `<div class="sec">2 · Kalimat tanya</div><div class="card"><div class="struct">${part('q', 'QUESTION WORD', 'kata tanya')}<span class="plus">+</span>${part('b', 'DO / DOES', 'kata bantu')}<span class="plus">+</span>${part('p', 'PRONOUN', 'kata ganti')}<span class="plus">+</span>${part('v', 'VERB', 'kata kerja')}<span class="plus">+</span>${part('r', 'REST', 'sisa kalimat')}</div>
      <p class="small">Kata tanya boleh kosong · does → he / she / it</p>`
      + P.questions.map(s => `<div class="ex say" data-say="${esc(s.tiles.map(t => t.t).join(' '))}"><div>${tilesRow(s.tiles)}</div><span>${esc(s.idn)}</span></div>`).join('') + '</div>';
    b += `<div class="card awas"><b>AWAS!</b> Setelah DOES / DO, kata kerja TANPA -s.<br>✓ Does he work here? &nbsp; ✗ <s>Does he works here?</s></div>`;
  } else if (P.kind === 'verbs') {
    P.groups.forEach(g => { b += `<div class="sec">${esc(g.idn)}</div><div class="vgrid">` + g.items.map(v => `<div class="say" data-say="${esc(v.en)}">${pic(v.img)}<b>${esc(v.en)}</b><i>${esc(v.p)}</i><small>${esc(v.idn)}</small></div>`).join('') + '</div>'; });
    b += `<div class="sec">Kata kerja khusus</div><p class="small">${esc(P.specialNote)}</p><div class="vgrid">` + P.special.map(v => `<div class="say" data-say="${esc(v.en)}">${pic(v.img)}<b>${esc(v.en)}</b><i>${esc(v.p)}</i><small>${esc(v.idn)}</small></div>`).join('') + '</div>';
  }
  app.innerHTML = head(P.idn, P.en, '#/poster') + `<div class="wrap">${b}</div>`;
}

/* ---------------------------------------------------------- Lektionen */
function lessons() {
  let h = head('Pelajaran', 'Materi dari setiap pertemuan', '#/') + '<div class="wrap"><div class="list">';
  D.lessons.forEach(L => { h += `<button class="item row1" data-go="#/pelajaran/${L.n}"><span class="num">${L.n}</span><span><b>${esc(L.idn)}</b><small>${esc(L.en)}</small></span></button>`; });
  app.innerHTML = h + '</div></div>';
}
function lesson(n) {
  const L = D.lessons[n - 1], words = wordsOf('L' + n);
  let h = head(`Pelajaran ${n}`, L.idn, '#/pelajaran') + '<div class="wrap"><div class="list">';
  h += `<button class="item row1" data-go="#/kartu/L${n}">${icon('1f0cf')}<span><b>Kartu Kata</b><small>${words.length} kata dari pelajaran ini</small></span></button>`;
  h += `<button class="item row1" data-go="#/dengar/L${n}">${icon('1f442')}<span><b>Dengar &amp; Pilih</b><small>Kata-kata dari pelajaran ini</small></span></button>`;
  L.p.forEach(pn => { const P = D.posters.find(x => x.n === pn); h += `<button class="item row1" data-go="#/poster/${pn}">${icon('1f4cb')}<span><b>Poster ${pn}: ${esc(P.idn)}</b><small>${esc(P.en)}</small></span></button>`; });
  L.k.forEach(kn => { const K = D.levels.find(x => x.n === kn); h += `<button class="item row1" data-go="#/kalimat/${kn}">${icon('1f9e9')}<span><b>Menyusun Kalimat ${kn}</b><small>${esc(K.idn)}</small></span></button>`; });
  app.innerHTML = h + '</div></div>';
}

/* ---------------------------------------------------------- Info */
function info() {
  const rate = store.get('rate', 0.85);
  app.innerHTML = head('Info', 'Tentang aplikasi ini', '#/') + `<div class="wrap info"><div class="card">
    <h3>Cara baca</h3>
    <p>Di bawah setiap kata bahasa Inggris ada cara bacanya, ditulis seperti bahasa Indonesia.</p>
    <p><b>Huruf vokal ganda = bunyi panjang:</b> key = <i>kii</i> · room = <i>ruum</i></p>
    <p><b>HURUF BESAR = suku kata yang ditekan:</b> towel = <i>TAU-wel</i></p>
    <h3>Suara</h3>
    <p>Suara memakai suara bahasa Inggris dari HP. <button class="chip" id="tes">🔊 Tes suara</button></p>
    <p class="small" id="vstat"></p>
    <p>Kecepatan: <button class="chip${rate === 0.7 ? ' on' : ''}" data-rate="0.7">pelan</button> <button class="chip${rate === 0.85 ? ' on' : ''}" data-rate="0.85">sedang</button> <button class="chip${rate === 1 ? ' on' : ''}" data-rate="1">normal</button></p>
    <p class="small">Kalau tidak ada suara: buka Pengaturan HP → cari «text-to-speech» → pilih mesin Google → pasang data suara bahasa Inggris. Suara lalu juga berfungsi tanpa internet.</p>
    <h3>Kemajuan belajar</h3>
    <p>Kata: <b>${Object.values(PROG.w).filter(v => v === 1).length}</b> sudah bisa · <b>${Object.values(PROG.w).filter(v => v === 0).length}</b> masih belajar<br>
    Kalimat: <b>${Object.values(PROG.s).filter(v => v === 1).length}</b> sudah bisa · <b>${Object.values(PROG.s).filter(v => v === 0).length}</b> masih belajar</p>
    <p class="small">Tanda ini disimpan di HP ini saja. Kalau data browser dihapus, tanda juga hilang.</p>
    <p><button class="chip" id="reset">Hapus semua tanda</button></p>
    <h3>Tanpa internet</h3>
    <p>Setelah dibuka sekali dengan internet, aplikasi ini juga berfungsi tanpa internet. Di Chrome: menu ⋮ → «Tambahkan ke layar utama».</p>
    <h3>Tentang</h3>
    <p>Materi dari kursus bahasa Inggris untuk tim PPLH Puntondo, 2026: kartu kata, poster, dan kalimat dari pertemuan kursus.</p>
    <p class="small">Foto: tim PPLH Puntondo. Gambar emoji: <a href="https://github.com/jdecked/twemoji" target="_blank" rel="noopener">Twemoji</a> © Twitter, Inc. dan kontributor lain, lisensi <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>.</p>
    <p class="small">Versi ${esc(D.v)}</p></div></div>`;
  app.querySelectorAll('[data-rate]').forEach(b => b.onclick = () => { store.set('rate', +b.dataset.rate); info(); speak('This is the speed.'); });
  const stat = () => {
    const el = document.getElementById('vstat'); if (!el) return;
    if (!('speechSynthesis' in window)) { el.textContent = 'Status: browser ini tidak punya suara. Buka aplikasi di Chrome.'; return; }
    pickVoice();
    const vs = speechSynthesis.getVoices(), en = vs.filter(v => /^en/i.test(v.lang));
    el.textContent = 'Status: ' + vs.length + ' suara di HP, ' + en.length + ' bahasa Inggris'
      + (voice ? ' · dipakai: ' + voice.name + ' (' + voice.lang + ')' : '')
      + (voiceState.last ? ' · tes: ' + (voiceState.last === 'ok' ? 'berhasil ✓' : voiceState.last) : '');
  };
  stat(); setTimeout(stat, 800);
  const rs = document.getElementById('reset');
  rs.onclick = () => {
    if (!rs.dataset.sure) { rs.dataset.sure = '1'; rs.textContent = 'Yakin? Ketuk sekali lagi'; rs.classList.add('on'); return; }
    PROG.w = {}; PROG.s = {}; store.set('prog', PROG); toast('Semua tanda dihapus.'); info();
  };
  document.getElementById('tes').onclick = () => {
    voiceState.last = ''; speak('Hello! Welcome to P P L H Puntondo.');
    setTimeout(() => { if (!voiceState.last) voiceState.last = 'tidak ada suara'; stat(); }, 2500);
  };
}

/* ---------------------------------------------------------- Router */
let cleanup = null;
function route() {
  if (cleanup) { cleanup(); cleanup = null; }
  try { if (speechSynthesis.speaking) speechSynthesis.cancel(); } catch (e) {}
  const p = (location.hash.slice(1) || '/').split('/').filter(Boolean);
  window.scrollTo(0, 0);
  if (!p.length) return home();
  const [a, b] = p;
  const okSet = b => b && (D.themes[b] || /^L[1-6]$/.test(b) || b === '@learn' || b === '@known');
  if (a === 'kartu') return okSet(b) ? cards(b) : themeList('kartu');
  if (a === 'dengar') return okSet(b) ? quiz(b) : themeList('dengar');
  if (a === 'kalimat') return PSEUDO[b] ? builder(b) : b && D.levels.find(x => x.n === +b) ? builder(+b) : levels();
  if (a === 'poster') return b && D.posters.find(x => x.n === +b) ? poster(+b) : posters();
  if (a === 'pelajaran') return b && D.lessons[+b - 1] ? lesson(+b) : lessons();
  if (a === 'info') return info();
  home();
}
window.addEventListener('hashchange', route);
route();

/* ---------------------------------------------------------- Offline */
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => {});
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadController || reloaded) return; reloaded = true; location.reload(); });
}
})();
