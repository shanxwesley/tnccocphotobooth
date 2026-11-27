(() => {
  const W = 600, H = 1900, PW = 520, PH = 390, PAD = 40, GAP = 24;
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

  function render() {
    const b = border, E = b.emoji;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, b.bg[0]); g.addColorStop(1, b.bg[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // polka dots
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    for (let y = 30; y < H; y += 70) for (let x = (y / 70) % 2 ? 30 : 65; x < W; x += 70) {
      ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
    }

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // side emoji columns
    for (let y = 60, k = 0; y < H - 220; y += 100, k++) {
      emojiAt(E[k % 3], 20, y, 26); emojiAt(E[(k + 1) % 3], W - 20, y, 26);
    }
    // top row + gaps between photos
    const rows = [PAD / 2 - 2];
    for (let i = 0; i < 3; i++) rows.push(PAD + (i + 1) * PH + i * GAP + GAP / 2 + 2);
    rows.forEach((y, r) => { for (let x = 70, k = r; x < W - 40; x += 62, k++) emojiAt(E[k % 3], x, y, r ? 18 : 20); });

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

    // footer
    const fy = PAD + 4 * PH + 3 * GAP;           // 1672
    ctx.fillStyle = b.text;
    ctx.font = '800 54px "Baloo 2","Trebuchet MS",sans-serif';
    ctx.fillText('✝ TNCCOC ✝', W / 2, fy + 62);
    ctx.font = '400 38px Pacifico,cursive';
    ctx.fillText('Youth Gather', W / 2, fy + 118);
    ctx.font = '700 30px "Baloo 2",sans-serif';
    ctx.fillText(DATE, W / 2, fy + 163);
    for (let x = 90, k = 0; x < W - 60; x += 70, k++) emojiAt(E[k % 3], x, H - 22, 22);
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
