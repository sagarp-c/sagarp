// ═══════════════ CZERNODE: CORE BREACH v2.0 ═══════════════
(function () {
  const canvas = document.getElementById('gc');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const GND = H - 75;

  // Assets
  const pImg = new Image(); pImg.src = 'czernode.png';

  // State
  let state = 'title', score = 0, hiScore = +(localStorage.getItem('czHi') || 0), health = 3, maxHealth = 3;
  let frame = 0, spawnRate = 110, spawnT = 0, combo = 0, comboTimer = 0, comboMult = 1;
  let powerups = [], shields = 0;

  // Player
  const P = { x: 80, y: GND - 70, w: 70, h: 70, vy: 0, ground: true, shootT: 0, shootCD: 20, inv: 0, scale: 1 };
  let enemies = [], bullets = [], particles = [];

  // Parallax layers
  const stars = Array.from({ length: 80 }, () => ({ x: Math.random() * W, y: Math.random() * H * .8, r: .5 + Math.random() * 1.5, s: .2 + Math.random() * .6, br: Math.random() }));
  const midObjs = Array.from({ length: 12 }, () => ({ x: Math.random() * W, y: GND - 20 - Math.random() * 60, w: 8 + Math.random() * 20, h: 3, s: .6 + Math.random() * .4, a: Math.random() * .15 + .05 }));

  // Matrix rain for bg
  const MAT = Array.from({ length: Math.floor(W / 18) }, (_, i) => ({ x: i * 18, y: Math.random() * H * 2, s: 1 + Math.random() * 2 }));

  function jump() { if (P.ground) { P.vy = -16.5; P.ground = false; particles.push(...burst(P.x + P.w / 2, P.y + P.h, 'rgba(124,58,237,.7)', 6)); } }
  function reset() {
    score = 0; health = 3; maxHealth = 3; frame = 0; spawnRate = 110; spawnT = 0; combo = 0; comboTimer = 0; comboMult = 1; shields = 0;
    enemies = []; bullets = []; particles = []; powerups = [];
    P.y = GND - P.h; P.vy = 0; P.ground = true; P.inv = 0; P.scale = 1;
  }

  // Controls
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      if (state === 'title') { state = 'playing'; reset(); }
      else if (state === 'playing') { jump(); }
      else if (state === 'gameover') { state = 'playing'; reset(); }
    }
    if (e.code === 'KeyR' && state === 'gameover') { state = 'playing'; reset(); }
  });
  canvas.addEventListener('click', () => {
    if (state === 'title') { state = 'playing'; reset(); }
    else if (state === 'playing') { jump(); }
    else if (state === 'gameover') { state = 'playing'; reset(); }
  });
  // Mobile touch
  let touchStartX = 0;
  canvas.addEventListener('touchstart', e => {
    e.preventDefault(); touchStartX = e.touches[0].clientX;
    if (state === 'title') { state = 'playing'; reset(); }
    else if (state === 'gameover') { state = 'playing'; reset(); }
    else jump();
  }, { passive: false });

  function burst(x, y, color, n = 8) {
    return Array.from({ length: n }, () => ({ x, y, vx: (Math.random() - .5) * 9, vy: (Math.random() - .5) * 9, life: 1, decay: .04, color, r: 2 + Math.random() * 4 }));
  }

  function spawnEnemy() {
    const types = ['cube', 'drone', 'spike', 'glitch'];
    const t = types[Math.floor(Math.random() * types.length)];
    const h = t === 'spike' ? 55 : t === 'drone' ? 32 : 42;
    const airY = t === 'drone' ? GND - h - 50 - Math.random() * 80 : GND - h;
    const spd = 2.8 + score * .00035 + frame * .0002;
    enemies.push({ x: W + 30, y: airY, w: 36, h, vy: 0, speed: spd, type: t, hp: t === 'glitch' ? 3 : t === 'drone' ? 2 : 1, phase: Math.random() * Math.PI * 2, dead: false, flash: 0 });
  }

  function spawnPowerup() {
    const types = ['shield', 'rapid', 'score'];
    const t = types[Math.floor(Math.random() * 3)];
    powerups.push({ x: W + 20, y: GND - 40 - Math.random() * 80, type: t, w: 28, h: 28, speed: 2.2, bob: Math.random() * Math.PI * 2, dead: false });
  }

  function shoot() {
    const rapid = P.shootCD < 12;
    bullets.push({ x: P.x + P.w, y: P.y + P.h / 2 - 4, w: rapid ? 28 : 20, h: rapid ? 5 : 5, speed: 13, active: true, color: rapid ? '#FF8C00' : '#00D4FF' });
  }

  function drawStars() {
    stars.forEach(s => {
      s.br += .005; const a = (.4 + Math.sin(s.br) * .3) * s.s;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,220,255,${a})`; ctx.fill();
    });
  }

  function drawMatrix() {
    ctx.font = '12px "Fira Code",monospace';
    MAT.forEach(col => {
      col.y += col.s * .5; if (col.y > H * 2) col.y = -40;
      for (let i = 0; i < 6; i++) {
        const a = (6 - i) / 6 * .12;
        ctx.fillStyle = `rgba(0,212,255,${a})`;
        ctx.fillText(Math.random() < .5 ? '1' : '0', col.x, col.y - i * 16);
      }
    });
  }

  function drawGround() {
    // Ground gradient
    const g = ctx.createLinearGradient(0, GND, 0, H);
    g.addColorStop(0, 'rgba(10,10,30,.95)'); g.addColorStop(1, 'rgba(4,4,14,1)');
    ctx.fillStyle = g; ctx.fillRect(0, GND, W, H - GND);
    // Grid on ground
    ctx.strokeStyle = 'rgba(124,58,237,.07)'; ctx.lineWidth = 1;
    for (let x = (-frame * .8) % 40; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, GND); ctx.lineTo(x, H); ctx.stroke(); }
    // Glow line
    ctx.save(); ctx.shadowColor = '#7C3AED'; ctx.shadowBlur = 14;
    ctx.strokeStyle = 'rgba(124,58,237,.75)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, GND); ctx.lineTo(W, GND); ctx.stroke(); ctx.restore();
    // Scanline
    const scanY = (frame * 1.2) % H;
    const sg = ctx.createLinearGradient(0, scanY - 2, 0, scanY + 2);
    sg.addColorStop(0, 'transparent'); sg.addColorStop(.5, 'rgba(0,212,255,.06)'); sg.addColorStop(1, 'transparent');
    ctx.fillStyle = sg; ctx.fillRect(0, scanY - 2, W, 4);
  }

  function drawPlayer() {
    if (P.inv > 0 && Math.floor(P.inv / 5) % 2 === 0) return;
    ctx.save();
    ctx.shadowColor = 'rgba(124,58,237,.6)'; ctx.shadowBlur = 20;
    if (pImg.complete && pImg.naturalWidth > 0) {
      // Squash/stretch
      const sy = P.ground ? 1 : 1 + (P.vy * -.012);
      const sx = P.ground ? 1 : 1 + (P.vy * .006);
      ctx.translate(P.x + P.w / 2, P.y + P.h / 2); ctx.scale(sx * P.scale, sy * P.scale);
      ctx.drawImage(pImg, -P.w / 2, -P.h / 2, P.w, P.h);
    } else {
      ctx.fillStyle = '#7C3AED'; ctx.fillRect(P.x, P.y, P.w, P.h);
      ctx.fillStyle = '#fff'; ctx.font = '10px Fira Code'; ctx.fillText('CZ', P.x + 22, P.y + 38);
    }
    ctx.restore();
    // Shield ring
    if (shields > 0) {
      ctx.save(); ctx.strokeStyle = 'rgba(0,212,255,.5)'; ctx.lineWidth = 2; ctx.shadowColor = '#00D4FF'; ctx.shadowBlur = 15;
      ctx.beginPath(); ctx.arc(P.x + P.w / 2, P.y + P.h / 2, P.w * .7, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
  }

  function drawEnemy(e) {
    if (e.dead) return;
    ctx.save();
    const fl = e.flash > 0;
    if (e.type === 'cube') {
      ctx.shadowColor = fl ? '#fff' : '#FF4500'; ctx.shadowBlur = fl ? 30 : 18;
      const g = ctx.createLinearGradient(e.x, e.y, e.x + e.w, e.y + e.h);
      g.addColorStop(0, fl ? '#fff' : '#FF4500'); g.addColorStop(1, fl ? '#fff' : '#FF8C00');
      ctx.fillStyle = g; ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.strokeRect(e.x, e.y, e.w, e.h);
      if (!fl) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.font = '7px Fira Code'; ctx.fillText('ERR', e.x + 3, e.y + 15); ctx.fillText('0x0', e.x + 3, e.y + 26); }
    } else if (e.type === 'drone') {
      ctx.shadowColor = fl ? '#fff' : '#EC4899'; ctx.shadowBlur = fl ? 30 : 22;
      ctx.fillStyle = fl ? '#fff' : '#EC4899';
      ctx.beginPath(); ctx.moveTo(e.x + e.w / 2, e.y); ctx.lineTo(e.x + e.w, e.y + e.h / 2); ctx.lineTo(e.x + e.w / 2, e.y + e.h); ctx.lineTo(e.x, e.y + e.h / 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1; ctx.stroke();
    } else if (e.type === 'spike') {
      ctx.shadowColor = fl ? '#fff' : '#DC2626'; ctx.shadowBlur = fl ? 30 : 18;
      ctx.fillStyle = fl ? '#fff' : '#DC2626';
      ctx.beginPath(); ctx.moveTo(e.x, e.y + e.h); ctx.lineTo(e.x + e.w / 2, e.y); ctx.lineTo(e.x + e.w, e.y + e.h); ctx.closePath(); ctx.fill();
    } else {// glitch
      ctx.shadowColor = '#00FF88'; ctx.shadowBlur = fl ? 30 : 20;
      ctx.strokeStyle = fl ? '#fff' : '#00FF88'; ctx.lineWidth = 2;
      ctx.strokeRect(e.x, e.y, e.w, e.h);
      ctx.fillStyle = `rgba(0,255,136,.${fl ? 8 : 2})`; ctx.fillRect(e.x, e.y, e.w, e.h);
      if (!fl) { ctx.fillStyle = '#00FF88'; ctx.font = '7px Fira Code'; ctx.fillText('GLC', e.x + 3, e.y + 18); }
      // Glitch bars
      if (Math.random() < .3) { ctx.fillStyle = 'rgba(0,255,136,.3)'; ctx.fillRect(e.x, e.y + Math.random() * e.h, e.w, 2); }
    }
    ctx.restore();
    // Health pips for multi-hp
    if (e.hp > 1) {
      for (let i = 0; i < e.hp; i++) { ctx.fillStyle = 'rgba(0,255,136,.8)'; ctx.fillRect(e.x + i * 8, e.y - 6, 6, 3); }
    }
  }

  function drawBullets() {
    bullets.forEach(b => {
      if (!b.active) return;
      ctx.save(); ctx.shadowColor = b.color; ctx.shadowBlur = 10;
      const g = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0);
      g.addColorStop(0, 'rgba(0,212,255,.1)'); g.addColorStop(1, b.color);
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 2); ctx.fill(); ctx.restore();
    });
  }

  function drawPowerups() {
    powerups.forEach(p => {
      if (p.dead) return;
      p.bob += .06; const fy = p.y + Math.sin(p.bob) * 6;
      ctx.save();
      const colors = { shield: '#00D4FF', rapid: '#FF8C00', score: '#FFD700' };
      const icons = { shield: '🛡', rapid: '⚡', score: '💎' };
      ctx.shadowColor = colors[p.type]; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.arc(p.x + p.w / 2, fy + p.h / 2, p.w / 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,0,0,.5)`; ctx.fill();
      ctx.strokeStyle = colors[p.type]; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = '14px sans-serif'; ctx.fillText(icons[p.type], p.x + p.w / 2 - 7, fy + p.h / 2 + 6);
      ctx.restore();
    });
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.save(); ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });
  }

  function drawHUD() {
    // Health bar
    const bw = 160, bh = 20;
    ctx.save(); ctx.shadowColor = '#DC2626'; ctx.shadowBlur = 8;
    ctx.strokeStyle = 'rgba(220,38,38,.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(12, 12, bw, bh);
    const hw = (health / maxHealth) * (bw - 4);
    const hg = ctx.createLinearGradient(14, 0, 14 + hw, 0);
    hg.addColorStop(0, '#DC2626'); hg.addColorStop(1, '#FF4500');
    ctx.fillStyle = hg; ctx.fillRect(14, 14, Math.max(0, hw), bh - 4);
    ctx.font = '7px "Press Start 2P",cursive'; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillText('HP', 18, 26);
    ctx.restore();
    // Shield indicator
    if (shields > 0) {
      ctx.fillStyle = '#00D4FF'; ctx.font = '7px "Press Start 2P",cursive';
      ctx.fillText('SHIELD', 12, 44);
    }
    // Score
    ctx.save(); ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 10;
    ctx.font = '15px "Press Start 2P",cursive'; ctx.fillStyle = '#FFD700';
    ctx.fillText(String(Math.floor(score)).padStart(6, '0'), W - 130, 28); ctx.restore();
    // Hi score
    ctx.font = '7px "Fira Code",monospace'; ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.fillText('HI:' + String(Math.floor(hiScore)).padStart(6, '0'), W - 130, 44);
    // Combo
    if (combo > 1) {
      ctx.save();
      const ca = Math.min(1, comboTimer / 60);
      ctx.globalAlpha = ca; ctx.shadowColor = '#FF8C00'; ctx.shadowBlur = 15;
      ctx.font = '12px "Press Start 2P",cursive'; ctx.fillStyle = '#FF8C00';
      ctx.fillText('x' + combo + ' COMBO!', W / 2 - 60, 36); ctx.restore();
    }
    // Speed indicator (subtle)
    ctx.fillStyle = 'rgba(0,212,255,.3)'; ctx.font = '7px "Fira Code",monospace';
    ctx.fillText('SPD:' + (1 + Math.floor(spawnRate / 20)), 12, H - 10);
  }

  function drawTitle() {
    ctx.fillStyle = 'rgba(2,5,18,.92)'; ctx.fillRect(0, 0, W, H);
    drawMatrix();
    for (let y = 0; y < H; y += 4) { ctx.fillStyle = 'rgba(0,0,0,.06)'; ctx.fillRect(0, y, W, 2); }
    ctx.save(); ctx.textAlign = 'center';
    ctx.font = 'clamp(18px,4vw,36px) "Press Start 2P",cursive';
    ctx.fillStyle = '#00D4FF'; ctx.shadowColor = '#00D4FF'; ctx.shadowBlur = 35; ctx.fillText('CZERNODE', W / 2, H / 2 - 95);
    ctx.font = 'clamp(9px,2vw,15px) "Press Start 2P",cursive';
    ctx.fillStyle = '#FF8C00'; ctx.shadowColor = '#FF8C00'; ctx.shadowBlur = 18; ctx.fillText('CORE BREACH v2.0', W / 2, H / 2 - 58);
    if (pImg.complete && pImg.naturalWidth > 0) {
      ctx.restore(); ctx.save();
      const fy = H / 2 - 28 + Math.sin(Date.now() * .0015) * 10;
      ctx.shadowColor = 'rgba(124,58,237,.6)'; ctx.shadowBlur = 40;
      ctx.drawImage(pImg, W / 2 - 50, fy, 100, 100);
    }
    ctx.restore(); ctx.save(); ctx.textAlign = 'center';
    if (Math.sin(Date.now() * .003) > 0) {
      ctx.font = '9px "Press Start 2P",cursive'; ctx.fillStyle = '#E2E8F0'; ctx.shadowBlur = 0;
      ctx.fillText('[ SPACE / CLICK TO BREACH ]', W / 2, H / 2 + 105);
    }
    if (hiScore > 0) {
      ctx.font = '8px "Fira Code",monospace'; ctx.fillStyle = 'rgba(255,215,0,.6)';
      ctx.fillText('HI: ' + Math.floor(hiScore), W / 2, H / 2 + 128);
    }
    ctx.font = '7px "Fira Code",monospace'; ctx.fillStyle = 'rgba(0,212,255,.4)';
    ctx.fillText('JUMP:SPACE/↑/CLICK  SHOOT:AUTO  RESTART:R', W / 2, H - 15); ctx.restore();
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(2,5,18,.88)'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.textAlign = 'center';
    ctx.font = 'clamp(12px,3vw,24px) "Press Start 2P",cursive';
    ctx.fillStyle = '#FF0040'; ctx.shadowColor = '#FF0040'; ctx.shadowBlur = 28; ctx.fillText('SYSTEM BREACH', W / 2, H / 2 - 65);
    ctx.font = 'clamp(8px,2vw,13px) "Press Start 2P",cursive';
    ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 14; ctx.fillText('SCORE: ' + String(Math.floor(score)).padStart(6, '0'), W / 2, -15 + H / 2);
    if (score > hiScore) {
      ctx.fillStyle = '#00FF88'; ctx.shadowColor = '#00FF88'; ctx.font = '8px "Press Start 2P",cursive';
      ctx.fillText('NEW HIGH SCORE! 🎉', W / 2, H / 2 + 15);
    }
    ctx.fillStyle = 'rgba(226,232,240,.5)'; ctx.shadowBlur = 0;
    if (Math.sin(Date.now() * .003) > 0) { ctx.font = '8px "Press Start 2P",cursive'; ctx.fillText('[ R / CLICK TO RESTART ]', W / 2, H / 2 + 46); }
    ctx.restore();
  }

  function update() {
    if (state !== 'playing') return;
    frame++; score += comboMult * .4;
    if (score > hiScore) { hiScore = score; localStorage.setItem('czHi', Math.floor(hiScore)); }
    if (frame % 200 === 0) spawnRate = Math.max(36, spawnRate - 4);
    if (comboTimer > 0) comboTimer--; else if (combo > 0) { combo = 0; comboMult = 1; }

    // Physics
    P.vy += .72; P.y += P.vy;
    if (P.y >= GND - P.h) { P.y = GND - P.h; P.vy = 0; P.ground = true; }
    if (P.inv > 0) P.inv--;

    // Shoot
    P.shootT++; if (P.shootT >= P.shootCD) { shoot(); P.shootT = 0; }

    // Spawn
    spawnT++; if (spawnT >= spawnRate) { spawnEnemy(); spawnT = 0; }
    if (frame % 350 === 0) spawnPowerup();

    // Move bullets
    bullets.forEach(b => { b.x += b.speed; if (b.x > W + 30) b.active = false; });
    bullets = bullets.filter(b => b.active);

    // Move enemies
    enemies.forEach(e => {
      e.x -= e.speed;
      if (e.type === 'drone') e.y = GND - e.h - 50 - Math.abs(Math.sin(frame * .04 + e.phase)) * 70;
      if (e.flash > 0) e.flash--;
    });

    // Move powerups
    powerups.forEach(p => { p.x -= p.speed; });
    powerups = powerups.filter(p => !p.dead && p.x > -50);

    // Bullet-enemy collision
    bullets.forEach(b => {
      enemies.forEach(e => {
        if (!b.active || e.dead) return;
        if (b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + 5 > e.y) {
          b.active = false; e.hp--; e.flash = 8;
          particles.push(...burst(e.x + e.w / 2, e.y + e.h / 2, e.type === 'drone' ? '#EC4899' : '#FF4500'));
          if (e.hp <= 0) {
            e.dead = true; combo++; comboTimer = 120; comboMult = Math.min(8, 1 + Math.floor(combo / 3));
            score += 100 * comboMult;
            particles.push(...burst(e.x + e.w / 2, e.y + e.h / 2, '#FFD700', 14));
          }
        }
      });
    });

    // Player-powerup collision
    powerups.forEach(p => {
      const py = p.y + Math.sin(p.bob) * 6;
      if (P.x < p.x + p.w && P.x + P.w > p.x && P.y < py + p.h && P.y + P.h > py) {
        p.dead = true;
        if (p.type === 'shield') { shields = 1; particles.push(...burst(P.x + P.w / 2, P.y + P.h / 2, '#00D4FF', 10)); }
        if (p.type === 'rapid') { P.shootCD = 10; setTimeout(() => P.shootCD = 20, 5000); particles.push(...burst(P.x + P.w / 2, P.y + P.h / 2, '#FF8C00', 10)); }
        if (p.type === 'score') { score += 500 * comboMult; particles.push(...burst(P.x + P.w / 2, P.y + P.h / 2, '#FFD700', 16)); }
      }
    });

    // Player-enemy collision
    if (P.inv === 0) {
      enemies.forEach(e => {
        if (e.dead) return;
        if (e.x < P.x + P.w - 10 && e.x + e.w > P.x + 10 && e.y < P.y + P.h - 10 && e.y + e.h > P.y + 10) {
          e.dead = true;
          if (shields > 0) { shields = 0; P.inv = 30; particles.push(...burst(P.x + P.w / 2, P.y + P.h / 2, '#00D4FF', 14)); }
          else { health--; P.inv = 65; particles.push(...burst(P.x + P.w / 2, P.y + P.h / 2, '#FF0040', 18)); combo = 0; comboMult = 1; comboTimer = 0; if (health <= 0) { state = 'gameover'; } }
        }
      });
    }

    enemies = enemies.filter(e => !e.dead && e.x > -80);
    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .14; p.life -= p.decay; });
    particles = particles.filter(p => p.life > 0);
  }

  function gameLoop() {
    update();
    ctx.fillStyle = '#020A14'; ctx.fillRect(0, 0, W, H);
    drawStars();
    if (state === 'title') { drawTitle(); }
    else if (state === 'gameover') { drawGameOver(); }
    else {
      for (let y = 0; y < H; y += 3) { ctx.fillStyle = 'rgba(0,0,0,.025)'; ctx.fillRect(0, y, W, 1); }
      drawMatrix(); drawGround(); drawParticles();
      drawPowerups(); drawBullets(); drawEnemies(); drawPlayer(); drawHUD();
    }
    requestAnimationFrame(gameLoop);
  }
  function drawEnemies() { enemies.forEach(drawEnemy); }
  gameLoop();
})();
