(() => {
  const W = 600, H = 1940, PW = 520, PH = 390, PAD = 40, GAP = 24;
  const TITLE = 'TNCCOC Youth Gather', DATE = 'Nov. 29, 2026';

  const BORDERS = [
    { id:'sunshine', name:'Sunshine', bg:['#fff3b0','#ffd36b'], text:'#6b4300', emoji:['☀️','🌻','✨'] },
    { id:'blush',    name:'Blush Hearts', bg:['#ffe0ea','#ffb3c8'], text:'#9c2c58', emoji:['💖','🌸','💗'] },
    { id:'sky',      name:'Sky & Clouds', bg:['#d6f0ff','#8ecbff'], text:'#1d4e7a', emoji:['☁️','🕊️','⭐'] },
    { id:'garden',   name:'Grace Garden', bg:['#e3f8d9','#a8e6b8'], text:'#2d6a4f', emoji:['🌿','🌷','🦋'] },
    { id:'lavender', name:'Lavender Dream', bg:['#efe3ff','#c9b2ff'], text:'#4b2c86', emoji:['💜','🦄','✨'] },
    { id:'night',    name:'Starry Night', bg:['#2e2a5e','#5b4a9c'], text:'#ffe9a8', emoji:['⭐','🌙','✝️'] },
  ];
  const FILTERS = [
    { id:'none', name:'Natural', css:'none' },
    { id:'warm', name:'Sunny', css:'saturate(1.25) sepia(.2) brightness(1.06)' },
    { id:'soft', name:'Dreamy', css:'contrast(.92) brightness(1.12) saturate(1.1)' },
    { id:'bw',   name:'B&W', css:'grayscale(1) contrast(1.1)' },
  ];

  const $ = id => document.getElementById(id);
  const video = $('video'), strip = $('strip'), ctx = strip.getContext('2d');
  const photos = [null, null, null, null];   // raw (unfiltered, mirrored) canvases
  let border = BORDERS[0], filter = FILTERS[0], stream = null, busy = false;

  /* ---------- UI setup ---------- */
  const thumbs = $('thumbs');
  photos.forEach((_, i) => {
    const b = document.createElement('button');
    b.className = 'thumb'; b.textContent = i + 1; b.setAttribute('aria-label', 'Retake photo ' + (i + 1));
    b.onclick = () => retake(i);
    thumbs.appendChild(b);
  });
  FILTERS.forEach(f => {
    const b = document.createElement('button');
    b.className = 'chip'; b.textContent = f.name; b.setAttribute('aria-pressed', f === filter);
    b.onclick = () => { filter = f; [...$('filters').children].forEach(c => c.setAttribute('aria-pressed', c === b)); render(); };
    $('filters').appendChild(b);
  });
  BORDERS.forEach(bd => {
    const b = document.createElement('button');
    b.className = 'bchip'; b.setAttribute('aria-pressed', bd === border);
    b.innerHTML = `<span class="sw" style="background:linear-gradient(135deg,${bd.bg[0]},${bd.bg[1]})">${bd.emoji[0]}</span>${bd.name}`;
    b.onclick = () => { border = bd; [...$('borders').children].forEach(c => c.setAttribute('aria-pressed', c === b)); render(); };
    $('borders').appendChild(b);
  });

  /* ---------- Camera ---------- */
  $('camBtn').onclick = async () => {
    if (stream) return;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'user', width:{ideal:1280}, height:{ideal:960} }, audio:false });
      video.srcObject = stream;
      document.querySelector('.viewfinder').classList.add('live');
      $('snapBtn').disabled = false; $('resetBtn').disabled = false;
      $('camBtn').textContent = 'Camera on ✓'; $('camBtn').disabled = true;
    } catch (e) {
      $('camMsg').textContent = 'We couldn’t open your camera. Allow camera access in your browser, then try again.';
    }
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function countdown(n = 3) {
    const el = $('countdown');
    for (let i = n; i > 0; i--) {
      el.textContent = i; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      await sleep(1000);
    }
    el.textContent = '';
  }

  function capture() {
    const c = document.createElement('canvas'); c.width = PW; c.height = PH;
    const g = c.getContext('2d');
    const vw = video.videoWidth, vh = video.videoHeight, target = PW / PH;
    let sw = vw, sh = vw / target;
    if (sh > vh) { sh = vh; sw = vh * target; }
    g.translate(PW, 0); g.scale(-1, 1);                       // mirror like a real selfie
    g.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, PW, PH);
    const f = $('flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
    return c;
  }

  async function shoot(indexes) {
    if (busy || !stream) return;
    busy = true; setButtons();
    for (const i of indexes) {
      await countdown(3);
      photos[i] = capture();
      updateThumbs(); render();
      await sleep(700);
    }
    busy = false; setButtons();
  }
  $('snapBtn').onclick = () => { photos.fill(null); shoot([0, 1, 2, 3]); };
  const retake = i => { if (photos[i] !== undefined && stream) shoot([i]); };
  $('resetBtn').onclick = () => { if (busy) return; photos.fill(null); updateThumbs(); render(); setButtons(); };

  function setButtons() {
    $('snapBtn').disabled = busy || !stream;
    $('resetBtn').disabled = busy || !stream;
    $('dlBtn').disabled = busy || photos.some(p => !p);
  }
  function updateThumbs() {
    [...thumbs.children].forEach((b, i) => {
      const p = photos[i];
      b.classList.toggle('filled', !!p);
      b.style.backgroundImage = p ? `url(${p.toDataURL('image/jpeg', .6)})` : '';
    });
    setButtons();
  }

  /* ---------- Strip rendering ---------- */
  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function emojiAt(txt, x, y, size) {
    ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.fillText(txt, x, y);
  }

  /* ---- themed backgrounds ---- */
  function rng(seed){ return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
  function cloud(x, y, s) {
    ctx.beginPath();
    [[0,0,34],[38,-14,42],[84,0,34],[42,10,38]].forEach(([dx,dy,r]) => { ctx.moveTo(x+dx*s+r*s, y+dy*s); ctx.arc(x+dx*s, y+dy*s, r*s, 0, 7); });
    ctx.fill();
  }
  function star(x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, d = i % 2 ? r * .35 : r; ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); }
    ctx.closePath(); ctx.fill();
  }
  const PATTERNS = {
    sunshine() {                                   // sunburst + daisies
      ctx.fillStyle = 'rgba(255,255,255,.3)';
      for (let i = 0; i < 28; i += 2) {
        ctx.beginPath(); ctx.moveTo(W / 2, H * .38);
        ctx.arc(W / 2, H * .38, 2400, i * Math.PI / 14, (i + 1) * Math.PI / 14); ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      for (let y = 80; y < H; y += 160) for (let x = (y / 160) % 2 ? 100 : 500; x < W; x += 400) {
        for (let p = 0; p < 8; p++) { ctx.beginPath(); ctx.ellipse(x + Math.cos(p * .785) * 14, y + Math.sin(p * .785) * 14, 8, 5, p * .785, 0, 7); ctx.fill(); }
      }
    },
    blush() {                                      // big hearts + gingham hint
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let y = 50, r = 0; y < H; y += 95, r++) for (let x = r % 2 ? 40 : 95; x < W + 40; x += 110) {
        ctx.font = (r % 3 ? 44 : 62) + 'px sans-serif'; ctx.fillText('♥', x, y);
      }
    },
    sky() {                                        // fluffy clouds + stars
      const r = rng(7);
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      for (let i = 0; i < 16; i++) cloud(r() * 520, 40 + i * 118 + r() * 30, .5 + r() * .5);
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      for (let i = 0; i < 24; i++) star(r() * W, r() * H, 5 + r() * 6);
    },
    garden() {                                     // gingham picnic + leaves
      ctx.fillStyle = 'rgba(255,255,255,.28)';
      for (let i = 0; i < W; i += 60) ctx.fillRect(i, 0, 30, H);
      for (let i = 0; i < H; i += 60) ctx.fillRect(0, i, W, 30);
    },
    lavender() {                                   // scallops + sparkles
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 5;
      for (let y = 0, r = 0; y < H + 40; y += 36, r++) for (let x = r % 2 ? 0 : 40; x < W + 80; x += 80) {
        ctx.beginPath(); ctx.arc(x, y, 40, 0, Math.PI); ctx.stroke();
      }
      const q = rng(11); ctx.fillStyle = 'rgba(255,255,255,.9)';
      for (let i = 0; i < 26; i++) star(q() * W, q() * H, 6 + q() * 6);
    },
    night() {                                      // glowing starfield
      const r = rng(23);
      for (let i = 0; i < 120; i++) {
        const x = r() * W, y = r() * H, s = r();
        ctx.fillStyle = `rgba(255,244,200,${.35 + s * .6})`;
        if (s > .86) { ctx.shadowColor = '#ffe9a8'; ctx.shadowBlur = 14; star(x, y, 8 + s * 8); ctx.shadowBlur = 0; }
        else { ctx.beginPath(); ctx.arc(x, y, .8 + s * 2, 0, 7); ctx.fill(); }
      }
    },
  };

  function render() {
    const b = border, E = b.emoji;
    const g = ctx.createLinearGradient(0, 0, W * .6, H);
    g.addColorStop(0, b.bg[0]); g.addColorStop(1, b.bg[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    PATTERNS[b.id]();

    // soft vignette so photos pop
    const v = ctx.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .75);
    v.addColorStop(0, 'rgba(255,255,255,0)'); v.addColorStop(1, b.id === 'night' ? 'rgba(0,0,20,.35)' : 'rgba(255,255,255,.3)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);

    // double scalloped-style frame
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 10; roundRect(ctx, 6, 6, W - 12, H - 12, 30); ctx.stroke();
    ctx.strokeStyle = b.text; ctx.lineWidth = 2.5; ctx.setLineDash([10, 9]); roundRect(ctx, 16, 16, W - 32, H - 32, 22); ctx.stroke();
    ctx.setLineDash([]);

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // side emoji stickers
    for (let y = 70, k = 0; y < H - 230; y += 100, k++) {
      emojiAt(E[k % 3], 24, y, 24); emojiAt(E[(k + 1) % 3], W - 24, y, 24);
    }
    // emoji rows between photos
    const rows = [PAD / 2 + 2];
    for (let i = 0; i < 3; i++) rows.push(PAD + (i + 1) * PH + i * GAP + GAP / 2 + 2);
    rows.forEach((y, r) => { for (let x = 80, k = r; x < W - 50; x += 64, k++) emojiAt(E[k % 3], x, y, 16); });

    // photos
    for (let i = 0; i < 4; i++) {
      const x = (W - PW) / 2, y = PAD + i * (PH + GAP);
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
      ctx.fillStyle = '#fff'; roundRect(ctx, x - 8, y - 8, PW + 16, PH + 16, 14); ctx.fill();
      ctx.restore();
      ctx.save(); roundRect(ctx, x, y, PW, PH, 8); ctx.clip();
      if (photos[i]) {
        if ('filter' in ctx) ctx.filter = filter.css;
        ctx.drawImage(photos[i], x, y);
        ctx.filter = 'none';
      } else {
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(x, y, PW, PH);
        ctx.fillStyle = b.text; ctx.globalAlpha = .5;
        ctx.font = '800 80px "Baloo 2",sans-serif'; ctx.fillText(i + 1, W / 2, y + PH / 2 + 4);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    // footer banner
    const fy = PAD + 4 * PH + 3 * GAP;           // 1672
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.2)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
    ctx.fillStyle = 'rgba(255,255,255,.88)'; roundRect(ctx, 50, fy + 44, W - 100, 160, 28); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = b.text; ctx.lineWidth = 3; ctx.setLineDash([8, 7]);
    roundRect(ctx, 58, fy + 52, W - 116, 144, 22); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = b.text;
    ctx.font = '800 64px "Baloo 2","Trebuchet MS",sans-serif';
    ctx.fillText('TNCCOC YG', W / 2, fy + 100);
    ctx.font = '700 36px "Baloo 2","Trebuchet MS",sans-serif';
    ctx.fillText(DATE, W / 2, fy + 160);
    emojiAt(E[0], 100, fy + 128, 30); emojiAt(E[1], W - 100, fy + 128, 30);
    for (let x = 100, k = 0; x < W - 80; x += 68, k++) emojiAt(E[k % 3], x, H - 30, 22);
  }

  /* ---------- Download ---------- */
  $('dlBtn').onclick = () => {
    render();
    strip.toBlob(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'TNCCOC-Youth-Gather-2026-11-29-photostrip.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    }, 'image/png');
  };

  render();
  if (document.fonts) document.fonts.ready.then(render);
})();
