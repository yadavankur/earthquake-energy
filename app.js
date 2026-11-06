(() => {
  const slides = [...document.querySelectorAll('.slide')];
  const dotsEl = document.getElementById('dots');
  const prev = document.getElementById('prev'), next = document.getElementById('next');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cur = 0, start = 0, raf = 0;
  slides.forEach(() => dotsEl.appendChild(document.createElement('i')));

  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const colors = () => ({ ink: css('--ink'), soft: css('--ink-soft'), grid: css('--grid'), count: css('--count'), energy: css('--energy'), mark: css('--mark'), paper: css('--paper'), paper2: css('--paper-2') });
  const mono = s => `${s}px "IBM Plex Mono", ui-monospace, monospace`;
  const disp = s => `700 ${s}px "Bricolage Grotesque", system-ui, sans-serif`;
  const ease = t => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
  const clamp01 = t => Math.min(Math.max(t, 0), 1);
  const fmt = n => n >= 1 ? Math.round(n).toLocaleString('en-US') : n.toFixed(1);

  function prep(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }

  // Deterministic noise for seismograms
  function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }
  function trace(n, seed, burstAt) {
    const r = rng(seed), pts = [];
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1);
      let a = 0.035 + 0.02 * r();
      // small tremors: scattered blips
      if (r() < 0.025) a += 0.06 + 0.06 * r();
      const d = x - burstAt;
      if (d > 0) a += 0.9 * Math.exp(-d * 9) * (0.7 + 0.3 * r());
      pts.push(a * Math.sin(i * 1.7 + r() * 2) * (r() < 0.5 ? -1 : 1));
    }
    return pts;
  }
  const T1 = trace(900, 7, 0.68), T2 = trace(900, 21, 0.55);

  function drawTrace(c, t, pts, label) {
    const { ctx, w, h } = prep(c), k = colors();
    const mid = h / 2, amp = h * 0.42;
    ctx.strokeStyle = k.grid; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();
    const upto = Math.floor(pts.length * clamp01(t));
    ctx.strokeStyle = k.ink; ctx.lineWidth = 1.3; ctx.beginPath();
    for (let i = 0; i < upto; i++) {
      const x = 8 + (w - 16) * i / (pts.length - 1), y = mid - pts[i] * amp;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    if (upto > 0 && upto < pts.length) {
      const x = 8 + (w - 16) * (upto - 1) / (pts.length - 1);
      ctx.fillStyle = k.mark; ctx.beginPath(); ctx.arc(x, mid - pts[upto - 1] * amp, 4, 0, 7); ctx.fill();
    }
    ctx.font = mono(11); ctx.fillStyle = k.soft;
    ctx.fillText(label[0], 10, 18);
    if (t > 0.75) { ctx.fillStyle = k.mark; ctx.textAlign = 'right'; ctx.fillText(label[1], w - 10, 18); ctx.textAlign = 'left'; }
  }

  function drawCircles(c, t) {
    const { ctx, w, h } = prep(c), k = colors();
    const R = Math.min(h * 0.4, w * 0.24), r = R / Math.sqrt(31.6), r6 = R / Math.sqrt(1000);
    const cx = w * 0.32, cy = h * 0.5;
    // big M8 outline
    ctx.strokeStyle = k.energy; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R * ease(t * 3), 0, 7); ctx.stroke();
    // 32 M7 discs filling it (sunflower layout)
    const n = 32, shown = Math.floor(n * clamp01((t - 0.25) / 0.6));
    ctx.fillStyle = k.count; ctx.globalAlpha = 0.75;
    for (let i = 0; i < shown; i++) {
      const rr = (R - r) * Math.sqrt((i + 0.5) / n), a = i * 2.39996;
      ctx.beginPath(); ctx.arc(cx + rr * Math.cos(a), cy + rr * Math.sin(a), r * 0.92, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // legend column
    const lx = Math.min(w * 0.64, cx + R + 40);
    ctx.font = mono(12); ctx.textBaseline = 'middle';
    ctx.strokeStyle = k.energy; ctx.beginPath(); ctx.arc(lx + 12, cy - 50, 10, 0, 7); ctx.stroke();
    ctx.fillStyle = k.ink; ctx.fillText('one M8', lx + 32, cy - 50);
    ctx.fillStyle = k.count; ctx.beginPath(); ctx.arc(lx + 12, cy, r, 0, 7); ctx.fill();
    ctx.fillStyle = k.ink; ctx.fillText(`M7  ×${shown}`, lx + 32, cy);
    ctx.fillStyle = k.soft; ctx.beginPath(); ctx.arc(lx + 12, cy + 50, Math.max(r6, 1.5), 0, 7); ctx.fill();
    ctx.fillStyle = k.ink; ctx.fillText('M6 (dot)', lx + 32, cy + 50);
    ctx.textBaseline = 'alphabetic';
  }

  const MAGS = [3, 4, 5, 6, 7, 8, 9];
  function axesFrame(ctx, w, h, k, pad) {
    ctx.strokeStyle = k.ink; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, h - pad.b); ctx.lineTo(w - pad.r, h - pad.b); ctx.stroke();
  }

  function drawCounts(c, t) {
    const { ctx, w, h } = prep(c), k = colors();
    const pad = { l: 58, r: 12, t: 16, b: 30 }, pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
    const y = v => pad.t + ph * (1 - Math.log10(v) / 7);
    ctx.font = mono(11); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let p = 0; p <= 7; p++) {
      const yy = y(Math.pow(10, p));
      ctx.strokeStyle = k.grid; ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke();
      ctx.fillStyle = k.soft; ctx.fillText(p >= 6 ? `${Math.pow(10, p - 6)}M` : p >= 3 ? `${Math.pow(10, p - 3)}k` : `${Math.pow(10, p)}`, pad.l - 8, yy);
    }
    axesFrame(ctx, w, h, k, pad);
    const bw = pw / MAGS.length;
    MAGS.forEach((m, i) => {
      const v = Math.pow(10, 10 - m), p = ease((t - i * 0.08) * 2.2);
      const top = y(v), base = y(1), hh = (base - top) * p;
      ctx.fillStyle = k.count; ctx.fillRect(pad.l + i * bw + bw * 0.18, base - hh, bw * 0.64, hh);
      ctx.fillStyle = k.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(`M${m}`, pad.l + i * bw + bw / 2, h - pad.b + 18);
      if (p > 0.95 && bw > 34) { ctx.fillStyle = k.ink; ctx.font = mono(10); ctx.fillText(v >= 1e6 ? `${v / 1e6}M` : v >= 1e3 ? `${v / 1e3}k` : `${v}`, pad.l + i * bw + bw / 2, base - hh - 5); ctx.font = mono(11); }
    });
    ctx.textAlign = 'left';
  }

  function drawRace(c, t) {
    const { ctx, w, h } = prep(c), k = colors();
    const pad = { l: 16, r: 16, t: 22, b: 30 }, pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
    // log space: count 10^(9-m) [7..1 → 0..6 range], energy each 10^(1.5(m-3)) [0..9]; band total 10^(0.5(m-3)) offsets
    const lo = -0.5, hi = 9.5;
    const X = i => pad.l + pw * (i / 6), Y = l => pad.t + ph * (1 - (l - lo) / (hi - lo));
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = k.grid; ctx.beginPath(); ctx.moveTo(X(i), pad.t); ctx.lineTo(X(i), h - pad.b); ctx.stroke();
      ctx.fillStyle = k.ink; ctx.font = mono(11); ctx.textAlign = 'center'; ctx.fillText(`M${MAGS[i]}`, X(i), h - pad.b + 18);
    }
    const series = [
      { f: i => 6 - i, col: k.count, w: 2.5, name: 'number of quakes' },
      { f: i => 1.5 * i + 0.3, col: k.energy, w: 2.5, name: 'energy of each', dash: [6, 5] },
      { f: i => 0.5 * i + 3.1, col: k.energy, w: 4, name: 'total energy of the band' }
    ];
    series.forEach((s, si) => {
      const p = clamp01((t - si * 0.25) / 0.5) * 6;
      if (p <= 0) return;
      ctx.strokeStyle = s.col; ctx.lineWidth = s.w; ctx.setLineDash(s.dash || []);
      ctx.beginPath();
      for (let i = 0; i <= Math.floor(p); i++) { i ? ctx.lineTo(X(i), Y(s.f(i))) : ctx.moveTo(X(i), Y(s.f(i))); }
      const fi = Math.floor(p), fr = p - fi;
      if (fi < 6) ctx.lineTo(X(fi + fr), Y(s.f(fi) + (s.f(fi + 1) - s.f(fi)) * fr));
      ctx.stroke(); ctx.setLineDash([]);
      if (p >= 6) {
        ctx.fillStyle = s.col; ctx.font = mono(11); ctx.textAlign = si === 0 ? 'left' : 'right';
        const lx = si === 0 ? X(0) + 6 : X(6) - 6, ly = si === 0 ? Y(s.f(0)) - 10 : Y(s.f(6)) + (si === 1 ? 16 : -10);
        ctx.fillText(s.name, lx, ly);
      }
    });
    ctx.textAlign = 'left'; ctx.fillStyle = k.soft; ctx.font = mono(10);
    ctx.fillText('log scale', pad.l, 12);
  }

  function drawStack(c, t) {
    const { ctx, w, h } = prep(c), k = colors();
    const band = MAGS.map(m => Math.pow(10, 0.5 * (m - 8)) * 100);
    const pad = { l: 44, r: 12, t: 20, b: 34 }, ph = h - pad.t - pad.b;
    const max = 340, Y = v => h - pad.b - ph * v / max;
    ctx.font = mono(11); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    [0, 100, 200, 300].forEach(v => {
      ctx.strokeStyle = k.grid; ctx.beginPath(); ctx.moveTo(pad.l, Y(v)); ctx.lineTo(w - pad.r, Y(v)); ctx.stroke();
      ctx.fillStyle = k.soft; ctx.fillText(v, pad.l - 8, Y(v));
    });
    ctx.textBaseline = 'alphabetic';
    const colW = Math.min(110, (w - pad.l - pad.r) * 0.28);
    const x1 = pad.l + (w - pad.l - pad.r) * 0.28 - colW / 2, x2 = pad.l + (w - pad.l - pad.r) * 0.72 - colW / 2;
    // left: stacked M3..M8
    let acc = 0;
    for (let i = 0; i < 6; i++) {
      const p = ease((t - i * 0.08) * 2.5), v = band[i] * p;
      ctx.fillStyle = i === 5 ? k.count : k.soft; ctx.globalAlpha = 0.45 + i * 0.1;
      ctx.fillRect(x1, Y(acc + v), colW, Y(acc) - Y(acc + v));
      ctx.globalAlpha = 1;
      if (p > 0.9 && band[i] >= 30) { ctx.fillStyle = k.paper; ctx.font = mono(11); ctx.textAlign = 'center'; ctx.fillText(`M${MAGS[i]}`, x1 + colW / 2, Y(acc + v / 2) + 4); }
      acc += v;
    }
    // right: M9
    const p9 = ease((t - 0.5) * 2), v9 = band[6] * p9;
    ctx.fillStyle = k.energy; ctx.fillRect(x2, Y(v9), colW, Y(0) - Y(v9));
    ctx.fillStyle = k.ink; ctx.font = mono(12); ctx.textAlign = 'center';
    ctx.fillText('M3 to M8', x1 + colW / 2, h - pad.b + 18);
    ctx.fillText('M9 only', x2 + colW / 2, h - pad.b + 18);
    ctx.font = disp(18);
    ctx.fillText(Math.round(acc), x1 + colW / 2, Y(acc) - 8);
    if (p9 > 0) ctx.fillText(Math.round(v9), x2 + colW / 2, Y(v9) - 8);
    ctx.textAlign = 'left';
  }

  const bInput = document.getElementById('b'), bval = document.getElementById('bval'), bread = document.getElementById('bread');
  function drawSlider(c, t) {
    const { ctx, w, h } = prep(c), k = colors(), b = +bInput.value;
    const rel = MAGS.map(m => Math.pow(10, (1.5 - b) * (m - 9)));
    const mx = Math.max(...rel), total = rel.reduce((a, v) => a + v, 0);
    const pad = { l: 12, r: 12, t: 16, b: 30 }, pw = w - pad.l - pad.r, ph = h - pad.t - pad.b, bw = pw / 7;
    ctx.strokeStyle = k.ink; ctx.beginPath(); ctx.moveTo(pad.l, h - pad.b); ctx.lineTo(w - pad.r, h - pad.b); ctx.stroke();
    rel.forEach((v, i) => {
      const hh = ph * (v / mx) * ease(t * 2);
      const share = v / total;
      ctx.fillStyle = share === Math.max(...rel) / total ? k.energy : k.count;
      ctx.fillRect(pad.l + i * bw + bw * 0.15, h - pad.b - hh, bw * 0.7, hh);
      ctx.fillStyle = k.ink; ctx.font = mono(11); ctx.textAlign = 'center';
      ctx.fillText(`M${MAGS[i]}`, pad.l + i * bw + bw / 2, h - pad.b + 18);
      if (bw > 30) { ctx.fillStyle = k.soft; ctx.font = mono(10); ctx.fillText(`${Math.round(share * 100)}%`, pad.l + i * bw + bw / 2, h - pad.b - hh - 5); }
    });
    ctx.textAlign = 'left';
    bval.textContent = b.toFixed(2);
    const step = Math.pow(10, b) / 31.62;
    const m9 = Math.round(rel[6] / total * 100), small = Math.round(rel.slice(0, 4).reduce((a, v) => a + v, 0) / total * 100);
    bread.textContent = step < 1
      ? `Each step down keeps ${Math.round(step * 100)}% of the band's energy. M9 share: ${m9}%. M3–M6 share: ${small}%.`
      : step < 1.02 ? `At b ≈ 1.5 every band carries equal energy. This is far above any real region.`
      : `Above b = 1.5 small quakes would win, with M3 carrying the most. No real region comes close to this.`;
  }
  bInput.addEventListener('input', () => drawSlider(document.querySelector('[data-anim="slider"] canvas'), 1));

  const LADDER = [
    { m: 3, e: 9.3, v: '2 GJ', t: 'a tank of petrol (0.5 t TNT)' },
    { m: 4, e: 10.8, v: '63 GJ', t: 'one MOAB bomb (11 t TNT)' },
    { m: 5, e: 12.3, v: '2 TJ', t: 'Beirut port blast, 2020 (0.5–1 kt)' },
    { m: 6, e: 13.8, v: '63 TJ', t: 'Hiroshima bomb (15 kt)' },
    { m: 7, e: 15.3, v: '2 PJ', t: 'Chelyabinsk meteor, 2013 (~0.5 Mt)' },
    { m: 8, e: 16.8, v: '63 PJ', t: 'Tunguska blast, 1908 (~15 Mt)' },
    { m: 9, e: 18.3, v: '2 EJ', t: 'ten Tsar Bombas (50 Mt each)' }
  ];
  function drawLadder(c, t) {
    const { ctx, w, h } = prep(c), k = colors();
    const pad = { l: 12, r: 12, t: 6, b: 26 }, rowH = (h - pad.t - pad.b) / LADDER.length;
    const lo = 8, hi = 18.6, X = l => pad.l + (w - pad.l - pad.r) * (l - lo) / (hi - lo);
    LADDER.forEach((r, i) => {
      const y0 = pad.t + i * rowH, p = ease((t - i * 0.09) * 2);
      const bh = Math.min(14, rowH - 24), by = y0 + 18;
      ctx.lineWidth = 1; ctx.strokeStyle = k.grid;
      for (let d = 9; d <= 18; d++) { ctx.beginPath(); ctx.moveTo(X(d), by - 3); ctx.lineTo(X(d), by + bh + 3); ctx.stroke(); }
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.font = mono(11);
      ctx.fillStyle = k.ink; ctx.fillText('M' + r.m, pad.l, y0 + 12);
      ctx.fillStyle = k.soft; ctx.fillText(r.t, pad.l + 26, y0 + 12);
      if (p <= 0) return;
      const x1 = pad.l + (X(r.e) - pad.l) * p;
      ctx.fillStyle = k.energy; ctx.fillRect(pad.l, by, x1 - pad.l, bh);
      if (p > 0.95) {
        const tw = ctx.measureText(r.v).width;
        if (x1 + 6 + tw < w - pad.r) { ctx.fillStyle = k.ink; ctx.textAlign = 'left'; ctx.fillText(r.v, x1 + 6, by + bh - 2); }
        else { ctx.fillStyle = k.paper; ctx.textAlign = 'right'; ctx.fillText(r.v, x1 - 6, by + bh - 2); }
      }
    });
    ctx.font = mono(10); ctx.fillStyle = k.soft; ctx.textAlign = 'center';
    [[9, '1 GJ'], [12, '1 TJ'], [15, '1 PJ'], [18, '1 EJ']].forEach(([d, s]) => ctx.fillText(s, X(d), h - pad.b + 16));
    ctx.textAlign = 'left';
  }

  const GIANTS = [
    { y: 1952, m: 9.0, n: 'Kamchatka' }, { y: 1960, m: 9.5, n: 'Chile' }, { y: 1964, m: 9.2, n: 'Alaska' },
    { y: 2004, m: 9.1, n: 'Sumatra' }, { y: 2011, m: 9.1, n: 'Tohoku' }
  ];
  function drawTimeline(c, t) {
    const { ctx, w, h } = prep(c), k = colors();
    const pad = 24, X = yr => pad + (w - 2 * pad) * (yr - 1900) / 126, base = h * 0.62;
    ctx.strokeStyle = k.ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pad, base); ctx.lineTo(w - pad, base); ctx.stroke();
    ctx.font = mono(11); ctx.textAlign = 'center'; ctx.fillStyle = k.soft;
    for (let yr = 1900; yr <= 2020; yr += 20) {
      ctx.beginPath(); ctx.moveTo(X(yr), base); ctx.lineTo(X(yr), base + 6); ctx.strokeStyle = k.ink; ctx.lineWidth = 1; ctx.stroke();
      if (w > 420 || yr % 40 === 0) ctx.fillText(yr, X(yr), base + 22);
    }
    const Rmax = Math.min(h * 0.24, w * 0.11);
    GIANTS.forEach((g, i) => {
      const p = ease((t - i * 0.15) * 2.5); if (p <= 0) return;
      const r = Rmax * Math.sqrt(Math.pow(10, 1.5 * (g.m - 9.5))) * p;
      const cx = X(g.y), cy = base - r - 4;
      ctx.fillStyle = g.n === 'Chile' ? k.energy : k.count; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      if (p > 0.9) {
        ctx.fillStyle = k.ink; ctx.font = mono(10);
        const ly = i % 2 ? base + 40 : base + 54;
        ctx.fillText(`${g.n} ${g.y}`, cx, ly); ctx.fillText(`M${g.m.toFixed(1)}`, cx, ly + 12);
      }
    });
    ctx.textAlign = 'left';
  }

  const ANIMS = {
    trace: { d: 4200, f: (c, t) => drawTrace(c, t, T1, ['many small tremors…', '…then one great quake']) },
    circles: { d: 3600, f: drawCircles },
    counts: { d: 2400, f: drawCounts },
    race: { d: 3600, f: drawRace },
    stack: { d: 3200, f: drawStack },
    ladder: { d: 2800, f: drawLadder },
    slider: { d: 900, f: drawSlider },
    timeline: { d: 3000, f: drawTimeline },
    trace2: { d: 4200, f: (c, t) => drawTrace(c, t, T2, ['the taps', 'the blow']) }
  };

  function frame(now) {
    const s = slides[cur], a = ANIMS[s.dataset.anim], c = s.querySelector('canvas');
    const t = reduce ? 1 : (now - start) / a.d;
    a.f(c, Math.min(t, 1));
    if (t < 1) raf = requestAnimationFrame(frame);
  }
  function play() { cancelAnimationFrame(raf); start = performance.now(); raf = requestAnimationFrame(frame); }
  function redrawStill() { const s = slides[cur]; ANIMS[s.dataset.anim].f(s.querySelector('canvas'), 1); }

  function go(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    slides[cur].classList.remove('active'); cur = i; slides[cur].classList.add('active');
    [...dotsEl.children].forEach((d, j) => d.classList.toggle('on', j === cur));
    prev.disabled = cur === 0; next.textContent = cur === slides.length - 1 ? 'Replay' : 'Next';
    slides[cur].scrollTop = 0;
    play();
  }
  prev.addEventListener('click', () => go(cur - 1));
  next.addEventListener('click', () => cur === slides.length - 1 ? go(0) : go(cur + 1));
  document.addEventListener('keydown', e => {
    if (e.target === bInput) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') go(cur + 1);
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(cur - 1);
  });
  slides.forEach(s => s.querySelector('.drum')?.addEventListener('click', () => { if (s.dataset.anim !== 'slider') play(); }));
  let sx = null, sy = null;
  const box = document.getElementById('slides');
  box.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  box.addEventListener('touchend', e => {
    if (sx === null || e.target === bInput) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(cur + (dx < 0 ? 1 : -1));
    sx = null;
  });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(redrawStill, 120); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redrawStill);
  new MutationObserver(redrawStill).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (document.fonts) document.fonts.ready.then(() => { if (performance.now() - start > ANIMS[slides[cur].dataset.anim].d) redrawStill(); });

  go(0);
})();
