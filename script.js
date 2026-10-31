/* ============================================================
   KEYWIKI — script.js
   1. Intro: nach 3.2s automatisch schließen, Skip-Button
   2. Tab-Navigation
   3. Keyboard-Canvas: Tasten-Ripple-Animation
   4. Force-Curve-Canvas: Switch-Charakteristiken
   5. Switch-Querschnitt-Canvas
   6. PCB-Canvas: Trace-Routing-Animation
   7. Feel-Waveform-Canvas
   8. Layer-Visualizer
   9. Scroll-Reveal
   ============================================================ */

(() => {
  'use strict';

  const $ = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => [...p.querySelectorAll(s)];
  const AMBER = '#d4a017';
  const GREEN = '#3db87a';

  /* ---- 1. Intro ----------------------------------------- */

  const intro = $('#intro');
  const app   = $('#app');
  const skip  = $('#intro-skip');

  function closeIntro() {
    intro.classList.add('done');
    app.hidden = false;
    app.style.animation = 'page-in .5s cubic-bezier(0.23,1,0.32,1)';
    setTimeout(() => intro.remove(), 700);
    initApp();
  }

  // Auto-close after animation completes
  setTimeout(closeIntro, 3400);
  skip.addEventListener('click', closeIntro);

  /* ---- 2. Tab Navigation --------------------------------- */

  function initApp() {
    // Page switching
    $$('.tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.page;
        $$('.tab').forEach(t => { t.classList.remove('tab--active'); t.setAttribute('aria-selected','false'); });
        btn.classList.add('tab--active');
        btn.setAttribute('aria-selected','true');
        $$('.page').forEach(p => { p.hidden = true; p.classList.remove('page--active'); });
        const pg = $(`#page-${target}`);
        if (pg) {
          pg.hidden = false; pg.classList.add('page--active');
          pg.classList.add('page--enter');
          setTimeout(() => pg.classList.remove('page--enter'), 350);
          onPageEnter(target);
        }
      });
    });

    // page-link buttons
    $$('[data-page-link]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const btn = $(`.tab[data-page="${a.dataset.pageLink}"]`);
        if (btn) btn.click();
      });
    });

    // Init first page
    onPageEnter('build');

    // Reveal observer
    const ro = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); ro.unobserve(e.target); } });
    }, { threshold: .12 });
    $$('[data-reveal]').forEach(el => ro.observe(el));
  }

  function onPageEnter(page) {
    if (page === 'build')    { initKbdCanvas(); initLayerViz(); }
    if (page === 'switches') { initSwitchPage(); }
    if (page === 'pcb')      { initPcbCanvas(); }
    if (page === 'feel')     { initFeelPage(); }
  }

  /* ---- 3. Keyboard Canvas (Hero) ------------------------- */

  function initKbdCanvas() {
    const c = $('#kbd-canvas');
    if (!c || c._init) return;
    c._init = true;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;

    // Simple keyboard grid
    const rows = [
      { keys: 14, y: 16,  w: 34, h: 30 },
      { keys: 14, y: 52,  w: 34, h: 30 },
      { keys: 13, y: 88,  w: 34, h: 30 },
      { keys: 12, y: 124, w: 34, h: 30 },
    ];

    let ripples = [];
    let frame = 0;

    function drawKbd() {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0e0e14';
      ctx.beginPath(); ctx.roundRect(4, 4, W-8, H-8, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(212,160,23,.4)'; ctx.lineWidth = 1;
      ctx.stroke();

      rows.forEach((row, ri) => {
        const startX = (W - row.keys * (row.w+2)) / 2;
        for (let i = 0; i < row.keys; i++) {
          const x = startX + i * (row.w+2);
          const y = row.y;
          // Random press animation
          const pressed = Math.sin(frame*.015 + ri*.7 + i*.4) > .96;
          const dy = pressed ? 3 : 0;

          ctx.fillStyle = pressed ? '#1a1208' : '#151520';
          ctx.beginPath(); ctx.roundRect(x, y+dy, row.w, row.h-dy, 3); ctx.fill();
          ctx.strokeStyle = pressed ? AMBER : 'rgba(212,160,23,.25)';
          ctx.lineWidth = pressed ? 1.5 : .8;
          ctx.stroke();

          if (pressed) {
            // Glow
            ctx.shadowBlur = 8; ctx.shadowColor = AMBER;
            ctx.strokeStyle = AMBER; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.roundRect(x, y+dy, row.w, row.h-dy, 3); ctx.stroke();
            ctx.shadowBlur = 0;
            ripples.push({ x: x+row.w/2, y: y+dy+row.h/2, r: 0, a: .6 });
          }
        }
      });

      // Ripples
      ripples = ripples.filter(r => r.a > 0);
      ripples.forEach(r => {
        r.r += 2; r.a -= .04;
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(212,160,23,${r.a.toFixed(2)})`; ctx.lineWidth = 1;
        ctx.stroke();
      });

      frame++;
      requestAnimationFrame(drawKbd);
    }
    drawKbd();
  }

  /* ---- 4. Layer Visualizer ------------------------------- */

  function initLayerViz() {
    const viz = $('#layers-viz');
    if (!viz || viz._init) return;
    viz._init = true;
    const layers = [
      { label: 'KEYCAPS',  col: '#2a2018' },
      { label: 'PLATE',    col: '#1a1a28' },
      { label: 'SWITCHES', col: '#1a1a1a' },
      { label: 'PCB',      col: '#0a1a0e' },
      { label: 'CASE',     col: '#0e0e0e' },
    ];
    layers.forEach((l, i) => {
      const d = document.createElement('div');
      d.style.cssText = `position:absolute;left:${10+i*8}%;width:${82-i*8}%;height:22px;
        background:${l.col};border:1px solid rgba(212,160,23,${.15+i*.05});
        border-radius:2px;top:${i*26}px;display:flex;align-items:center;padding:0 12px;
        font:500 10px/1 JetBrains Mono,monospace;letter-spacing:.12em;color:rgba(212,160,23,.6);
        transition:transform .2s ease,border-color .2s ease`;
      d.textContent = l.label;
      d.dataset.li = i;
      d.addEventListener('mouseenter', () => {
        d.style.transform = 'translateX(-6px)';
        d.style.borderColor = 'rgba(212,160,23,.7)';
      });
      d.addEventListener('mouseleave', () => {
        d.style.transform = '';
        d.style.borderColor = '';
      });
      viz.appendChild(d);
    });

    // Layer-items click
    $$('.layer-item').forEach(item => {
      item.addEventListener('click', () => {
        $$('.layer-item').forEach(x => x.classList.remove('active'));
        item.classList.add('active');
        const li = parseInt(item.dataset.layer);
        $$('[data-li]', viz).forEach(d => {
          const idx = parseInt(d.dataset.li);
          d.style.transform = idx === li ? 'translateX(-14px)' : idx < li ? 'translateY(-4px)' : '';
          d.style.borderColor = idx === li ? AMBER : '';
        });
      });
    });
  }

  /* ---- 5. Switch Page ------------------------------------ */

  const SWITCHES = {
    linear:   { name:'Cherry MX Red', actuation:45, total:4.0, pre:2.0, bump:0, click:false, color:'#e05555', lube:'205g0', sound:'Thock' },
    tactile:  { name:'Gateron Brown', actuation:55, total:4.0, pre:2.0, bump:0.5, click:false, color:'#a05820', lube:'3204', sound:'Thud' },
    clicky:   { name:'Cherry MX Blue', actuation:60, total:4.0, pre:2.2, bump:0.6, click:true, color:'#4488ff', lube:'None', sound:'Click' },
    optical:  { name:'Gateron Optical Red', actuation:45, total:4.0, pre:1.5, bump:0, click:false, color:'#dd2244', lube:'205g0', sound:'Thock' },
    he:       { name:'Wooting HE', actuation:'0.1–4.0 adj', total:4.0, pre:'adj', bump:0, click:false, color:'#aa44ff', lube:'Dielectric', sound:'Thock' },
  };

  const SW_TABLE = [
    ['Cherry MX Red','Linear','45g','4.0mm','Quiet','205g0'],
    ['Gateron Yellow','Linear','35g','4.0mm','Quiet','205g0'],
    ['Topre 45g','Tactile','45g','4.0mm','Thock','N/A'],
    ['Holy Pandas','Tactile','67g','4.0mm','Thud','3204'],
    ['Cherry MX Blue','Clicky','60g','4.0mm','Loud','—'],
    ['Kailh Box White','Clicky','50g','3.6mm','Click','—'],
    ['Wooting HE','Hall Effect','Adj','4.0mm','Thock','Dielectric'],
    ['Geon Raptor HE','Hall Effect','Adj','4.0mm','Thock','Dielectric'],
  ];

  let currentSw = 'linear';
  let forceTick = 0;

  function initSwitchPage() {
    const fc = $('#force-canvas');
    const sc = $('#switch-canvas');
    const tb = $('#sw-tbody');
    if (!fc || fc._init) return;
    fc._init = true;

    // Table
    SW_TABLE.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = row.map(c => `<td>${c}</td>`).join('');
      tb.appendChild(tr);
    });

    // Selector
    $$('.sw-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.sw-btn').forEach(b => b.classList.remove('sw-btn--active'));
        btn.classList.add('sw-btn--active');
        currentSw = btn.dataset.sw;
        drawForceCurve(fc.getContext('2d'), fc.width, fc.height);
        drawSwitch(sc.getContext('2d'), sc.width, sc.height);
        updateStats();
      });
    });

    // Animate force curve continuously
    function animLoop() {
      forceTick++;
      drawForceCurve(fc.getContext('2d'), fc.width, fc.height);
      drawSwitch(sc.getContext('2d'), sc.width, sc.height);
      requestAnimationFrame(animLoop);
    }
    animLoop();
    updateStats();
  }

  function drawForceCurve(ctx, W, H) {
    const sw = SWITCHES[currentSw];
    if (!sw) return;
    ctx.clearRect(0,0,W,H);

    // Grid
    ctx.strokeStyle = 'rgba(212,160,23,.07)'; ctx.lineWidth = 1;
    for (let i=1; i<5; i++) {
      const y = H/5*i;
      ctx.beginPath(); ctx.moveTo(40,y); ctx.lineTo(W-16,y); ctx.stroke();
    }
    for (let i=1; i<5; i++) {
      const x = 40 + (W-56)/4*i;
      ctx.beginPath(); ctx.moveTo(x,H-30); ctx.lineTo(x,16); ctx.stroke();
    }

    // Axes labels
    ctx.fillStyle = 'rgba(212,160,23,.5)';
    ctx.font = '10px JetBrains Mono';
    ctx.fillText('Force (g)', 2, 16);
    ctx.fillText('Travel (mm)', W-70, H-6);
    ['100','75','50','25'].forEach((v,i) => ctx.fillText(v, 6, H/5*(i+1)+4));

    // Curve
    const numPts = 80;
    const xStart = 40, xEnd = W-20;
    ctx.beginPath();
    ctx.strokeStyle = sw.color; ctx.lineWidth = 2.5;
    for (let i=0; i<=numPts; i++) {
      const t = i/numPts;  // 0=top, 1=bottom travel
      let g;
      if (sw.click && t > .4 && t < .55) {
        // Click spike
        g = 60 + (t-.4)*280 - Math.max(0, (t-.5)*300);
      } else if (sw.bump > 0 && t > .35 && t < .55) {
        g = 55 + Math.sin((t-.35)*Math.PI/0.2)*sw.bump*40;
      } else {
        g = 45 + t*50;
      }
      // Animate: travelling marker
      const markerT = ((forceTick * .012) % 1);
      if (Math.abs(t - markerT) < .015) {
        ctx.shadowBlur = 8; ctx.shadowColor = sw.color;
      } else { ctx.shadowBlur = 0; }
      const x = xStart + t*(xEnd-xStart);
      const y = H-30 - (g/120)*(H-50);
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Actuation marker
    const act = 0.5;
    const ax = xStart + act*(xEnd-xStart);
    ctx.strokeStyle = 'rgba(212,160,23,.6)'; ctx.lineWidth = 1; ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.moveTo(ax,16); ctx.lineTo(ax,H-30); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = AMBER; ctx.font = '9px JetBrains Mono';
    ctx.fillText('ACTUATION', ax-30, 12);
  }

  function drawSwitch(ctx, W, H) {
    const sw = SWITCHES[currentSw];
    if (!sw) return;
    ctx.clearRect(0,0,W,H);
    const cx = W/2;
    const t = ((forceTick * .012) % 1);
    const stemY = 20 + t*30; // stem travels down

    // Lower housing
    ctx.fillStyle = '#1a1a1a'; ctx.strokeStyle = sw.color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(cx-40, H-90, 80, 80, 5); ctx.fill(); ctx.stroke();
    // Pins
    [[cx-20, H-10],[cx+20, H-10]].forEach(([x,y]) => {
      ctx.fillStyle = AMBER;
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = AMBER; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, H-90); ctx.lineTo(x, y); ctx.stroke();
    });

    // Spring
    const sy0 = stemY+95, sy1 = H-90;
    for (let s=0; s<6; s++) {
      const y0 = sy0 + (sy1-sy0)/6*s;
      const y1 = sy0 + (sy1-sy0)/6*(s+1);
      const dx = (s%2===0) ? 12 : -12;
      ctx.strokeStyle = '#666'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, y0); ctx.lineTo(cx+dx, (y0+y1)/2); ctx.lineTo(cx, y1); ctx.stroke();
    }

    // Upper housing
    ctx.fillStyle = '#222'; ctx.strokeStyle = sw.color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(cx-45, stemY+60, 90, 35, 4); ctx.fill(); ctx.stroke();
    // Hole
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(cx, stemY+77, 16, 0, Math.PI*2); ctx.fill();

    // Stem
    ctx.fillStyle = '#2a2018';
    ctx.strokeStyle = sw.color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(cx-18, stemY, 36, 70, 4); ctx.fill(); ctx.stroke();
    // Cross
    ctx.fillStyle = sw.color;
    ctx.fillRect(cx-5, stemY+8, 10, 32);
    ctx.fillRect(cx-14, stemY+18, 28, 10);

    // Glow around stem when at actuation
    if (t > .42 && t < .58) {
      ctx.shadowBlur = 12; ctx.shadowColor = sw.color;
      ctx.strokeStyle = sw.color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(cx-18, stemY, 36, 70, 4); ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  function updateStats() {
    const sw = SWITCHES[currentSw];
    if (!sw) return;
    const el = $('#sw-stats');
    if (!el) return;
    el.innerHTML = [
      ['ACTUATION', sw.actuation+'g'],
      ['TOTAL', sw.total+'mm'],
      ['PRE-TRAVEL', sw.pre+'mm'],
      ['LUBE', sw.lube],
    ].map(([l,v]) => `<div class="sw-stat-item"><strong style="color:${sw.color}">${v}</strong>${l}</div>`).join('');
  }

  /* ---- 6. PCB Canvas ------------------------------------- */

  let pcbFrame = 0, pcbPhase = 0, pcbTraces = [], pcbComponents = [], pcbDone = false;

  function initPcbCanvas() {
    const c = $('#pcb-canvas');
    if (!c || c._init) return;
    c._init = true;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;

    // Generate random grid of solder pads (switch matrix)
    const cols = 14, rows = 5;
    const sw = { x: (W-60) / cols, y: (H-80) / rows };
    const pads = [];
    for (let r=0; r<rows; r++) {
      for (let col=0; col<cols; col++) {
        pads.push({ x: 30 + col*sw.x + sw.x/2, y: 40 + r*sw.y + sw.y/2 });
      }
    }

    // Horizontal traces (row wires)
    const rowTraces = [];
    for (let r=0; r<rows; r++) {
      const y = 40 + r*sw.y + sw.y/2;
      rowTraces.push({ x1: 20, y1: y, x2: W-20, y2: y, progress: 0 });
    }
    // Vertical traces (column diodes)
    const colTraces = [];
    for (let col=0; col<cols; col++) {
      const x = 30 + col*sw.x + sw.x/2;
      colTraces.push({ x1: x, y1: 30, x2: x, y2: H-30, progress: 0 });
    }

    const steps = [
      { text: 'Plotting switch matrix...', end: 40 },
      { text: 'Routing row wires...', end: 55 },
      { text: 'Routing column traces...', end: 70 },
      { text: 'Placing components...', end: 85 },
      { text: 'Design rule check: PASS', end: 100 },
    ];

    function draw() {
      pcbFrame++;
      ctx.fillStyle = '#010a04';
      ctx.fillRect(0,0,W,H);

      const pct = Math.min(100, pcbFrame * .4);
      updatePcbProgress(pct, steps);

      // Board outline
      ctx.strokeStyle = 'rgba(61,184,122,.5)'; ctx.lineWidth = 2;
      ctx.strokeRect(12, 12, W-24, H-24);
      // Corner marks
      [[12,12],[W-12,12],[12,H-12],[W-12,H-12]].forEach(([x,y]) => {
        ctx.strokeStyle = GREEN; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x-6,y); ctx.lineTo(x+6,y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x,y-6); ctx.lineTo(x,y+6); ctx.stroke();
      });

      // Copper fill hint
      if (pct > 10) {
        ctx.fillStyle = 'rgba(61,184,122,.02)';
        ctx.fillRect(14,14,W-28,H-28);
      }

      // Row traces
      if (pct > 40) {
        rowTraces.forEach((t, i) => {
          t.progress = Math.min(1, (pct-40)/15 - i*.04);
          if (t.progress <= 0) return;
          ctx.strokeStyle = `rgba(200,120,20,${.5+.3*t.progress})`; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(t.x1, t.y1);
          ctx.lineTo(t.x1 + (t.x2-t.x1)*t.progress, t.y1); ctx.stroke();
        });
      }

      // Col traces
      if (pct > 55) {
        colTraces.forEach((t, i) => {
          t.progress = Math.min(1, (pct-55)/15 - i*.02);
          if (t.progress <= 0) return;
          ctx.strokeStyle = `rgba(61,184,122,${.5+.3*t.progress})`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(t.x1, t.y1);
          ctx.lineTo(t.x1, t.y1 + (t.y2-t.y1)*t.progress); ctx.stroke();
        });
      }

      // Pads
      pads.forEach((p, i) => {
        const appear = (pct-5)/85;
        const pi = i/(pads.length-1);
        if (pi > appear) return;
        // Outer ring
        ctx.strokeStyle = `rgba(200,120,20,.7)`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI*2); ctx.stroke();
        // Pin holes
        ctx.fillStyle = '#010a04';
        ctx.beginPath(); ctx.arc(p.x-4, p.y, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(p.x+4, p.y, 2.5, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#c87814'; ctx.lineWidth = .8;
        ctx.beginPath(); ctx.arc(p.x-4, p.y, 2.5, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(p.x+4, p.y, 2.5, 0, Math.PI*2); ctx.stroke();
      });

      // MCU chip
      if (pct > 70) {
        const cx = W-80, cy = H/2;
        const a = Math.min(1, (pct-70)/15);
        ctx.globalAlpha = a;
        ctx.fillStyle = '#0e1a10'; ctx.strokeStyle = GREEN; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(cx-25, cy-20, 50, 40, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = GREEN; ctx.font = '8px JetBrains Mono';
        ctx.fillText('RP2040', cx-16, cy+3);
        // Legs
        for (let pin=0; pin<8; pin++) {
          const py = cy-20 + pin*6;
          ctx.strokeStyle = `rgba(200,120,20,.7)`; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(cx-25, py); ctx.lineTo(cx-32, py); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx+25, py); ctx.lineTo(cx+32, py); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // USB connector
      if (pct > 80) {
        const a = Math.min(1, (pct-80)/10);
        ctx.globalAlpha = a;
        ctx.fillStyle = '#111'; ctx.strokeStyle = 'rgba(212,160,23,.7)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(W/2-14, H-22, 28, 12, 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(212,160,23,.6)'; ctx.font = '7px JetBrains Mono';
        ctx.fillText('USB-C', W/2-10, H-13);
        ctx.globalAlpha = 1;
      }

      // Scan line animation
      const scanY = (pcbFrame * 2) % H;
      ctx.strokeStyle = 'rgba(61,184,122,.1)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(14, scanY); ctx.lineTo(W-14, scanY); ctx.stroke();

      if (pct < 100) requestAnimationFrame(draw);
    }
    draw();

    // Trigger spec cards reveal
    setTimeout(() => {
      $$('.pcb-spec-card[data-reveal]').forEach((el, i) => {
        setTimeout(() => el.classList.add('revealed'), i*80);
      });
    }, 3000);
  }

  function updatePcbProgress(pct, steps) {
    const bar = $('#pcb-bar');
    const txt = $('#pcb-step-text');
    if (bar) bar.style.width = pct + '%';
    if (txt) {
      const step = steps.findLast(s => pct >= (steps[steps.indexOf(s)-1]?.end || 0));
      if (step) txt.textContent = step.text;
    }
  }

  /* ---- 7. Feel Waveforms --------------------------------- */

  const WAVEFORMS = {
    linear:  (t) => .5 - t*.3 + Math.sin(t*Math.PI*.5)*.15,
    tactile: (t) => .5 - t*.25 + (t > .3 && t < .55 ? Math.sin((t-.3)*Math.PI/.25)*.3 : 0),
    clicky:  (t) => .5 - t*.2 + (t > .38 && t < .45 ? (t-.38)*5 : 0) + (t > .45 && t < .52 ? (.45-t+.07)*5 + Math.sin(t*60)*.04 : 0),
    he:      (t) => .5 - t*.35,
  };

  let feelTick = 0;

  function initFeelPage() {
    $$('.feel-card').forEach(card => {
      card.addEventListener('click', () => {
        $$('.feel-card').forEach(c => c.classList.remove('feel-card--active'));
        card.classList.add('feel-card--active');
      });
    });

    function animFeel() {
      feelTick++;
      Object.keys(WAVEFORMS).forEach(type => {
        const cv = $(`#wave-${type}`);
        if (!cv) return;
        const ctx = cv.getContext('2d');
        const W = cv.width, H = cv.height;
        ctx.clearRect(0,0,W,H);
        const active = $$(`.feel-card--active`)[0]?.dataset.feel === type;
        const col = active ? AMBER : 'rgba(212,160,23,.45)';
        const phase = feelTick*.02;
        ctx.strokeStyle = col; ctx.lineWidth = active ? 2 : 1.2;
        if (active) { ctx.shadowBlur = 8; ctx.shadowColor = col; }
        ctx.beginPath();
        for (let i=0; i<=100; i++) {
          const t = i/100;
          const y = WAVEFORMS[type](t) + Math.sin(phase + t*8)*.04;
          const px = t*W, py = y*H;
          i===0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Travelling dot
        const dt = ((feelTick*.015)%1);
        const dy = WAVEFORMS[type](dt) + Math.sin(phase + dt*8)*.04;
        ctx.beginPath(); ctx.arc(dt*W, dy*H, active ? 4 : 2.5, 0, Math.PI*2);
        ctx.fillStyle = col; ctx.fill();
      });
      requestAnimationFrame(animFeel);
    }
    if (!window._feelRunning) { window._feelRunning = true; animFeel(); }

    // Lube guide reveal
    const lg = $('.lube-guide');
    if (lg) {
      const io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { lg.classList.add('revealed'); io.disconnect(); }
      }, { threshold: .1 });
      io.observe(lg);
    }
  }

})();
