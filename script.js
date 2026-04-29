(() => {
  'use strict';

  /* ──────────────────────────────────────────
     THEMES
  ────────────────────────────────────────── */
  const THEMES = {
    gold:   { bg: '#1a1208', bg2: '#241a09', accent: '#c9a84c', accent2: '#e8c96a', text: '#fdf6e3', text2: 'rgba(253,246,227,0.55)', stamp: 'rgba(201,168,76,0.15)' },
    night:  { bg: '#0d1117', bg2: '#161b22', accent: '#58a6ff', accent2: '#79b8ff', text: '#e6edf3', text2: 'rgba(230,237,243,0.5)',  stamp: 'rgba(88,166,255,0.12)' },
    forest: { bg: '#1a2e1a', bg2: '#223322', accent: '#6dbf67', accent2: '#9dda98', text: '#eaf5e8', text2: 'rgba(234,245,232,0.5)',  stamp: 'rgba(109,191,103,0.12)' },
    rose:   { bg: '#1f0a12', bg2: '#2a0f1a', accent: '#e879a0', accent2: '#f0a0c0', text: '#fce8ef', text2: 'rgba(252,232,239,0.5)',  stamp: 'rgba(232,121,160,0.12)' },
    slate:  { bg: '#f8f7f4', bg2: '#eeecea', accent: '#3d3d3a', accent2: '#5a5856', text: '#1a1a18', text2: 'rgba(26,26,24,0.5)',     stamp: 'rgba(61,61,58,0.1)'   },
    ocean:  { bg: '#0a1628', bg2: '#0f2040', accent: '#38bdf8', accent2: '#7dd3fc', text: '#e0f2fe', text2: 'rgba(224,242,254,0.5)',  stamp: 'rgba(56,189,248,0.12)' },
    custom: null,
  };

  let currentTheme = 'gold';
  let currentProgram = 'tampons';
  let currentStyle = 'modern';
  let logoImage = null;

  const STAMP_ICONS = {
    tampons: '✦',
    points:  '●',
    etoiles: '★',
  };

  const CARD_W = 720;
  const CARD_H = 420;

  /** Libellés FR pour la ligne de progression */
  function programLabelFr(program) {
    const map = { tampons: 'tampons', points: 'points', etoiles: 'étoiles' };
    return map[program] || program;
  }

  function bitmapScale() {
    const dpr = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
    return Math.min(3, Math.max(2, dpr));
  }

  /* ──────────────────────────────────────────
     DOM REFS
  ────────────────────────────────────────── */
  const $ = id => document.getElementById(id);
  const canvas = $('cardCanvas');
  const ctx    = canvas.getContext('2d');

  const inputs = {
    shopName:      $('shopName'),
    tagline:       $('tagline'),
    cardHolder:    $('cardHolder'),
    totalStamps:   $('totalStamps'),
    currentStamps: $('currentStamps'),
    rewardText:    $('rewardText'),
    expiryDate:    $('expiryDate'),
    colBg:         $('colBg'),
    colAccent:     $('colAccent'),
    colText:       $('colText'),
    colStamp:      $('colStamp'),
    pushTitle:     $('pushTitle'),
    pushBody:      $('pushBody'),
    qrMerchant:    $('qrMerchant'),
    qrClient:      $('qrClient'),
  };

  /* ──────────────────────────────────────────
     STATE HELPERS
  ────────────────────────────────────────── */
  function getTheme() {
    if (currentTheme === 'custom') {
      return {
        bg:      inputs.colBg.value,
        bg2:     inputs.colBg.value,
        accent:  inputs.colAccent.value,
        accent2: inputs.colAccent.value,
        text:    inputs.colText.value,
        text2:   inputs.colText.value + '80',
        stamp:   inputs.colStamp.value + '40',
      };
    }
    return THEMES[currentTheme];
  }

  function getState() {
    const total   = Math.max(4, Math.min(20, parseInt(inputs.totalStamps.value) || 10));
    const current = Math.max(0, Math.min(total, parseInt(inputs.currentStamps.value) || 0));
    return {
      shopName:   inputs.shopName.value || 'Mon Commerce',
      tagline:    inputs.tagline.value  || '',
      cardHolder: inputs.cardHolder.value || 'Client',
      total,
      current,
      rewardText: inputs.rewardText.value || 'Récompense',
      expiry:     inputs.expiryDate.value,
      theme:      getTheme(),
      program:    currentProgram,
      style:      currentStyle,
    };
  }

  function slugify(str) {
    const raw = String(str || 'x')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 36);
    return raw || 'id';
  }

  /** Même logique que Loyalty Pro au scan : merchantId:clientId:points */
  function getQrPayload(s) {
    const merchant = inputs.qrMerchant?.value?.trim() || slugify(s.shopName);
    const client = inputs.qrClient?.value?.trim() || slugify(s.cardHolder);
    return `${merchant}:${client}:${s.current}`;
  }

  /* ──────────────────────────────────────────
     CANVAS DRAWING
  ────────────────────────────────────────── */
  async function draw() {
    const s = getState();
    const t = s.theme;
    const W = CARD_W;
    const H = CARD_H;
    const scale = bitmapScale();
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    /* Background — dégradé premium */
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, t.bg);
    bgGrad.addColorStop(0.55, t.bg2 || t.bg);
    bgGrad.addColorStop(1, t.bg);
    ctx.fillStyle = bgGrad;
    roundRect(ctx, 0, 0, W, H, 22);
    ctx.fill();

    /* Contour carte fin */
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 22);
    ctx.stroke();

    /* Style-specific decorations */
    drawDecorations(s, W, H);

    /* Header area */
    drawHeader(s, W, H, t);

    /* Progress bar */
    drawProgress(s, W, H, t);

    /* Stamps row */
    drawStamps(s, W, H, t);

    /* Footer text + ligne (zone QR réservée à droite) */
    drawFooter(s, W, H, t);

    await drawQrOnCard(s, W, H, t);

    /* Update stamps grid UI */
    buildStampsGrid(s);
  }

  /** Depuis npm qrcode/+esm (voir index.html), ou null si inchargé */
  async function qrToDataUrl(payload, opts) {
    let QR = typeof QRCode !== 'undefined' ? QRCode : window.__QRCodeBrowser;
    if ((!QR || typeof QR.toDataURL !== 'function') && window.__QRCodeBrowser) {
      QR = window.__QRCodeBrowser;
    }
    if (QR?.toDataURL) {
      return await new Promise((resolve, reject) => {
        QR.toDataURL(payload, opts || {}, (err, url) => (err ? reject(err) : resolve(url)));
      });
    }
    /* Pas de lib locale (file:// sans réseau, etc.) — image PNG via API publique */
    const w = opts?.width || 240;
    return (
      'https://api.qrserver.com/v1/create-qr-code/?size=' +
      encodeURIComponent(Math.min(300, Math.max(w, 120))) +
      'x' +
      encodeURIComponent(Math.min(300, Math.max(w, 120))) +
      '&margin=4&data=' +
      encodeURIComponent(payload)
    );
  }

  async function drawQrOnCard(s, W, H, t) {
    const QR_SIZE = 76;
    const FOOTER_Y = H - 38;
    const SEP_Y = FOOTER_Y - 18;
    const qrX = W - 36 - QR_SIZE;
    const qrY = SEP_Y - 8 - QR_SIZE;
    const payload = getQrPayload(s);

    ctx.fillStyle = '#ffffff';
    roundRect(ctx, qrX - 5, qrY - 5, QR_SIZE + 10, QR_SIZE + 10, 8);
    ctx.fill();

    ctx.strokeStyle = t.accent;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.35;
    roundRect(ctx, qrX - 5, qrY - 5, QR_SIZE + 10, QR_SIZE + 10, 8);
    ctx.stroke();
    ctx.globalAlpha = 1;

    try {
      const raw = await qrToDataUrl(payload, {
        width: 240,
        margin: 1,
        color: { dark: '#141414', light: '#ffffff' }
      });
      const img = new Image();
      if (!String(raw).startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = raw;
      });
      ctx.drawImage(img, qrX, qrY, QR_SIZE, QR_SIZE);
    } catch {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.font = `600 11px 'Plus Jakarta Sans', system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('QR', qrX + QR_SIZE / 2, qrY + QR_SIZE / 2 - 6);
      ctx.font = `400 9px 'Plus Jakarta Sans', system-ui, sans-serif`;
      ctx.fillText('indispo', qrX + QR_SIZE / 2, qrY + QR_SIZE / 2 + 8);
    }

    ctx.fillStyle = t.text2;
    ctx.font = `400 9px 'Plus Jakarta Sans', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Lecture terminal', qrX + QR_SIZE / 2, qrY + QR_SIZE + 6);
  }

  function drawDecorations(s, W, H) {
    const t = s.theme;
    if (s.style === 'modern') {
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = t.accent;
      ctx.beginPath();
      ctx.arc(W - 60, -60, 180, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(60, H + 40, 140, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.strokeStyle = t.accent;
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.arc(W - 60, -60, 180, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (s.style === 'bold') {
      ctx.fillStyle = t.accent;
      ctx.globalAlpha = 0.1;
      ctx.fillRect(0, 0, W, H / 2.5);
      ctx.globalAlpha = 1;

      ctx.strokeStyle = t.accent;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(0, H / 2.5);
      ctx.lineTo(W, H / 2.5);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      // minimal: subtle grid lines
      ctx.strokeStyle = t.accent;
      ctx.lineWidth = 0.3;
      ctx.globalAlpha = 0.07;
      for (let x = 40; x < W; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawHeader(s, W, H, t) {
    const logoSize = 48;
    const logoX = 36, logoY = 28;

    /* Logo circle */
    if (logoImage) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
      ctx.restore();
    } else {
      ctx.fillStyle = t.accent;
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = t.accent;
      ctx.font = `bold ${logoSize * 0.45}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.shopName.charAt(0).toUpperCase(), logoX + logoSize / 2, logoY + logoSize / 2);
    }

    /* Border on logo */
    ctx.strokeStyle = t.accent;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    /* Shop name */
    ctx.fillStyle = t.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    const nameSize = s.style === 'bold' ? 28 : 24;
    ctx.font = `600 ${nameSize}px 'Cormorant Garamond', Georgia, serif`;
    ctx.fillText(truncate(s.shopName, 26), logoX + logoSize + 14, logoY + nameSize);

    /* Tagline */
    if (s.tagline) {
      ctx.fillStyle = t.text2;
      ctx.font = `400 13px 'Plus Jakarta Sans', system-ui, sans-serif`;
      ctx.fillText(truncate(s.tagline, 38), logoX + logoSize + 14, logoY + nameSize + 18);
    }

    /* Badge programme */
    const badge = 'FIDÉLITÉ · ' + STAMP_ICONS[s.program];
    ctx.font = `600 9px 'Plus Jakarta Sans', system-ui, sans-serif`;
    const bw = ctx.measureText(badge).width + 22;
    const bx = W - bw - 28, by = 26;

    ctx.fillStyle = t.accent;
    ctx.globalAlpha = 0.12;
    roundRect(ctx, bx, by, bw, 26, 13);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = t.accent;
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.4;
    roundRect(ctx, bx, by, bw, 26, 13);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = t.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge, bx + bw / 2, by + 13);
  }

  function drawProgress(s, W, H, t) {
    const y = 106;

    /* Points label */
    ctx.fillStyle = t.text2;
    ctx.font = `500 11px 'Plus Jakarta Sans', system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${s.current} / ${s.total} ${programLabelFr(s.program)}`, 36, y);

    /* Percentage */
    const pct = Math.round((s.current / s.total) * 100);
    ctx.fillStyle = t.accent;
    ctx.font = `600 11px 'Plus Jakarta Sans', system-ui, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(`${pct}%`, W - 36, y);

    /* Track */
    const barX = 36, barY = y + 10, barW = W - 72, barH = 6;
    ctx.fillStyle = t.stamp;
    roundRect(ctx, barX, barY, barW, barH, 3);
    ctx.fill();

    /* Fill — léger dégradé */
    if (s.current > 0) {
      const fillW = Math.max(6, (s.current / s.total) * barW);
      const fillGrad = ctx.createLinearGradient(barX, barY, barX + fillW, barY);
      fillGrad.addColorStop(0, t.accent2 || t.accent);
      fillGrad.addColorStop(1, t.accent);
      ctx.fillStyle = fillGrad;
      roundRect(ctx, barX, barY, fillW, barH, 3);
      ctx.fill();
    }
  }

  function drawStamps(s, W, H, t) {
    const cols = Math.min(s.total, 10);
    const rows = Math.ceil(s.total / cols);
    const size = 32;
    const gap  = 10;
    const totalW = cols * size + (cols - 1) * gap;
    const startX = (W - totalW) / 2;
    const startY = 138;

    const icon = STAMP_ICONS[s.program];

    for (let i = 0; i < s.total; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (size + gap);
      const y = startY + row * (size + gap);
      const filled = i < s.current;

      if (filled) {
        ctx.fillStyle = t.accent;
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = t.stamp;
        ctx.globalAlpha = 1;
      }

      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();

      if (!filled) {
        ctx.strokeStyle = t.accent;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.22;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2 - 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = filled ? t.bg : t.accent;
      ctx.globalAlpha = filled ? 0.92 : 0.28;
      ctx.font = `${size * 0.44}px Georgia, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, x + size / 2, y + size / 2);
      ctx.globalAlpha = 1;
    }
  }

  function drawFooter(s, W, H, t) {
    const y = H - 38;
    const qrReserve = 100;

    /* Separator (s’arrête avant la zone QR à droite) */
    const sepY = y - 18;
    ctx.strokeStyle = t.accent;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.moveTo(36, sepY);
    ctx.lineTo(W - 36 - qrReserve, sepY);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.fillStyle = t.text2;
    ctx.font = `600 10px 'Plus Jakarta Sans', system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(truncate(s.cardHolder.toUpperCase(), 26), 36, y - 6);

    let expLabel = 'Démonstration';
    if (s.expiry) {
      const d = new Date(s.expiry);
      expLabel = 'Valable jusqu’au ' + d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    ctx.font = `400 10px 'Plus Jakarta Sans', system-ui, sans-serif`;
    ctx.fillText(expLabel, 36, y + 10);

    ctx.fillStyle = t.accent;
    ctx.font = `600 10px 'Plus Jakarta Sans', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(truncate(s.rewardText, 28), W / 2, y + 2);
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  function truncate(str, max) {
    return str.length > max ? str.slice(0, max - 1) + '…' : str;
  }

  /* ──────────────────────────────────────────
     STAMPS GRID (interactive)
  ────────────────────────────────────────── */
  function buildStampsGrid(s) {
    const grid  = $('stampsGrid');
    const count = $('stampsCount');
    const alert = $('rewardAlert');
    const icon  = STAMP_ICONS[s.program];

    count.textContent = `${s.current} / ${s.total}`;
    grid.innerHTML = '';

    for (let i = 0; i < s.total; i++) {
      const cell = document.createElement('div');
      cell.className = 'stamp-cell' + (i < s.current ? ' filled' : '');
      cell.textContent = icon;
      cell.title = i < s.current ? 'Cliquer pour retirer' : 'Cliquer pour valider';

      cell.addEventListener('click', () => {
        const cur = parseInt(inputs.currentStamps.value) || 0;
        const tot = parseInt(inputs.totalStamps.value)   || 10;
        if (i < cur) {
          inputs.currentStamps.value = i;
        } else {
          inputs.currentStamps.value = Math.min(i + 1, tot);
          cell.classList.add('pop');
          setTimeout(() => cell.classList.remove('pop'), 450);
        }
        draw();
      });

      grid.appendChild(cell);
    }

    if (s.current >= s.total) {
      $('rewardAlertText').textContent = `Récompense atteinte : ${s.rewardText}`;
      alert.style.display = 'flex';
    } else {
      alert.style.display = 'none';
    }
  }

  /* ──────────────────────────────────────────
     THEME SWITCHER
  ────────────────────────────────────────── */
  $('themeGrid').addEventListener('click', e => {
    const btn = e.target.closest('.theme-swatch');
    if (!btn) return;
    document.querySelectorAll('.theme-swatch').forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    currentTheme = btn.dataset.theme;
    $('customColorFields').style.display = currentTheme === 'custom' ? 'block' : 'none';
    draw();
  });

  /* ──────────────────────────────────────────
     TOGGLE GROUPS
  ────────────────────────────────────────── */
  function bindToggleGroup(groupId, onChange) {
    const group = $(`${groupId}`);
    group.addEventListener('click', e => {
      const btn = e.target.closest('.toggle-btn');
      if (!btn) return;
      group.querySelectorAll('.toggle-btn').forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      onChange(btn.dataset.value);
    });
  }

  bindToggleGroup('programType', v => { currentProgram = v; draw(); });
  bindToggleGroup('cardStyle',   v => { currentStyle   = v; draw(); });

  /* ──────────────────────────────────────────
     INPUT LISTENERS
  ────────────────────────────────────────── */
  Object.values(inputs).forEach(el => {
    if (!el) return;
    const evt = ['textarea'].includes(el.tagName.toLowerCase()) ? 'input' : 'input';
    el.addEventListener(evt, draw);
  });

  /* Sync currentStamps max with totalStamps */
  inputs.totalStamps.addEventListener('input', () => {
    const tot = parseInt(inputs.totalStamps.value) || 10;
    const cur = parseInt(inputs.currentStamps.value) || 0;
    if (cur > tot) inputs.currentStamps.value = tot;
    draw();
  });

  /* ──────────────────────────────────────────
     LOGO UPLOAD
  ────────────────────────────────────────── */
  $('logoUpload').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => { logoImage = img; $('uploadLabel').textContent = file.name; draw(); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  /* ──────────────────────────────────────────
     EXPORT PNG
  ────────────────────────────────────────── */
  $('btnExport').addEventListener('click', async () => {
    await draw();
    const name = (inputs.shopName.value || 'carte').toLowerCase().replace(/\s+/g, '-');
    const link = document.createElement('a');
    link.download = `carte-fidelite-${name}.png`;
    link.href = canvas.toDataURL('image/png', 1);
    link.click();
    toast('Export PNG enregistré.');
  });

  /* ──────────────────────────────────────────
     COPY COLORS
  ────────────────────────────────────────── */
  $('btnCopyCSS').addEventListener('click', () => {
    const t = getTheme();
    const css = `/* Palette ${currentTheme} */\n--card-bg: ${t.bg};\n--card-accent: ${t.accent};\n--card-text: ${t.text};`;
    navigator.clipboard.writeText(css).then(() => toast('Variables CSS copiées.')).catch(() => toast('Copie impossible.'));
  });

  /* ──────────────────────────────────────────
     PUSH PREVIEW
  ────────────────────────────────────────── */
  $('btnSendPush').addEventListener('click', () => {
    const preview = $('pushPreview');
    $('pvTitle').textContent  = inputs.pushTitle.value;
    $('pvBody').textContent   = inputs.pushBody.value;
    $('pvAppName').textContent = inputs.shopName.value || 'FidélioGen';

    preview.style.display = 'flex';

    /* Reset animation */
    const notif = $('pushNotif');
    notif.style.animation = 'none';
    notif.offsetHeight;
    notif.style.animation = '';

    toast('Maquette affichée.');
  });

  /* Auto-update push body with current points */
  function updatePushSuggestion() {
    const s = getState();
    const remaining = s.total - s.current;
    if (remaining > 0) {
      inputs.pushBody.value = `Vous avez cumulé ${s.current} ${programLabelFr(s.program)}. Plus que ${remaining} pour obtenir votre récompense.`;
    } else {
      inputs.pushBody.value = `Félicitations ! Votre récompense "${s.rewardText}" est disponible.`;
    }
  }

  inputs.currentStamps.addEventListener('input', updatePushSuggestion);
  inputs.totalStamps.addEventListener('input', updatePushSuggestion);
  inputs.rewardText.addEventListener('input', updatePushSuggestion);
  inputs.shopName.addEventListener('input', () => {
    $('pvAppName').textContent = inputs.shopName.value || 'FidélioGen';
  });

  /* ──────────────────────────────────────────
     TOAST
  ────────────────────────────────────────── */
  let toastTimer;
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  /* ──────────────────────────────────────────
     DEEPLINK PARAMS (Loyalty Pro -> FidelioGen)
     - token -> affiche le lien carte client
     - qrMerchant/qrClient -> pré-remplit le QR caisse
     - design basics (theme/style + colors + texte)
  ────────────────────────────────────────── */
  const params = new URLSearchParams(window.location.search);
  const urlToken = (params.get("token") || "").trim();

  const setValue = (inputEl, value) => {
    if (!inputEl) return;
    if (value === undefined || value === null) return;
    const s = String(value);
    if (!s.trim()) return;
    inputEl.value = s;
  };

  const setToggleActive = (groupId, value) => {
    const group = $(groupId);
    if (!group) return;
    group.querySelectorAll(".toggle-btn").forEach((b) => {
      const isActive = String(b.dataset.value) === String(value);
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  };

  const setThemeActive = (theme) => {
    if (!theme) return;
    document.querySelectorAll(".theme-swatch").forEach((b) => {
      const isActive = b.dataset.theme === theme;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
    currentTheme = theme;
    $('customColorFields').style.display = currentTheme === 'custom' ? 'block' : 'none';
  };

  // Prefill: commerce/client identity + card content
  setValue(inputs.shopName, params.get("shopName"));
  setValue(inputs.tagline, params.get("tagline"));
  setValue(inputs.cardHolder, params.get("cardHolder"));

  // QR compatibility with Loyalty Pro scan: merchant:client:any
  setValue(inputs.qrMerchant, params.get("qrMerchant"));
  setValue(inputs.qrClient, params.get("qrClient"));

  setValue(inputs.totalStamps, params.get("totalStamps"));
  setValue(inputs.currentStamps, params.get("currentStamps"));
  setValue(inputs.rewardText, params.get("rewardText"));
  setValue(inputs.expiryDate, params.get("expiryDate"));

  // Program + style toggles
  const program = (params.get("program") || "").trim();
  if (program) {
    currentProgram = program;
    setToggleActive("programType", program);
  }

  const cardStyleParam = (params.get("cardStyle") || "").trim();
  if (cardStyleParam) {
    currentStyle = cardStyleParam;
    setToggleActive("cardStyle", cardStyleParam);
  }

  // Theme palette
  const themeParam = (params.get("theme") || "").trim();
  if (themeParam) {
    setThemeActive(themeParam);
  }

  // If custom theme: set custom color inputs (FidelioGen expects hex values for custom palette)
  if (currentTheme === "custom") {
    setValue(inputs.colBg, params.get("colBg"));
    setValue(inputs.colAccent, params.get("colAccent"));
    setValue(inputs.colText, params.get("colText"));
    setValue(inputs.colStamp, params.get("colStamp"));
  }

  // Public card link for the client (computed from token)
  if (urlToken) {
    const origin = window.location.origin;
    const publicCardLink = `${origin}/card?token=${encodeURIComponent(urlToken)}`;

    const section = $("loyaltyLinkSection");
    const input = $("publicCardLinkInput");
    const btnCopy = $("btnCopyPublicCardLink");
    const btnOpen = $("btnOpenPublicCardLink");

    if (section) section.style.display = "block";
    if (input) input.value = publicCardLink;

    if (btnCopy && input) {
      btnCopy.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(publicCardLink);
          toast("Lien carte copié.");
        } catch {
          toast("Copie impossible. Sélectionne le lien manuellement.");
          input.focus();
          input.select();
        }
      });
    }

    if (btnOpen) {
      btnOpen.addEventListener("click", () => {
        window.open(publicCardLink, "_blank", "noopener,noreferrer");
      });
    }
  }

  /* ──────────────────────────────────────────
     INIT
  ────────────────────────────────────────── */
  const today = new Date();
  const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
  inputs.expiryDate.value = nextYear.toISOString().split('T')[0];

  canvas.style.width = `${CARD_W}px`;
  canvas.style.maxWidth = '100%';
  canvas.style.height = 'auto';

  draw().catch((err) => console.error(err));

})();
