// ═══════════════ CZERNODE: CORE BREACH — DUAL MODE ═══════════════
(function () {
  const canvas = document.getElementById('gc');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const GND = H - 75;

  const pImg = new Image(); pImg.src = 'czernode.png';

  // ── Global state ──
  let gameMode = 'endless'; // 'endless' | 'story'
  let state = 'title'; // title | playing | gameover | transition | win
  let isPaused = false;
  let soundOn = false;
  let shake = 0;
  let actx = null;
  let controlsOn = true;
  const keys = { Left: false, Right: false, Up: false, Down: false, Jump: false };

  // ── Endless state ──
  let score = 0, hiScore = +(localStorage.getItem('czHi') || 0), health = 3, maxHealth = 3;
  let maxUnlockedLevel = +(localStorage.getItem('czLevel') || 0);
  let checkpoints = 0, lastCpScore = 0;
  let frame = 0, spawnRate = 180, spawnT = 0, combo = 0, comboTimer = 0, comboMult = 1;
  let powerups = [], shields = 0;
  let totalDamageTaken = 0;
  let enemies = [], bullets = [], particles = [];

  // ── Story state ──
  let curLevel = 0, camX = 0, collectibles = [], platforms = [], ladders = [], boss = null;
  let storyMsg = '', storyMsgTimer = 0, transTimer = 0, levelHP = 3;

  const LEVELS = [
    {
      name: 'THE SYNTAX DUNGEON', subtitle: 'Level 1 — Collect 3 Source Keys',
      story: 'Before you can build, you must survive the syntax.',
      goal: 4400, worldW: 4600,
      bg: (f) => drawLvl1BG(f),
      collectType: 'key', collectCount: 3, collectColor: '#00FF88', collectIcon: '{}',
      gndColor: 'rgba(0,255,136,.7)', gridColor: 'rgba(0,255,136,.05)',
      theme: { r: 0, g: 255, b: 136 }
    },
    {
      name: 'THE LOGIC LABYRINTH', subtitle: 'Level 2 — Collect 5 Clean Datasets',
      story: 'The AI is watching. Prove your logic is sound.',
      goal: 5400, worldW: 5600,
      bg: (f) => drawLvl2BG(f),
      collectType: 'data', collectCount: 5, collectColor: '#A855F7', collectIcon: 'DB',
      gndColor: 'rgba(168,85,247,.7)', gridColor: 'rgba(168,85,247,.05)',
      theme: { r: 168, g: 85, b: 247 }
    },
    {
      name: 'THE FIREWALL VAULT', subtitle: 'Level 3 — Reach the Core',
      story: 'The breach is almost complete. Don\'t let the system trace you.',
      goal: 4800, worldW: 5000,
      bg: (f) => drawLvl3BG(f),
      collectType: 'reach', collectCount: 0, collectColor: '#FF4500', collectIcon: '>>',
      gndColor: 'rgba(255,69,0,.7)', gridColor: 'rgba(255,69,0,.05)',
      theme: { r: 255, g: 69, b: 0 }
    }
  ];

  // ── Player ──
  const P = { x: 80, y: GND - 70, w: 64, h: 64, vx: 0, vy: 0, speed: 4.5, ground: true, jumps: 0, maxJumps: 2, shootT: 0, shootCD: 22, inv: 0, scale: 1, isClimbing: false, climbX: 0 };

  // ── Parallax BG ──
  const stars = Array.from({ length: 80 }, () => ({ x: Math.random() * W, y: Math.random() * H * .8, r: .5 + Math.random() * 1.5, s: .2 + Math.random() * .6, br: Math.random() }));
  const MAT = Array.from({ length: Math.floor(W / 18) }, (_, i) => ({ x: i * 18, y: Math.random() * H * 2, s: 1 + Math.random() * 2 }));

  // ─────────────────────────────────────────────
  // Sound System
  // ─────────────────────────────────────────────
  let bgm = null;
  function initAudio() {
    if (!actx && soundOn) {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      startBGM();
    }
  }
  function startBGM() {
    if (!actx || !soundOn || bgm) return;
    const osc = actx.createOscillator();
    const lfo = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'sawtooth'; osc.frequency.value = 65;
    lfo.type = 'sine'; lfo.frequency.value = 0.5;
    const lfoGain = actx.createGain(); lfoGain.gain.value = 10;
    lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
    gain.gain.value = 0.05;
    osc.connect(gain); gain.connect(actx.destination);
    osc.start(); lfo.start();
    bgm = { osc, lfo, gain };
  }
  function stopBGM() {
    if (bgm) { bgm.osc.stop(); bgm.lfo.stop(); bgm.gain.disconnect(); bgm = null; }
  }
  function playSound(type) {
    if (!soundOn || !actx) return;
    const osc = actx.createOscillator(); const gain = actx.createGain();
    osc.connect(gain); gain.connect(actx.destination);
    const now = actx.currentTime;
    if (type === 'jump') { osc.type = 'square'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(300, now + 0.1); gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1); osc.start(now); osc.stop(now + 0.1); }
    else if (type === 'hit') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(50, now + 0.2); gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2); osc.start(now); osc.stop(now + 0.2); }
    else if (type === 'coin') { osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.setValueAtTime(600, now + 0.05); gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.1); osc.start(now); osc.stop(now + 0.1); }
    else if (type === 'cp') { osc.type = 'square'; osc.frequency.setValueAtTime(300, now); osc.frequency.setValueAtTime(500, now + 0.2); osc.frequency.setValueAtTime(800, now + 0.4); gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.6); osc.start(now); osc.stop(now + 0.6); }
  }

  // ─────────────────────────────────────────────
  // CONTROLS
  // ─────────────────────────────────────────────
  function jump() {
    if (P.jumps < P.maxJumps && !P.isClimbing) {
      P.vy = P.jumps === 0 ? -11 : -9;
      P.ground = false; P.jumps++;
      playSound('jump');
      particles.push(...burst(P.x + P.w / 2, P.y + P.h, 'rgba(124,58,237,.7)', 6));
    }
  }

  function handleKey(e, isDown) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.Left = isDown;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.Right = isDown;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.Up = isDown;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.Down = isDown;
    if (e.code === 'Space') keys.Jump = isDown;
  }

  document.addEventListener('keydown', e => {
    handleKey(e, true);
    if (e.code === 'KeyP') { togglePause(); }
    if ((e.code === 'Space' || e.code === 'ArrowUp') && !isPaused) {
      e.preventDefault();
      if (state === 'title') { initAudio(); state = 'playing'; resetGame(); }
      else if (state === 'playing') { if (e.code === 'Space') jump(); }
      else if (state === 'gameover' || state === 'win') {
        if (gameMode === 'story' && state === 'gameover') { initAudio(); state = 'playing'; initLevel(); }
        else { state = 'title'; setupModeButtons(); }
      }
      else if (state === 'transition' || state === 'level_clear') { if (transTimer < 30) transTimer = 30; }
    }
    if (e.code === 'KeyR' && (state === 'gameover' || state === 'win')) {
      if (gameMode === 'story' && state === 'gameover') { initAudio(); state = 'playing'; initLevel(); }
      else { state = 'title'; setupModeButtons(); }
    }
    if (e.code === 'KeyR' && state === 'playing') resetGame();
  });
  document.addEventListener('keyup', e => handleKey(e, false));

  function togglePause() {
    if (state !== 'playing') return;
    isPaused = !isPaused;
    document.getElementById('pauseMenu').style.display = isPaused ? 'flex' : 'none';
  }

  canvas.addEventListener('click', () => {
    if (isPaused) return;
    if (state === 'title') { initAudio(); state = 'playing'; resetGame(); }
    else if (state === 'playing') jump();
    else if (state === 'gameover' || state === 'win') {
      if (gameMode === 'story' && state === 'gameover') { initAudio(); state = 'playing'; initLevel(); }
      else { state = 'title'; setupModeButtons(); }
    }
    else if (state === 'transition' || state === 'level_clear') { if (transTimer < 30) transTimer = 30; }
  });

  // ─────────────────────────────────────────────
  // RESET
  // ─────────────────────────────────────────────
  function resetGame() {
    score = 0; health = 3; maxHealth = 3; frame = 0; spawnRate = 180; spawnT = 0;
    combo = 0; comboTimer = 0; comboMult = 1; shields = 0; checkpoints = 0; lastCpScore = 0;
    enemies = []; bullets = []; particles = []; powerups = []; totalDamageTaken = 0;
    P.x = gameMode === 'endless' ? 40 : 80; P.y = GND - P.h; P.vy = 0; P.vx = 0; P.ground = true; P.inv = 0; P.scale = 1; P.jumps = 0; P.isClimbing = false;
    if (gameMode === 'story') { curLevel = 0; initLevel(); }
    else { document.getElementById('mobileControls').style.display = controlsOn ? 'flex' : 'none'; document.getElementById('mcUp').style.display = 'none'; document.getElementById('mcDown').style.display = 'none'; document.getElementById('mcLeft').style.display = 'none'; document.getElementById('mcRight').style.display = 'none'; }
  }

  function initLevel() {
    const lv = LEVELS[curLevel];
    camX = 0; collectibles = []; platforms = []; ladders = []; boss = null; storyMsg = lv.story; storyMsgTimer = 240;
    levelHP = 3; enemies = []; bullets = []; particles = []; frame = 0;
    P.x = 80; P.y = GND - P.h; P.vy = 0; P.vx = 0; P.ground = true; P.inv = 0; P.jumps = 0; P.isClimbing = false;
    spawnRate = curLevel === 2 ? 110 : curLevel === 1 ? 140 : 160;
    buildLevel(lv);
  }

  function buildLevel(lv) {
    // Platforms evenly across world
    const basePts = curLevel === 0 ? [
      { x: 320, y: GND - 90, w: 120 }, { x: 520, y: GND - 20, w: 120, type: 'lava' }, { x: 600, y: GND - 100, w: 80, type: 'fall' }, { x: 800, y: GND - 60, w: 140 },
      { x: 1050, y: GND - 150, w: 90, type: 'moving' }, { x: 1300, y: GND - 100, w: 100 }, { x: 1480, y: GND - 20, w: 140, type: 'lava' }, { x: 1600, y: GND - 170, w: 80, type: 'fall' },
      { x: 1800, y: GND - 110, w: 120, type: 'moving' }, { x: 2000, y: GND - 80, w: 100 }
    ] : curLevel === 1 ? [
      { x: 300, y: GND - 100, w: 130, type: 'moving' }, { x: 550, y: GND - 20, w: 160, type: 'lava' }, { x: 600, y: GND - 140, w: 80, type: 'fall' }, { x: 850, y: GND - 120, w: 100 },
      { x: 1100, y: GND - 200, w: 70, type: 'moving' }, { x: 1380, y: GND - 140, w: 90, type: 'fall' }, { x: 1650, y: GND - 180, w: 90 },
      { x: 1850, y: GND - 20, w: 150, type: 'lava' }, { x: 1950, y: GND - 120, w: 130 }, { x: 2200, y: GND - 160, w: 80 }, { x: 2500, y: GND - 100, w: 120, type: 'moving' },
      { x: 2800, y: GND - 180, w: 90, type: 'fall' }, { x: 3100, y: GND - 130, w: 100 }
    ] : [
      { x: 300, y: GND - 100, w: 110 }, { x: 580, y: GND - 140, w: 80, type: 'moving' }, { x: 800, y: GND - 20, w: 200, type: 'lava' }, { x: 880, y: GND - 90, w: 90, type: 'fall' },
      { x: 1100, y: GND - 160, w: 70 }, { x: 1380, y: GND - 100, w: 100, type: 'moving' }, { x: 1650, y: GND - 140, w: 90, type: 'fall' },
      { x: 1900, y: GND - 80, w: 130 }, { x: 2150, y: GND - 20, w: 180, type: 'lava' }, { x: 2200, y: GND - 140, w: 80, type: 'moving' }, { x: 2500, y: GND - 100, w: 100 }
    ];

    let fullPts = [];
    const cycles = Math.ceil(lv.worldW / 2400); // repeat pattern
    for (let i = 0; i < cycles; i++) {
      const offsetX = i * 2400;
      basePts.forEach(p => {
        if (p.x + offsetX < lv.worldW - 300) {
          fullPts.push({ x: p.x + offsetX, y: p.y, w: p.w, type: p.type || 'static', phase: Math.random() * 10, startY: p.y, fallWait: 30 });
        }
      });
    }
    platforms = fullPts;

    // Ladders (every second platform has a ladder down to GND)
    ladders = fullPts.filter((_, i) => i % 2 !== 0).map(p => ({ x: p.x + p.w / 2 - 15, y: p.y, w: 30, h: GND - p.y }));

    // Collectibles on platforms
    if (lv.collectType !== 'reach') {
      const slots = fullPts.filter((_, i) => i % Math.ceil(fullPts.length / lv.collectCount) === 0).slice(0, lv.collectCount);
      collectibles = slots.map(p => ({ x: p.x + p.w / 2 - 14, y: p.startY - 36, w: 28, h: 28, collected: false, bob: Math.random() * Math.PI * 2 }));
    }

    if (gameMode === 'story') {
      const cycs = Math.ceil(lv.worldW / 2000); 
      for(let i=0; i<cycs; i++) {
         const oX = i * 2000;
         enemies.push({x: 1200 + oX, y: GND-180, w:30, h:30, speed:0, type:'swarm', hp:15, startX: 1200 + oX, startY: GND-180, phase: Math.random()*10, dead:false, flash:0});
      }
    }
  }

  function spawnBoss() {
    boss = { x: camX + W + 60, y: GND - 60, w: 55, h: 60, hp: 8, maxHp: 8, speed: 1.2, phase: 0, flash: 0, dead: false };
  }

  // ─────────────────────────────────────────────
  // PARTICLES
  // ─────────────────────────────────────────────
  function burst(x, y, color, n = 8) {
    return Array.from({ length: n }, () => ({ x, y, vx: (Math.random() - .5) * 9, vy: (Math.random() - .5) * 9, life: 1, decay: .04, color, r: 2 + Math.random() * 4 }));
  }

  // ─────────────────────────────────────────────
  // ENDLESS MODE SPAWN
  // ─────────────────────────────────────────────
  function spawnEnemy() {
    const types = ['cube', 'drone', 'spike', 'glitch'];
    const t = types[Math.floor(Math.random() * types.length)];
    const h = t === 'spike' ? 55 : t === 'drone' ? 32 : 42;
    const airY = t === 'drone' ? GND - h - 60 - Math.random() * 60 : GND - h;
    const spd = 1.8 + score * .00025 + frame * .00012;
    enemies.push({ x: W + 30, y: airY, w: 36, h, vy: 0, speed: spd, type: t, hp: t === 'glitch' ? 3 : t === 'drone' ? 2 : 1, phase: Math.random() * Math.PI * 2, dead: false, flash: 0 });
  }
  function spawnPowerup() {
    const types = ['shield', 'rapid', 'score'];
    const t = types[Math.floor(Math.random() * 3)];
    powerups.push({ x: W + 20, y: GND - 40 - Math.random() * 80, type: t, w: 28, h: 28, speed: 2, bob: Math.random() * Math.PI * 2, dead: false });
  }

  // ─────────────────────────────────────────────
  // SHOOTING
  // ─────────────────────────────────────────────
  function shoot() {
    const rapid = P.shootCD < 14;
    bullets.push({ x: P.x + P.w, y: P.y + P.h / 2 - 3, w: rapid ? 28 : 20, h: 5, speed: 14, active: true, color: rapid ? '#FF8C00' : '#00D4FF' });
  }

  // ─────────────────────────────────────────────
  // BG DRAW HELPERS
  // ─────────────────────────────────────────────
  function drawStars() {
    const pX = gameMode === 'story' ? camX * 0.05 : frame * 0.1;
    stars.forEach(s => {
      s.br += .005; const a = (.4 + Math.sin(s.br) * .3) * s.s;
      const sx = (s.x - pX * s.s) % W;
      const renderX = sx < 0 ? sx + W : sx;
      ctx.beginPath(); ctx.arc(renderX, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,220,255,${a})`; ctx.fill();
    });
  }
  function drawMatrix(color = '0,212,255') {
    ctx.font = '12px "Fira Code",monospace';
    const pX = gameMode === 'story' ? camX * 0.1 : 0;
    MAT.forEach(col => {
      col.y += col.s * .5; if (col.y > H * 2) col.y = -40;
      const sx = (col.x - pX * col.s) % W;
      const rx = sx < -20 ? sx + W + 20 : sx;
      for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(${color},${(6 - i) / 6 * .1})`; ctx.fillText(Math.random() < .5 ? '1' : '0', rx, col.y - i * 16); }
    });
  }
  function drawGround(gndCol = 'rgba(124,58,237,.75)', gridCol = 'rgba(124,58,237,.07)') {
    const g = ctx.createLinearGradient(0, GND, 0, H);
    g.addColorStop(0, 'rgba(10,10,30,.95)'); g.addColorStop(1, 'rgba(4,4,14,1)');
    ctx.fillStyle = g; ctx.fillRect(0, GND, W, H - GND);
    ctx.strokeStyle = gridCol; ctx.lineWidth = 1;
    for (let x = (-frame * .8) % 40; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, GND); ctx.lineTo(x, H); ctx.stroke(); }
    ctx.save(); ctx.shadowColor = gndCol; ctx.shadowBlur = 14;
    ctx.strokeStyle = gndCol; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, GND); ctx.lineTo(W, GND); ctx.stroke(); ctx.restore();
  }
  function drawScanline() {
    const scanY = (frame * 1.2) % H;
    const sg = ctx.createLinearGradient(0, scanY - 2, 0, scanY + 2);
    sg.addColorStop(0, 'transparent'); sg.addColorStop(.5, 'rgba(0,212,255,.05)'); sg.addColorStop(1, 'transparent');
    ctx.fillStyle = sg; ctx.fillRect(0, scanY - 2, W, 4);
  }

  // Level BGs
  function drawLvl1BG(f) {
    ctx.fillStyle = '#020D06'; ctx.fillRect(0, 0, W, H);
    drawMatrix('0,255,136');
    // grid overlay
    ctx.strokeStyle = 'rgba(0,255,136,.04)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    drawGround('rgba(0,255,136,.7)', 'rgba(0,255,136,.05)');
  }
  function drawLvl2BG(f) {
    ctx.fillStyle = '#0A0514'; ctx.fillRect(0, 0, W, H);
    // floating neural nodes
    const t = f * .012;
    for (let i = 0; i < 18; i++) {
      const nx = (i * 113 + Math.sin(t + i) * .04 * W) % W;
      const ny = 100 + Math.sin(t * .7 + i * 0.6) * 60 + i * 20;
      ctx.beginPath(); ctx.arc(nx, ny, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(168,85,247,${.15 + .1 * Math.sin(t + i)})`; ctx.fill();
      if (i > 0) { ctx.beginPath(); ctx.moveTo(nx, ny); const pnx = ((i - 1) * 113 + Math.sin(t + (i - 1)) * .04 * W) % W; const pny = 100 + Math.sin(t * .7 + (i - 1) * 0.6) * 60 + (i - 1) * 20; ctx.lineTo(pnx, pny); ctx.strokeStyle = 'rgba(168,85,247,.06)'; ctx.lineWidth = 1; ctx.stroke(); }
    }
    drawMatrix('168,85,247');
    drawGround('rgba(168,85,247,.7)', 'rgba(168,85,247,.05)');
  }
  function drawLvl3BG(f) {
    const flicker = Math.sin(f * .3) > .6 ? '#0D0200' : '#080100';
    ctx.fillStyle = flicker; ctx.fillRect(0, 0, W, H);
    drawMatrix('255,69,0');
    // alert scanlines
    if (Math.sin(f * .25) > .7) { ctx.fillStyle = 'rgba(255,69,0,.03)'; ctx.fillRect(0, 0, W, H); }
    drawGround('rgba(255,69,0,.7)', 'rgba(255,69,0,.05)');
  }

  // ─────────────────────────────────────────────
  // PLAYER DRAW
  // ─────────────────────────────────────────────
  function drawPlayer() {
    if (P.inv > 0 && Math.floor(P.inv / 5) % 2 === 0) return;
    ctx.save();
    const lv = gameMode === 'story' ? LEVELS[curLevel] : null;
    const glowC = lv ? `rgba(${lv.theme.r},${lv.theme.g},${lv.theme.b},.6)` : 'rgba(124,58,237,.6)';
    ctx.shadowColor = glowC; ctx.shadowBlur = 20;
    if (pImg.complete && pImg.naturalWidth > 0) {
      const sy = P.ground ? 1 : 1 + (P.vy * -.012); const sx = P.ground ? 1 : 1 + (P.vy * .006);
      ctx.translate(P.x + P.w / 2, P.y + P.h / 2); ctx.scale(sx * P.scale, sy * P.scale);
      ctx.drawImage(pImg, -P.w / 2, -P.h / 2, P.w, P.h);
    } else {
      ctx.fillStyle = '#7C3AED'; ctx.fillRect(P.x, P.y, P.w, P.h);
      ctx.fillStyle = '#fff'; ctx.font = '10px Fira Code'; ctx.fillText('CZ', P.x + 18, P.y + 35);
    }
    ctx.restore();
    if (shields > 0) { ctx.save(); ctx.strokeStyle = 'rgba(0,212,255,.5)'; ctx.lineWidth = 2; ctx.shadowColor = '#00D4FF'; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(P.x + P.w / 2, P.y + P.h / 2, P.w * .7, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    // double-jump indicator
    if (!P.ground && P.jumps === 1) { ctx.save(); ctx.fillStyle = 'rgba(124,58,237,.4)'; ctx.beginPath(); ctx.arc(P.x + P.w / 2, P.y + P.h + 6, 4, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  }

  // ─────────────────────────────────────────────
  // ENDLESS ENEMY DRAW
  // ─────────────────────────────────────────────
  function drawEnemy(e) {
    if (e.dead) return; ctx.save();
    const fl = e.flash > 0;
    if (e.type === 'cube') {
      ctx.shadowColor = fl ? '#fff' : '#FF4500'; ctx.shadowBlur = fl ? 30 : 18;
      const g = ctx.createLinearGradient(e.x, e.y, e.x + e.w, e.y + e.h);
      g.addColorStop(0, fl ? '#fff' : '#FF4500'); g.addColorStop(1, fl ? '#fff' : '#FF8C00');
      ctx.fillStyle = g; ctx.fillRect(e.x, e.y, e.w, e.h);
      if (!fl) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.font = '7px Fira Code'; ctx.fillText('ERR', e.x + 3, e.y + 14); ctx.fillText('0x0', e.x + 3, e.y + 24); }
    } else if (e.type === 'drone') {
      ctx.shadowColor = fl ? '#fff' : '#EC4899'; ctx.shadowBlur = fl ? 30 : 22; ctx.fillStyle = fl ? '#fff' : '#EC4899';
      ctx.beginPath(); ctx.moveTo(e.x + e.w / 2, e.y); ctx.lineTo(e.x + e.w, e.y + e.h / 2); ctx.lineTo(e.x + e.w / 2, e.y + e.h); ctx.lineTo(e.x, e.y + e.h / 2); ctx.closePath(); ctx.fill();
    } else if (e.type === 'spike') {
      ctx.shadowColor = fl ? '#fff' : '#DC2626'; ctx.shadowBlur = fl ? 30 : 18; ctx.fillStyle = fl ? '#fff' : '#DC2626';
      ctx.beginPath(); ctx.moveTo(e.x, e.y + e.h); ctx.lineTo(e.x + e.w / 2, e.y); ctx.lineTo(e.x + e.w, e.y + e.h); ctx.closePath(); ctx.fill();
    } else if (e.type === 'swarm') {
      ctx.shadowColor = fl ? '#fff' : '#00FF88'; ctx.shadowBlur = fl ? 30 : 25; ctx.fillStyle = fl ? '#fff' : '#00FF88';
      for(let i=0; i<5; i++) { const aa = e.phase + i*1.2; ctx.beginPath(); ctx.arc(e.x + e.w/2 + Math.sin(aa*2)*15, e.y + e.h/2 + Math.cos(aa*3)*15, 3, 0, Math.PI*2); ctx.fill(); }
    } else {
      ctx.shadowColor = '#00FF88'; ctx.shadowBlur = fl ? 30 : 20; ctx.strokeStyle = fl ? '#fff' : '#00FF88'; ctx.lineWidth = 2;
      ctx.strokeRect(e.x, e.y, e.w, e.h); ctx.fillStyle = `rgba(0,255,136,${fl ? .8 : .15})`; ctx.fillRect(e.x, e.y, e.w, e.h);
      if (!fl && Math.random() < .3) { ctx.fillStyle = 'rgba(0,255,136,.3)'; ctx.fillRect(e.x, e.y + Math.random() * e.h, e.w, 2); }
    }
    ctx.restore();
    if (e.hp > 1) { for (let i = 0; i < e.hp; i++) { ctx.fillStyle = 'rgba(0,255,136,.8)'; ctx.fillRect(e.x + i * 8, e.y - 6, 6, 3); } }
  }

  function drawBullets() {
    bullets.forEach(b => {
      if (!b.active) return;
      ctx.save(); ctx.shadowColor = b.color; ctx.shadowBlur = 10;
      const g = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0); g.addColorStop(0, 'rgba(0,212,255,.1)'); g.addColorStop(1, b.color);
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 2); ctx.fill(); ctx.restore();
    });
  }
  function drawPowerups() {
    powerups.forEach(p => {
      if (p.dead) return; p.bob += .06; const fy = p.y + Math.sin(p.bob) * 6;
      ctx.save(); const colors = { shield: '#00D4FF', rapid: '#FF8C00', score: '#FFD700' }; const icons = { shield: '🛡', rapid: '⚡', score: '💎' };
      ctx.shadowColor = colors[p.type]; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(p.x + p.w / 2, fy + p.h / 2, p.w / 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fill(); ctx.strokeStyle = colors[p.type]; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = '14px sans-serif'; ctx.fillText(icons[p.type], p.x + p.w / 2 - 7, fy + p.h / 2 + 6); ctx.restore();
    });
  }
  function drawParticles() {
    particles.forEach(p => { ctx.save(); ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.restore(); });
  }

  // ─────────────────────────────────────────────
  // STORY MODE DRAW
  // ─────────────────────────────────────────────
  function drawPlatforms() {
    const lv = LEVELS[curLevel];
    const { r, g, b } = lv.theme;

    // Ladders
    ladders.forEach(l => {
      const lx = l.x - camX;
      ctx.save(); ctx.strokeStyle = `rgba(${r},${g},${b},.3)`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(lx, l.y); ctx.lineTo(lx, l.y + l.h);
      ctx.moveTo(lx + l.w, l.y); ctx.lineTo(lx + l.w, l.y + l.h);
      for (let y_l = l.y + 10; y_l < l.y + l.h; y_l += 14) { ctx.moveTo(lx, y_l); ctx.lineTo(lx + l.w, y_l); }
      ctx.stroke(); ctx.restore();
    });

    platforms.forEach(p => {
      const px = p.x - camX;
      ctx.save();
      if (p.type === 'lava') {
        const hg = ctx.createLinearGradient(0, p.y, 0, p.y + 12); hg.addColorStop(0, '#FF4500'); hg.addColorStop(1, '#DC2626');
        ctx.shadowColor = '#FF4500'; ctx.shadowBlur = 18; ctx.fillStyle = hg; ctx.fillRect(px, p.y, p.w, 12);
        if (Math.random() < 0.1) particles.push({ x: p.x + Math.random() * p.w, y: p.y, vx: 0, vy: -1 - Math.random() * 2, life: 1, decay: .06, color: '#FF4500', r: 2 });
      } else if (p.type === 'fall') {
        ctx.shadowColor = p.fallWait < 30 ? '#DC2626' : `rgba(${r},${g},${b},.6)`; ctx.shadowBlur = 12;
        ctx.fillStyle = p.fallWait < 30 ? 'rgba(220,38,38,.5)' : `rgba(100,100,100,.5)`; ctx.fillRect(px, p.y, p.w, 8);
        ctx.strokeStyle = `rgba(${r},${g},${b},.8)`; ctx.lineWidth = 1.5; ctx.strokeRect(px, p.y, p.w, 8);
        if (p.fallWait < 30) { ctx.fillStyle = '#fff'; ctx.fillRect(px + Math.random() * p.w, p.y, 4, 8); }
      } else {
        ctx.shadowColor = `rgba(${r},${g},${b},.6)`; ctx.shadowBlur = 12;
        ctx.fillStyle = `rgba(${r},${g},${b},.25)`; ctx.fillRect(px, p.y, p.w, 8);
        ctx.strokeStyle = `rgba(${r},${g},${b},.8)`; ctx.lineWidth = 1.5; ctx.strokeRect(px, p.y, p.w, 8);
      }
      ctx.restore();
    });
  }
  function drawCollectibles() {
    const lv = LEVELS[curLevel];
    collectibles.forEach(c => {
      if (c.collected) return;
      c.bob += .05; const fy = c.y + Math.sin(c.bob) * 5; const cx = c.x - camX;
      ctx.save(); ctx.shadowColor = lv.collectColor; ctx.shadowBlur = 18;
      ctx.strokeStyle = lv.collectColor; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(cx, fy, c.w, c.h, 4); ctx.stroke();
      ctx.fillStyle = lv.collectColor + '22'; ctx.fill();
      ctx.fillStyle = lv.collectColor; ctx.font = 'bold 9px Fira Code'; ctx.textAlign = 'center';
      ctx.fillText(lv.collectIcon, cx + c.w / 2, fy + c.h / 2 + 4); ctx.textAlign = 'left';
      ctx.restore();
    });
  }
  function drawGoal() {
    const lv = LEVELS[curLevel]; const gx = lv.goal - camX; if (gx > W + 60) return;
    const { r, g, b } = lv.theme;
    ctx.save(); ctx.shadowColor = `rgba(${r},${g},${b},.9)`; ctx.shadowBlur = 30;
    ctx.strokeStyle = `rgba(${r},${g},${b},.8)`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(gx, GND - 160); ctx.lineTo(gx, GND); ctx.stroke();
    ctx.fillStyle = `rgba(${r},${g},${b},.15)`; ctx.fillRect(gx, GND - 160, 60, 160);
    ctx.font = '7px "Press Start 2P",cursive'; ctx.fillStyle = `rgba(${r},${g},${b},1)`;
    const label = curLevel === 2 ? '>> CORE' : 'compiler.exe';
    ctx.fillText(label, Math.max(gx + 4, 4), GND - 10); ctx.restore();
  }
  function drawBoss() {
    if (!boss || boss.dead) return;
    const bx = boss.x - camX;
    ctx.save(); ctx.shadowColor = boss.flash > 0 ? '#fff' : '#FF4500'; ctx.shadowBlur = boss.flash > 0 ? 40 : 25;
    ctx.fillStyle = boss.flash > 0 ? '#fff' : '#FF4500';
    // Sentry drone shape
    ctx.beginPath(); ctx.moveTo(bx + boss.w / 2, boss.y); ctx.lineTo(bx + boss.w, boss.y + boss.h * .4); ctx.lineTo(bx + boss.w * .8, boss.y + boss.h); ctx.lineTo(bx + boss.w * .2, boss.y + boss.h); ctx.lineTo(bx, boss.y + boss.h * .4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.font = '6px Fira Code'; ctx.fillText('SENTRY', bx + 4, boss.y + boss.h * .5 + 3);
    ctx.restore();
    // Boss HP bar
    ctx.fillStyle = 'rgba(255,69,0,.3)'; ctx.fillRect(bx, boss.y - 12, boss.w, 6);
    ctx.fillStyle = '#FF4500'; ctx.fillRect(bx, boss.y - 12, boss.w * (boss.hp / boss.maxHp), 6);
    // Lasers
    if (curLevel === 2 && Math.random() < .004 && boss.hp < boss.maxHp * .5) {
      particles.push({ x: bx, y: boss.y + boss.h / 2, vx: -8, vy: 0, life: 1, decay: .05, color: 'rgba(255,0,0,.9)', r: 3 });
    }
  }
  function drawStoryHUD() {
    const lv = LEVELS[curLevel]; const coll = collectibles.filter(c => c.collected).length;
    const total = lv.collectCount;
    ctx.save();
    // Level name
    ctx.font = '7px "Press Start 2P",cursive'; ctx.fillStyle = 'rgba(226,232,240,.5)'; ctx.fillText(lv.name, 10, 20);
    // HP
    ctx.shadowColor = '#DC2626'; ctx.shadowBlur = 8; ctx.strokeStyle = 'rgba(220,38,38,.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(10, 26, 140, 16);
    const hw = (levelHP / 3) * (140 - 4); const hg = ctx.createLinearGradient(12, 0, 12 + hw, 0); hg.addColorStop(0, '#DC2626'); hg.addColorStop(1, '#FF4500');
    ctx.fillStyle = hg; ctx.fillRect(12, 28, Math.max(0, hw), 12); ctx.font = '6px "Press Start 2P",cursive'; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillText('HP', 16, 38);
    // Collectible count
    if (lv.collectType !== 'reach') {
      ctx.shadowColor = lv.collectColor; ctx.shadowBlur = 12; ctx.font = '8px "Press Start 2P",cursive'; ctx.fillStyle = lv.collectColor;
      ctx.fillText(`${lv.collectIcon}: ${coll}/${total}`, 10, 58);
    } else {
      const prog = Math.min(1, (camX + P.x) / lv.goal);
      ctx.strokeStyle = 'rgba(255,69,0,.4)'; ctx.lineWidth = 1.5; ctx.strokeRect(10, 48, 140, 10);
      ctx.fillStyle = '#FF4500'; ctx.fillRect(11, 49, Math.max(0, prog * 138), 8);
      ctx.font = '5px "Press Start 2P",cursive'; ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillText('PROGRESS', 12, 57);
    }
    // Story message
    if (storyMsgTimer > 0) {
      const a = Math.min(1, storyMsgTimer / 60); ctx.globalAlpha = a;
      ctx.font = '7px "Fira Code",monospace'; ctx.fillStyle = lv.collectColor; ctx.textAlign = 'center';
      ctx.fillText('>> ' + storyMsg, W / 2, H - 25); ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  // ─────────────────────────────────────────────
  // ENDLESS HUD
  // ─────────────────────────────────────────────
  function drawHUD() {
    const bw = 160, bh = 20; ctx.save(); ctx.shadowColor = '#DC2626'; ctx.shadowBlur = 8;
    ctx.strokeStyle = 'rgba(220,38,38,.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(12, 12, bw, bh);
    const hw = (health / maxHealth) * (bw - 4); const hg = ctx.createLinearGradient(14, 0, 14 + hw, 0); hg.addColorStop(0, '#DC2626'); hg.addColorStop(1, '#FF4500');
    ctx.fillStyle = hg; ctx.fillRect(14, 14, Math.max(0, hw), bh - 4); ctx.font = '7px "Press Start 2P",cursive'; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillText('HP', 18, 26); ctx.restore();
    if (shields > 0) { ctx.fillStyle = '#00D4FF'; ctx.font = '7px "Press Start 2P",cursive'; ctx.fillText('SHIELD', 12, 44); }
    ctx.save(); ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 10; ctx.font = '14px "Press Start 2P",cursive'; ctx.fillStyle = '#FFD700'; ctx.fillText(String(Math.floor(score)).padStart(6, '0'), W - 128, 28); ctx.restore();
    ctx.font = '7px "Fira Code",monospace'; ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillText('HI:' + String(Math.floor(hiScore)).padStart(6, '0'), W - 128, 44);

    // Distance to next CP
    const distToCp = Math.ceil(1500 - (score - lastCpScore));
    ctx.fillStyle = 'rgba(0,255,136,.6)'; ctx.fillText('NEXT CP: ' + distToCp + 'm', W - 128, 58);

    if (combo > 1) { ctx.save(); ctx.globalAlpha = Math.min(1, comboTimer / 60); ctx.shadowColor = '#FF8C00'; ctx.shadowBlur = 15; ctx.font = '11px "Press Start 2P",cursive'; ctx.fillStyle = '#FF8C00'; ctx.textAlign = 'center'; ctx.fillText('x' + combo + ' COMBO!', W / 2, 36); ctx.textAlign = 'left'; ctx.restore(); }
    ctx.fillStyle = 'rgba(0,212,255,.3)'; ctx.font = '7px "Fira Code",monospace'; ctx.fillText(`ENDLESS // SEC ${checkpoints + 1} // SPD:` + (1 + Math.floor((180 - spawnRate) / 22)), 12, H - 10);
    if (storyMsgTimer > 0) {
      const a = Math.min(1, storyMsgTimer / 60); ctx.save(); ctx.globalAlpha = a;
      ctx.font = '9px "Fira Code",monospace'; ctx.fillStyle = '#00FF88'; ctx.textAlign = 'center';
      ctx.shadowColor = '#00FF88'; ctx.shadowBlur = 10;
      ctx.fillText(storyMsg, W / 2, H / 2 - 40); ctx.restore();
    }
  }

  // ─────────────────────────────────────────────
  // TITLE / GAMEOVER / WIN / TRANSITION
  // ─────────────────────────────────────────────
  function drawTitle() {
    ctx.fillStyle = 'rgba(2,5,18,.93)'; ctx.fillRect(0, 0, W, H); drawMatrix();
    for (let y = 0; y < H; y += 4) { ctx.fillStyle = 'rgba(0,0,0,.06)'; ctx.fillRect(0, y, W, 2); }
    ctx.save(); ctx.textAlign = 'center';
    ctx.font = 'clamp(16px,4vw,32px) "Press Start 2P",cursive'; ctx.fillStyle = '#00D4FF'; ctx.shadowColor = '#00D4FF'; ctx.shadowBlur = 35; ctx.fillText('CZERNODE', W / 2, H / 2 - 100);
    ctx.font = 'clamp(8px,1.8vw,13px) "Press Start 2P",cursive'; ctx.fillStyle = '#FF8C00'; ctx.shadowColor = '#FF8C00'; ctx.shadowBlur = 18; ctx.fillText('CORE BREACH', W / 2, H / 2 - 64);
    if (pImg.complete && pImg.naturalWidth > 0) { ctx.restore(); ctx.save(); const fy = H / 2 - 30 + Math.sin(Date.now() * .0015) * 8; ctx.shadowColor = 'rgba(124,58,237,.6)'; ctx.shadowBlur = 40; ctx.drawImage(pImg, W / 2 - 48, fy, 96, 96); }
    ctx.restore(); ctx.save(); ctx.textAlign = 'center';
    // Mode buttons text
    ctx.font = '8px "Press Start 2P",cursive'; ctx.fillStyle = gameMode === 'endless' ? '#00D4FF' : 'rgba(0,212,255,.4)'; ctx.fillText('[ ENDLESS MODE ]', W / 2 - 82, H / 2 + 80);
    ctx.fillStyle = gameMode === 'story' ? '#A855F7' : 'rgba(168,85,247,.4)'; ctx.fillText('[ STORY MODE ]', W / 2 + 78, H / 2 + 80);
    if (Math.sin(Date.now() * .003) > 0) { ctx.font = '8px "Press Start 2P",cursive'; ctx.fillStyle = '#E2E8F0'; ctx.shadowBlur = 0; ctx.fillText('SPACE / CLICK TO START', W / 2, H / 2 + 108); }
    if (hiScore > 0 && gameMode === 'endless') { ctx.font = '7px "Fira Code",monospace'; ctx.fillStyle = 'rgba(255,215,0,.6)'; ctx.fillText('HI: ' + Math.floor(hiScore), W / 2, H / 2 + 128); }
    ctx.font = '6px "Fira Code",monospace'; ctx.fillStyle = 'rgba(0,212,255,.35)'; ctx.fillText('JUMP:SPACE/↑/CLICK(×2)  SHOOT:AUTO  R=RESTART', W / 2, H - 14); ctx.restore();
  }
  function drawGameOver() {
    ctx.fillStyle = 'rgba(2,5,18,.9)'; ctx.fillRect(0, 0, W, H); ctx.save(); ctx.textAlign = 'center';
    ctx.font = 'clamp(11px,2.5vw,22px) "Press Start 2P",cursive'; ctx.fillStyle = '#FF0040'; ctx.shadowColor = '#FF0040'; ctx.shadowBlur = 28; ctx.fillText('SYSTEM BREACH', W / 2, H / 2 - 55);
    ctx.font = 'clamp(8px,1.8vw,12px) "Press Start 2P",cursive';
    if (gameMode === 'endless') { ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 14; ctx.fillText('SCORE: ' + String(Math.floor(score)).padStart(6, '0'), W / 2, H / 2 - 15); if (score > hiScore) { ctx.fillStyle = '#00FF88'; ctx.shadowColor = '#00FF88'; ctx.font = '7px "Press Start 2P",cursive'; ctx.fillText('NEW HIGH SCORE! 🎉', W / 2, H / 2 + 12); } }
    else { ctx.fillStyle = '#A855F7'; ctx.shadowBlur = 14; ctx.fillText('LEVEL ' + (curLevel + 1) + ' FAILED', W / 2, H / 2 - 15); }
    ctx.fillStyle = 'rgba(226,232,240,.5)'; ctx.shadowBlur = 0; if (Math.sin(Date.now() * .003) > 0) { ctx.font = '7px "Press Start 2P",cursive'; ctx.fillText(gameMode === 'story' ? '[ SPACE/CLICK TO RETRY LEVEL ]' : '[ SPACE/CLICK TO RETURN ]', W / 2, H / 2 + 44); } ctx.restore();
  }
  function drawTransition() {
    const lv = LEVELS[curLevel]; const { r, g, b } = lv.theme;
    const a = Math.min(1, (120 - transTimer) / 60);
    ctx.fillStyle = `rgba(0,0,0,${a * .9})`; ctx.fillRect(0, 0, W, H);
    if (transTimer > 60) {
      ctx.save(); ctx.textAlign = 'center'; ctx.globalAlpha = Math.min(1, (transTimer - 60) / 30);
      ctx.font = 'clamp(10px,2.5vw,20px) "Press Start 2P",cursive'; ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.shadowColor = `rgb(${r},${g},${b})`; ctx.shadowBlur = 28;
      ctx.fillText((curLevel < LEVELS.length ? '>> LEVEL ' + (curLevel + 1) + ' LOADING' : '>> ROOT ACCESS'), W / 2, H / 2 - 20);
      ctx.font = '8px "Fira Code",monospace'; ctx.fillStyle = 'rgba(226,232,240,.7)'; ctx.shadowBlur = 0; ctx.fillText(curLevel < LEVELS.length ? LEVELS[curLevel].name : 'THE ARCHIVES BREACHED', W / 2, H / 2 + 12); ctx.restore();
    }
  }
  function drawWin() {
    ctx.fillStyle = '#020A14'; ctx.fillRect(0, 0, W, H); 
    drawMatrix('0,255,136');
    ctx.fillStyle = 'rgba(0,10,0,0.85)'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.textAlign = 'center';
    ctx.font = 'clamp(10px,2.5vw,20px) "Press Start 2P",cursive'; ctx.fillStyle = '#00FF88'; ctx.shadowColor = '#00FF88'; ctx.shadowBlur = 40; ctx.fillText('ROOT ACCESS GRANTED', W / 2, H / 2 - 70);
    ctx.font = '7px "Press Start 2P",cursive'; ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 18; ctx.fillText('SYSTEM OVERRIDE COMPLETE', W / 2, H / 2 - 35);

    // Stats
    ctx.font = '10px "Fira Code",monospace'; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.shadowBlur = 0;
    ctx.fillText(`TIME ELAPSED: ${Math.floor(frame / 60)}s`, W / 2, H / 2 + 15);
    ctx.fillText(`DAMAGE TAKEN: ${totalDamageTaken}`, W / 2, H / 2 + 30);
    ctx.fillText(`VIRTUAL DISTANCE: ${Math.floor(camX / 10)}m`, W / 2, H / 2 + 45);

    if (pImg.complete && pImg.naturalWidth > 0) { const fy = H / 2 - 10 + Math.sin(Date.now() * .001) * 6; ctx.restore(); ctx.save(); ctx.shadowColor = 'rgba(0,255,136,.8)'; ctx.shadowBlur = 50; ctx.drawImage(pImg, W / 2 - 70, fy - 10, 32, 32); ctx.drawImage(pImg, W / 2 + 38, fy - 10, 32, 32); }
    ctx.restore(); ctx.save(); ctx.textAlign = 'center';
    ctx.font = '7px "Fira Code",monospace'; ctx.fillStyle = 'rgba(0,255,136,.6)'; ctx.fillText('>> PORTFOLIO UNLOCKED. SAGAR.P v2.0 ONLINE.', W / 2, H / 2 + 75);
    if (Math.sin(Date.now() * .003) > 0) { ctx.font = '8px "Press Start 2P",cursive'; ctx.fillStyle = 'rgba(226,232,240,.8)'; ctx.fillText('[ SPACE/CLICK TO REPLAY ]', W / 2, H / 2 + 95); } ctx.restore();
  }

  // ─────────────────────────────────────────────
  // UPDATE — ENDLESS
  // ─────────────────────────────────────────────
  function updateEndless() {
    frame++; score += comboMult * .4;
    // Checkpoints
    if (score - lastCpScore > 1500) {
      checkpoints++; lastCpScore = score;
      storyMsg = `>> CHECKPOINT ${checkpoints} REACHED: SECTOR UPDATED`;
      storyMsgTimer = 180;
      playSound('cp');
      spawnRate = Math.max(50, spawnRate - 12); // gradual scaling
      comboMult = Math.min(10, comboMult + 1);
    }
    if (storyMsgTimer > 0) storyMsgTimer--;

    if (score > hiScore) { hiScore = score; localStorage.setItem('czHi', Math.floor(hiScore)); }
    if (frame % 400 === 0) spawnRate = Math.max(55, spawnRate - 4);
    if (comboTimer > 0) comboTimer--; else if (combo > 0) { combo = 0; comboMult = 1; }
    // Physics
    P.vy += .45; P.y += P.vy;
    P.vy = Math.min(P.vy, 10)
    if (P.y >= GND - P.h) { P.y = GND - P.h; P.vy = 0; P.ground = true; P.jumps = 0; }
    if (P.inv > 0) P.inv--;
    // Shoot
    P.shootT++; if (P.shootT >= P.shootCD) { shoot(); P.shootT = 0; }
    // Spawn
    spawnT++; if (spawnT >= spawnRate) { spawnEnemy(); spawnT = 0; }
    if (frame % 400 === 0) spawnPowerup();
    // Bullets
    bullets.forEach(b => { b.x += b.speed; if (b.x > W + 30) b.active = false; }); bullets = bullets.filter(b => b.active);
    // Enemies
    enemies.forEach(e => {
      e.x -= e.speed;
      if (e.type === 'drone') e.y = GND - e.h - 60 - Math.abs(Math.sin(frame * .035 + e.phase)) * 55;
      if (e.flash > 0) e.flash--;
    });
    // Powerups
    powerups.forEach(p => { p.x -= p.speed; }); powerups = powerups.filter(p => !p.dead && p.x > -50);
    // Bullet-enemy
    bullets.forEach(b => {
      enemies.forEach(e => {
        if (!b.active || e.dead || e.type === 'spike') return;
        if (b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + 5 > e.y) {
          b.active = false; e.hp--; e.flash = 8; particles.push(...burst(e.x + e.w / 2, e.y + e.h / 2, e.type === 'drone' ? '#EC4899' : '#FF4500'));
          if (e.hp <= 0) { e.dead = true; combo++; comboTimer = 120; comboMult = Math.min(8, 1 + Math.floor(combo / 3)); score += 100 * comboMult; particles.push(...burst(e.x + e.w / 2, e.y + e.h / 2, '#FFD700', 14)); }
        }
      });
    });
    // Powerup collect
    powerups.forEach(p => {
      const py = p.y + Math.sin(p.bob) * 6;
      if (P.x < p.x + p.w && P.x + P.w > p.x && P.y < py + p.h && P.y + P.h > py) {
        p.dead = true;
        if (p.type === 'shield') { shields = 1; particles.push(...burst(P.x + P.w / 2, P.y + P.h / 2, '#00D4FF', 10)); }
        if (p.type === 'rapid') { P.shootCD = 10; setTimeout(() => P.shootCD = 22, 5000); particles.push(...burst(P.x + P.w / 2, P.y + P.h / 2, '#FF8C00', 10)); }
        if (p.type === 'score') { score += 500 * comboMult; particles.push(...burst(P.x + P.w / 2, P.y + P.h / 2, '#FFD700', 16)); }
      }
    });
    // Player-enemy
    if (P.inv === 0) {
      enemies.forEach(e => {
        if (e.dead) return;
        if (e.x < P.x + P.w - 10 && e.x + e.w > P.x + 10 && e.y < P.y + P.h - 10 && e.y + e.h > P.y + 10) {
          e.dead = true;
          if (shields > 0) { shields = 0; P.inv = 30; particles.push(...burst(P.x + P.w / 2, P.y + P.h / 2, '#00D4FF', 14)); }
          else { health--; totalDamageTaken++; P.inv = 65; particles.push(...burst(P.x + P.w / 2, P.y + P.h / 2, '#FF0040', 18)); combo = 0; comboMult = 1; comboTimer = 0; if (health <= 0) state = 'gameover'; }
        }
      });
    }
    enemies = enemies.filter(e => !e.dead && e.x > -80);
    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .14; p.life -= p.decay; }); particles = particles.filter(p => p.life > 0);
  }

  // ─────────────────────────────────────────────
  // UPDATE — STORY
  // ─────────────────────────────────────────────
  function updateStory() {
    const lv = LEVELS[curLevel]; frame++;
    if (storyMsgTimer > 0) storyMsgTimer--;

    // Horizontal Movement
    if (keys.Left) P.vx -= 0.8;
    else if (keys.Right) P.vx += 0.8;
    else P.vx *= 0.8;
    P.vx = Math.max(-P.speed, Math.min(P.speed, P.vx));

    let virtualX = camX + P.x + P.vx;
    virtualX = Math.max(0, Math.min(virtualX, lv.worldW - P.w));

    // Update camera smoothly
    if (virtualX - camX > W * 0.6) {
      camX = virtualX - W * 0.6;
    } else if (virtualX - camX < W * 0.2) {
      camX = virtualX - W * 0.2;
    }
    camX = Math.max(0, Math.min(camX, lv.worldW - W));
    P.x = virtualX - camX;

    // Ladder Physics
    let onLadder = false;
    ladders.forEach(l => {
      let lx = l.x - camX;
      if (P.x + P.w / 2 > lx && P.x + P.w / 2 < lx + l.w && P.y + P.h >= l.y && P.y <= l.y + l.h) {
        onLadder = true;
      }
    });

    if (onLadder) {
      if (keys.Up) { P.vy = -3; P.isClimbing = true; P.ground = false; }
      else if (keys.Down) { P.vy = 3; P.isClimbing = true; P.ground = false; }
      else if (P.isClimbing) P.vy = 0;
    } else {
      P.isClimbing = false;
      P.vy += 0.45; // gravity
      P.vy = Math.min(P.vy, 10)
    }

    P.y += P.vy;

    // Ground collision
    if (P.y >= GND - P.h) { P.y = GND - P.h; P.vy = 0; P.ground = true; P.jumps = 0; }
    // Moving platforms processing
    platforms.forEach(pt => {
      if (pt.type === 'moving') {
        const preY = pt.y;
        pt.y = pt.startY + Math.sin(frame * 0.03 + pt.phase) * 40;
        pt.x = pt.startX + Math.sin(frame * 0.02 + pt.phase) * 100;
        const dy = pt.y - preY;
        const ptx = pt.x - camX;
        // If player is stood on this specifically
        if (P.ground && P.x + P.w > ptx + 5 && P.x < ptx + pt.w - 5 && Math.abs(P.y + P.h - preY) < 6) {
          P.y += dy;
        }
      } else if (pt.type === 'lava') {
        const ptx = pt.x - camX;
        if (P.x + P.w > ptx + 5 && P.x < ptx + pt.w - 5 && P.y < pt.y + 12 && P.y + P.h > pt.y && P.inv === 0) {
          levelHP--; totalDamageTaken++; P.inv = 50; shake = 15; playSound('hit'); particles.push(...burst(P.x + P.w / 2, P.y + P.h / 2, '#FF4500', 20));
          if (levelHP <= 0) state = 'gameover';
          // Bounce off lava
          P.vy = -12; P.ground = false; P.jumps = 1; P.isClimbing = false;
        }
      } else if (pt.type === 'fall') {
        const ptx = pt.x - camX;
        // if player standing on it
        if (P.ground && P.x + P.w > ptx + 5 && P.x < ptx + pt.w - 5 && Math.abs(P.y + P.h - pt.y) < 6) {
          pt.fallWait--;
          if (pt.fallWait <= 0) { pt.y += 8; P.ground = false; }
        } else {
          // Slowly recover original position if player leaves early
          if (pt.y < H + 100 && pt.fallWait > 0) pt.fallWait = 30;
        }
        if (pt.y > pt.startY && pt.fallWait > 0 && P.y + P.h < pt.y) { pt.y = Math.max(pt.startY, pt.y - 2); }
      }
    });
    // Platform collision
    platforms.forEach(pt => {
      const ptx = pt.x - camX;
      if (pt.type === 'lava') return; // Lava doesn't act as solid ground to stand on
      if (keys.Down && !P.ground && P.y + P.h < pt.y + 12) return; // Drop through platforms
      if (P.x + P.w > ptx + 5 && P.x < ptx + pt.w - 5 && P.y + P.h >= pt.y && P.y + P.h <= pt.y + 15 && P.vy >= 0) {
        P.y = pt.y - P.h; P.vy = 0; P.ground = true; P.jumps = 0; P.isClimbing = false;
      }
    });

    // Pit death (fell below world)
    if (P.y > H + 40) { levelHP--; totalDamageTaken++; P.x = 80; P.y = GND - P.h; P.vy = 0; P.vx = 0; P.jumps = 0; if (levelHP <= 0) { state = 'gameover'; return; } }
    if (P.inv > 0) P.inv--;
    // Enemies
    spawnT++; if (spawnT >= spawnRate) { spawnStoryEnemy(); spawnT = 0; }
    bullets.forEach(b => { b.x += b.speed; }); bullets = bullets.filter(b => b.x < camX + W + 40);
    P.shootT++; if (P.shootT >= P.shootCD) { const sb = { x: P.x + P.w, y: P.y + P.h / 2 - 3, w: 20, h: 5, speed: 14, active: true, color: lv.collectColor }; bullets.push(sb); P.shootT = 0; }
    // Story enemies update
    enemies.forEach(e => {
      if (e.type === 'swarm') {
         e.phase += 0.05; 
         e.x = e.startX - camX + Math.sin(e.phase)*60;
         e.y = e.startY + Math.cos(e.phase*1.5)*30;
      } else {
         e.x -= e.speed;
      }
      if (e.type === 'drone') e.y = GND - e.h - 60 - Math.abs(Math.sin(frame * .035 + e.phase)) * 50;
      if (e.flash > 0) e.flash--;
    });
    // Laser tripwires (level 3)
    if (curLevel === 2 && frame % 90 === 0 && collectibles.length === 0) {
      // create short-lived laser particle line
      for (let i = 0; i < H / 16; i++) { particles.push({ x: camX + W * .6, y: i * 16, vx: 0, vy: 0, life: 1, decay: .08, color: 'rgba(255,0,0,.8)', r: 2 }); }
    }
    // Bullet-enemy
    bullets.forEach(b => {
      enemies.forEach(e => {
        if (e.dead || e.type === 'spike') return; const ex = e.x;
        if (b.x < ex + e.w && b.x + b.w > ex && b.y < e.y + e.h && b.y + 5 > e.y) {
          b.active = false; e.hp--; e.flash = 8; particles.push(...burst(ex + e.w / 2, e.y + e.h / 2, '#A855F7', 6));
          if (e.hp <= 0) { e.dead = true; particles.push(...burst(ex + e.w / 2, e.y + e.h / 2, lv.collectColor, 10)); }
        }
      });
    });
    bullets = bullets.filter(b => b.active);
    
    // Boss trigger (level 3 end)
    if (curLevel === 2 && camX > 2500 && !boss) {
      spawnBoss(); playSound('cp');
    }

    // Boss update (level 3)
    if (boss && !boss.dead) {
      boss.phase += .02; boss.y = GND - boss.h - Math.abs(Math.sin(boss.phase)) * 30;
      boss.x = camX + W - 100 + Math.sin(frame * 0.05) * 40;
      if (boss.flash > 0) boss.flash--;
      // Bullet-boss
      bullets.forEach(b => { const bx2 = boss.x - camX; if (b.x < bx2 + boss.w && b.x + boss.w > bx2 && b.y < boss.y + boss.h && b.y + 5 > boss.y) { b.active = false; boss.hp--; boss.flash = 8; particles.push(...burst(bx2 + boss.w / 2, boss.y + boss.h / 2, '#FF4500', 8)); if (boss.hp <= 0) { boss.dead = true; storyMsg = '>> SENTRY NEUTRALIZED! CORE BREACH IMMINENT...'; storyMsgTimer = 180; state = 'boss_death'; transTimer = 180; playSound('cp'); particles.push(...burst(bx2 + boss.w / 2, boss.y + boss.h / 2, '#FFD700', 40)); } } });
      // Boss-player
      if (P.inv === 0) { const bx2 = boss.x - camX; if (bx2 < P.x + P.w - 8 && bx2 + boss.w > P.x + 8 && boss.y < P.y + P.h - 8 && boss.y + boss.h > P.y + 8) { levelHP--; totalDamageTaken++; P.inv = 80; shake = 10; playSound('hit'); particles.push(...burst(P.x + P.w / 2, P.y + P.h / 2, '#FF0040', 14)); if (levelHP <= 0) { state = 'gameover'; return; } } }
    }
    // Player-enemy
    if (P.inv === 0) {
      enemies.forEach(e => {
        if (e.dead) return; 
        const ex = e.x; const ey = e.y;
        if (ex < P.x + P.w - 8 && ex + e.w > P.x + 8 && ey < P.y + P.h - 8 && ey + e.h > P.y + 8) {
          e.dead = true; levelHP--; totalDamageTaken++; P.inv = 70; shake = 10; playSound('hit'); particles.push(...burst(P.x + P.w / 2, P.y + P.h / 2, '#FF0040', 14)); if (levelHP <= 0) { state = 'gameover'; return; }
        }
      });
    }
    enemies = enemies.filter(e => !e.dead && (e.type==='swarm' || e.x > camX - 80));
    // Collectibles
    if (lv.collectType !== 'reach') {
      collectibles.forEach(c => {
        if (c.collected) return; const cx = c.x - camX; const cy = c.y + Math.sin(c.bob) * 5;
        if (cx < P.x + P.w && cx + c.w > P.x && cy < P.y + P.h && cy + c.h > P.y) {
          c.collected = true; particles.push(...burst(P.x + P.w / 2, P.y, lv.collectColor, 14));
          const got = collectibles.filter(c => c.collected).length;
          storyMsg = `>> ${lv.collectIcon} COLLECTED! (${got}/${lv.collectCount})`; storyMsgTimer = 140;
        }
      });
    }
    // Win check
    const allCollected = lv.collectType === 'reach' || (collectibles.filter(c => c.collected).length >= lv.collectCount);
    const atGoal = P.x + camX >= lv.goal;
    if (atGoal) {
      if (allCollected) {
        state = 'level_clear'; transTimer = 100; P.inv = 9999;
      } else {
        P.x = lv.goal - camX - P.w - 10;
        P.vx = -4; 
        storyMsg = '>> ACCESS DENIED: GATHER ALL ITEMS!'; storyMsgTimer = 120;
      }
    }
    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .1; p.life -= p.decay; }); particles = particles.filter(p => p.life > 0);
  }

  function spawnStoryEnemy() {
    const lv = LEVELS[curLevel];
    const types = curLevel === 0 ? ['cube', 'spike'] : curLevel === 1 ? ['drone', 'glitch'] : ['cube', 'drone', 'spike'];
    const t = types[Math.floor(Math.random() * types.length)];
    const h = t === 'spike' ? 50 : t === 'drone' ? 30 : 40;
    const airY = t === 'drone' ? GND - h - 55 - Math.random() * 50 : GND - h;
    const spd = curLevel === 2 ? 2.4 : curLevel === 1 ? 2.0 : 1.7;
    enemies.push({ x: W + 40, y: airY, w: 34, h, vy: 0, speed: spd, type: t, hp: 1, phase: Math.random() * Math.PI * 2, dead: false, flash: 0 });
  }

  function advanceLevel() {
    const next = curLevel + 1;
    if (next > maxUnlockedLevel) {
      maxUnlockedLevel = next;
      localStorage.setItem('czLevel', maxUnlockedLevel);
    }
    if (next >= LEVELS.length) { state = 'win'; return; }
    state = 'transition'; transTimer = 120; curLevel = next;
    setTimeout(() => { initLevel(); state = 'playing'; }, 2000);
  }

  // ─────────────────────────────────────────────
  // GAME LOOP
  // ─────────────────────────────────────────────
  function gameLoop() {
    if (!isPaused) {
      // Update
      if (state === 'playing') {
        if (gameMode === 'endless') updateEndless();
        else updateStory();
      }
      if (state === 'transition') { transTimer--; }
      if (state === 'level_clear') {
        transTimer--;
        P.vx += 0.8; P.x += P.vx; 
        P.y += Math.sin(frame*0.5)*2; 
        particles.push(...burst(P.x, P.y+P.h/2, '#00FF88', 2));
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .1; p.life -= p.decay; }); particles = particles.filter(p => p.life > 0);
        if (transTimer <= 0) { advanceLevel(); }
      }
      if (state === 'boss_death') { 
        transTimer--; 
        if (transTimer % 8 === 0) { shake = 15; playSound('hit'); particles.push(...burst(boss.x - camX + Math.random()*boss.w, boss.y + Math.random()*boss.h, '#FFD700', 10)); }
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .1; p.life -= p.decay; }); particles = particles.filter(p => p.life > 0);
        if (transTimer <= 0) { state = 'win'; }
      }
    }

    ctx.save();
    if (shake > 0) { ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake); if (!isPaused) shake--; }

    // Draw
    if (state === 'title') { drawStars(); drawTitle(); }
    else if (state === 'gameover') { ctx.fillStyle = '#020A14'; ctx.fillRect(0, 0, W, H); drawStars(); drawGameOver(); }
    else if (state === 'win') { drawWin(); }
    else if (state === 'transition') { ctx.fillStyle = '#020A14'; ctx.fillRect(0, 0, W, H); drawStars(); drawTransition(); }
    else if (state === 'level_clear') {
      LEVELS[curLevel].bg(frame); drawScanline();
      drawPlatforms(); drawGoal(); drawCollectibles();
      drawParticles();
      ctx.save(); ctx.shadowColor = '#00FF88'; ctx.shadowBlur = 40; drawPlayer(); ctx.restore();
      drawStoryHUD();
      const a = Math.min(1, Math.max(0, (100-transTimer)/20));
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center';
      ctx.font = 'clamp(10px,2.5vw,20px) "Press Start 2P",cursive'; ctx.fillStyle = '#00FF88'; ctx.shadowColor = '#00FF88'; ctx.shadowBlur = 20;
      ctx.fillText('SECTOR CLEARED', W/2, H/2-20); ctx.restore();
    }
    else if (state === 'boss_death') {
      LEVELS[curLevel].bg(frame); drawScanline();
      drawPlatforms(); drawGoal(); drawCollectibles();
      drawParticles();
      boss.flash = 2; drawBoss();
      ctx.save(); ctx.shadowColor = '#FFF'; ctx.shadowBlur = 40; drawPlayer(); ctx.restore();
      drawStoryHUD();
      if (transTimer < 60 && Math.random() < 0.6) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(Math.random()*W, Math.random()*H, Math.random()*W, Math.random()*H*0.2);
        ctx.fillStyle = 'rgba(0,255,136,0.3)'; ctx.fillRect(Math.random()*W, Math.random()*H, W, Math.random()*20);
      }
      if (transTimer < 15) { ctx.fillStyle = `rgba(255,255,255,${(15-transTimer)/15})`; ctx.fillRect(0,0,W,H); }
    }
    else if (state === 'playing') {
      // playing
      if (gameMode === 'endless') {
        if (checkpoints % 3 === 0) {
          ctx.fillStyle = '#020A14'; ctx.fillRect(0, 0, W, H); drawStars();
          for (let y = 0; y < H; y += 3) { ctx.fillStyle = 'rgba(0,0,0,.025)'; ctx.fillRect(0, y, W, 1); }
          drawMatrix(); drawGround();
        } else if (checkpoints % 3 === 1) { drawLvl2BG(frame); }
        else { drawLvl3BG(frame); }
        drawScanline(); drawParticles(); drawPowerups(); drawBullets();
        enemies.forEach(drawEnemy); drawPlayer(); drawHUD();
      } else {
        LEVELS[curLevel].bg(frame); drawScanline();
        drawPlatforms(); drawGoal(); drawCollectibles();
        drawParticles(); drawBullets(); enemies.forEach(drawEnemy);
        if (curLevel === 2) drawBoss(); drawPlayer(); drawStoryHUD();
      }
    }
    // Red flash on damage
    if (state === 'playing' && P.inv > 0 && Math.floor(P.inv / 5) % 2 === 0) {
      ctx.fillStyle = 'rgba(220,38,38,0.2)'; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
    requestAnimationFrame(gameLoop);
  }

  // ─────────────────────────────────────────────
  // MODE BUTTONS (overlay on canvas area)
  // ─────────────────────────────────────────────
  function setupModeButtons() {
    const wrap = document.getElementById('gmodebtns'); if (!wrap) return;
    wrap.innerHTML = '';
    ['ENDLESS MODE', 'STORY MODE'].forEach((label, i) => {
      const b = document.createElement('button'); b.className = 'gmbtn' + (gameMode === (i === 0 ? 'endless' : 'story') ? ' gmact' : '');
      b.textContent = i === 0 ? '⟳ ENDLESS' : (maxUnlockedLevel > 0 ? `📖 STORY (Lv ${Math.min(maxUnlockedLevel + 1, 3)})` : '📖 STORY');
      b.onclick = () => {
        gameMode = i === 0 ? 'endless' : 'story';
        if (i === 1) curLevel = Math.min(maxUnlockedLevel, LEVELS.length - 1);
        const isM = gameMode === 'story';
        document.getElementById('mobileControls').style.display = controlsOn ? 'flex' : 'none';
        document.getElementById('mcUp').style.display = isM ? 'block' : 'none';
        document.getElementById('mcDown').style.display = isM ? 'block' : 'none';
        document.getElementById('mcLeft').style.display = isM ? 'block' : 'none';
        document.getElementById('mcRight').style.display = isM ? 'block' : 'none';
        state = 'title'; setupModeButtons();
      };
      wrap.appendChild(b);
    });
  }
  setupModeButtons();

  // ─────────────────────────────────────────────
  // DOM BUTTON EVENTS
  // ─────────────────────────────────────────────
  const btnControls = document.getElementById('btnControls');
  if (btnControls) btnControls.onclick = function () {
    controlsOn = !controlsOn;
    this.textContent = controlsOn ? '🎮 CTRL: ON' : '🎮 CTRL: OFF';
    const mc = document.getElementById('mobileControls');
    if (mc) mc.style.display = controlsOn ? 'flex' : 'none';
  };

  const btnSound = document.getElementById('btnSound');
  if (btnSound) btnSound.onclick = function () {
    soundOn = !soundOn; this.textContent = soundOn ? '🔊 ON' : '🔊 OFF';
    if (soundOn) { initAudio(); startBGM(); } else { stopBGM(); }
  };
  const btnPause = document.getElementById('btnPause'); if (btnPause) btnPause.onclick = togglePause;
  const btnResume = document.getElementById('btnResume'); if (btnResume) btnResume.onclick = togglePause;
  const btnRestart = document.getElementById('btnRestart'); if (btnRestart) btnRestart.onclick = () => { togglePause(); state = 'title'; };

  function setupMobile() {
    const ml = document.getElementById('mcLeft');
    const mr = document.getElementById('mcRight');
    const mU = document.getElementById('mcUp');
    const mD = document.getElementById('mcDown');
    const mJ = document.getElementById('mcJump');
    const setK = (k, v) => { keys[k] = v; };
    if (ml) { ml.onpointerdown = (e) => { e.preventDefault(); setK('Left', true); }; ml.onpointerup = (e) => { e.preventDefault(); setK('Left', false); }; ml.onpointerleave = (e) => { setK('Left', false); }; }
    if (mr) { mr.onpointerdown = (e) => { e.preventDefault(); setK('Right', true); }; mr.onpointerup = (e) => { e.preventDefault(); setK('Right', false); }; mr.onpointerleave = (e) => { setK('Right', false); }; }
    if (mU) { mU.onpointerdown = (e) => { e.preventDefault(); setK('Up', true); }; mU.onpointerup = (e) => { e.preventDefault(); setK('Up', false); }; mU.onpointerleave = (e) => { setK('Up', false); }; }
    if (mD) { mD.onpointerdown = (e) => { e.preventDefault(); setK('Down', true); }; mD.onpointerup = (e) => { e.preventDefault(); setK('Down', false); }; mD.onpointerleave = (e) => { setK('Down', false); }; }
    if (mJ) { mJ.onpointerdown = (e) => { e.preventDefault(); setK('Jump', true); if (state !== 'playing') { initAudio(); state = 'playing'; resetGame(); } else jump(); }; mJ.onpointerup = (e) => { e.preventDefault(); setK('Jump', false); }; mJ.onpointerleave = (e) => { setK('Jump', false); }; }
  }
  setupMobile();
  gameLoop();
})();
