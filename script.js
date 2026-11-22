(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);

  const scoreEl = $('score'), lengthEl = $('length'), rankEl = $('rank');
  const leaderboardEl = $('leaderboard'), startScreen = $('startScreen');
  const gameOverEl = $('gameOver'), finalScoreEl = $('finalScore'), hintEl = $('hint');

  // ---------- Sizing ----------
  let W = 0, H = 0, DPR = 1;
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.width = window.innerWidth * DPR;
    H = canvas.height = window.innerHeight * DPR;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
  }
  resize();
  window.addEventListener('resize', resize);

  // ---------- Constants ----------
  const WORLD_R = 1800;
  const FOOD_COUNT = 320;
  const BOT_COUNT = 8;
  const SPACING = 6;
  const HUES = [0, 30, 60, 120, 170, 210, 260, 300, 330];
  const BOT_NAMES = ['Nova', 'Viper', 'Pixel', 'Ghost', 'Venom', 'Comet', 'Rift', 'Blaze', 'Orbit', 'Echo'];

  // ---------- State ----------
  let snakes = [], foods = [], player = null;
  let camera = { x: 0, y: 0, zoom: 1 };
  let view = { x0: 0, y0: 0, x1: 0, y1: 0 };
  let running = false, raf = 0, lastT = 0, lbTimer = 0, gameId = 0;
  const mouse = { x: 0, y: 0, active: false };
  const keys = { left: false, right: false, up: false, down: false };

  // ---------- Helpers ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  function randomPoint(maxR) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * maxR;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  }
  function inView(x, y, m) {
    return x > view.x0 - m && x < view.x1 + m && y > view.y0 - m && y < view.y1 + m;
  }
  function updateView() {
    const w = W / DPR / camera.zoom;
    const h = H / DPR / camera.zoom;
    view.x0 = camera.x - w / 2;
    view.y0 = camera.y - h / 2;
    view.x1 = camera.x + w / 2;
    view.y1 = camera.y + h / 2;
  }

  // ---------- Snake ----------
  class Snake {
    constructor(x, y, hue, isPlayer, name) {
      this.x = x; this.y = y;
      this.angle = Math.random() * Math.PI * 2;
      this.targetAngle = this.angle;
      this.speed = 3.4;
      this.baseRadius = 11;
      this.radius = 11;
      this.trail = [];
      this.segments = 30;
      this.score = 0;
      this.alive = true;
      this.isPlayer = isPlayer;
      this.hue = hue;
      this.name = name;
      for (let i = 0; i < this.segments; i++) {
        this.trail.push({
          x: x - Math.cos(this.angle) * i * SPACING,
          y: y - Math.sin(this.angle) * i * SPACING
        });
      }
    }
    update(dt) {
      if (!this.alive) return;
      let da = this.targetAngle - this.angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      const maxTurn = (this.isPlayer ? 0.1 : 0.06) * dt;
      this.angle += Math.max(-maxTurn, Math.min(maxTurn, da));

      this.x += Math.cos(this.angle) * this.speed * dt;
      this.y += Math.sin(this.angle) * this.speed * dt;

      const head = this.trail[0];
      const dx = this.x - head.x, dy = this.y - head.y;
      if (dx * dx + dy * dy >= SPACING * SPACING) {
        this.trail.unshift({ x: this.x, y: this.y });
      }
      const targetLen = Math.floor(this.segments);
      while (this.trail.length > targetLen) this.trail.pop();

      this.radius = this.baseRadius + Math.min(14, this.score / 150);
    }
  }

  // ---------- Spawning ----------
  function spawnBot() {
    let p, ok = false, tries = 0;
    while (!ok && tries++ < 30) {
      p = randomPoint(WORLD_R * 0.85);
      ok = true;
      if (player && player.alive) {
        const dx = p.x - player.x, dy = p.y - player.y;
        if (dx * dx + dy * dy < 500 * 500) ok = false;
      }
    }
    const hue = HUES[(Math.random() * HUES.length) | 0];
    const usedNames = new Set(snakes.filter(s => s.alive && !s.isPlayer).map(s => s.name));
    const name = BOT_NAMES.find(candidate => !usedNames.has(candidate)) || 'Bot';
    const bot = new Snake(p.x, p.y, hue, false, name);
    bot.segments = rand(20, 55);
    bot.score = (Math.random() * 180) | 0;
    snakes.push(bot);
  }

  function spawnFood() {
    const p = randomPoint(WORLD_R * 0.95);
    foods.push({ x: p.x, y: p.y, r: rand(3, 6), hue: Math.random() * 360 });
  }

  // ---------- AI ----------
  function updateBotAI(bot) {
    if (!bot.alive) return;
    const dC = Math.hypot(bot.x, bot.y);
    if (dC > WORLD_R * 0.85) {
      bot.targetAngle = Math.atan2(-bot.y, -bot.x);
      return;
    }
    let threat = null, threatD2 = 230 * 230;
    for (const s of snakes) {
      if (s === bot || !s.alive) continue;
      for (let i = 2; i < s.trail.length; i += 4) {
        const p = s.trail[i];
        const dx = p.x - bot.x, dy = p.y - bot.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < threatD2) {
          threatD2 = d2;
          threat = p;
        }
      }
    }
    if (threat) {
      bot.targetAngle = Math.atan2(bot.y - threat.y, bot.x - threat.x);
      return;
    }

    // Nearest food
    let bestF = null, bestD = Infinity;
    for (const f of foods) {
      const d = (f.x - bot.x) ** 2 + (f.y - bot.y) ** 2;
      if (d < bestD) { bestD = d; bestF = f; }
    }
    if (bestF && bestD < 520 * 520) {
      bot.targetAngle = Math.atan2(bestF.y - bot.y, bestF.x - bot.x);
    } else {
      bot.targetAngle += rand(-0.12, 0.12);
    }
    // Avoid nearby snakes
    for (const s of snakes) {
      if (s === bot || !s.alive) continue;
      const dx = s.x - bot.x, dy = s.y - bot.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > 400 * 400) continue;
      if (d2 < 180 * 180) {
        const away = Math.atan2(-dy, -dx);
        const diff = Math.atan2(Math.sin(away - bot.angle), Math.cos(away - bot.angle));
        bot.targetAngle += diff * 0.35;
      }
    }
  }

  // ---------- Death ----------
  function killSnake(s) {
    if (!s.alive) return;
    s.alive = false;
    for (let i = 0; i < s.trail.length; i += 4) {
      const p = s.trail[i];
      const a = Math.random() * Math.PI * 2;
      const d = rand(0, 15);
      foods.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, r: rand(4, 7), hue: s.hue });
    }
    if (s.isPlayer) {
      const deathGameId = gameId;
      setTimeout(() => {
        if (deathGameId !== gameId) return;
        running = false;
        cancelAnimationFrame(raf);
        finalScoreEl.textContent = s.score;
        gameOverEl.classList.remove('hidden');
        hintEl.classList.add('hidden');
      }, 700);
    } else {
      const deathGameId = gameId;
      setTimeout(() => {
        if (deathGameId !== gameId || !running) return;
        const idx = snakes.indexOf(s);
        if (idx >= 0) snakes.splice(idx, 1);
        if (running) spawnBot();
      }, 1800);
    }
  }

  // ---------- Update ----------
  function update(dt) {
    // Player steering
    if (player && player.alive) {
      let keyboardAngle = null;
      if (keys.left || keys.right || keys.up || keys.down) {
        keyboardAngle = Math.atan2(
          (keys.down ? 1 : 0) - (keys.up ? 1 : 0),
          (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
        );
      }
      if (keyboardAngle !== null) {
        player.targetAngle = keyboardAngle;
      } else if (mouse.active) {
        const cx = W / DPR / 2, cy = H / DPR / 2;
        const dx = mouse.x - cx, dy = mouse.y - cy;
        if (dx * dx + dy * dy > 16) player.targetAngle = Math.atan2(dy, dx);
      }
    }

    // Snakes
    for (const s of snakes) {
      if (!s.alive) continue;
      if (!s.isPlayer) updateBotAI(s);
      s.update(dt);
    }

    // Wall collisions
    for (const s of snakes) {
      if (!s.alive) continue;
      if (s.x * s.x + s.y * s.y > WORLD_R * WORLD_R) killSnake(s);
    }

    // Snake-snake collisions
    for (const a of snakes) {
      if (!a.alive) continue;
      for (const b of snakes) {
        if (a === b || !b.alive || !a.alive) continue;
        const hx = a.x - b.x, hy = a.y - b.y;
        if (hx * hx + hy * hy > 600 * 600) continue;

        const headDistance2 = hx * hx + hy * hy;
        const headLimit = (a.radius + b.radius) * 0.8;
        if (headDistance2 < headLimit * headLimit) {
          if (a.score <= b.score) killSnake(a);
          if (b.score < a.score) killSnake(b);
          break;
        }

        const rr = a.radius + b.radius * 0.75;
        const rr2 = rr * rr;
        for (let i = 4; i < b.trail.length; i += 2) {
          const p = b.trail[i];
          const dx = a.x - p.x, dy = a.y - p.y;
          if (dx * dx + dy * dy < rr2) { killSnake(a); break; }
        }
        if (!a.alive) break;
      }
    }

    // Food
    for (const s of snakes) {
      if (!s.alive) continue;
      const er = s.radius + 15;
      const er2 = er * er;
      for (let i = foods.length - 1; i >= 0; i--) {
        const f = foods[i];
        const dx = s.x - f.x, dy = s.y - f.y;
        if (dx * dx + dy * dy < er2) {
          foods.splice(i, 1);
          s.score += 5;
          s.segments = Math.min(300, s.segments + 1.5);
        }
      }
    }

    // Replenish
    let guard = 0;
    while (foods.length < FOOD_COUNT && guard++ < 10) spawnFood();

    // Camera
    if (player && player.alive) {
      camera.x += (player.x - camera.x) * 0.12 * dt;
      camera.y += (player.y - camera.y) * 0.12 * dt;
      const tz = Math.max(0.55, 1.1 - player.score / 1500);
      camera.zoom += (tz - camera.zoom) * 0.05 * dt;

      scoreEl.textContent = player.score;
      lengthEl.textContent = Math.floor(player.segments);
    }

    // Leaderboard
    lbTimer += dt;
    if (lbTimer > 10) { lbTimer = 0; updateLeaderboard(); }
  }

  function updateLeaderboard() {
    const sorted = snakes.filter(s => s.alive).sort((a, b) => b.score - a.score);
    const rank = sorted.indexOf(player) + 1;
    rankEl.textContent = rank > 0 ? '#' + rank : '—';
    let html = '';
    for (let i = 0; i < Math.min(5, sorted.length); i++) {
      const s = sorted[i];
      html += `<div class="lb-row${s.isPlayer ? ' me' : ''}">
        <span class="lb-rank">${i + 1}</span>
        <span class="lb-name" style="color:hsl(${s.hue},90%,68%)">${s.isPlayer ? 'YOU' : s.name}</span>
        <span class="lb-score">${s.score}</span>
      </div>`;
    }
    leaderboardEl.innerHTML = html;
  }

  // ---------- Render ----------
  function drawGrid() {
    const g = 100;
    const x0 = Math.floor(view.x0 / g) * g;
    const y0 = Math.floor(view.y0 / g) * g;
    ctx.strokeStyle = 'rgba(120,80,200,0.09)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0; x <= view.x1; x += g) { ctx.moveTo(x, view.y0); ctx.lineTo(x, view.y1); }
    for (let y = y0; y <= view.y1; y += g) { ctx.moveTo(view.x0, y); ctx.lineTo(view.x1, y); }
    ctx.stroke();
  }

  function drawBoundary() {
    ctx.strokeStyle = 'rgba(255,61,189,0.35)';
    ctx.lineWidth = 60;
    ctx.beginPath();
    ctx.arc(0, 0, WORLD_R + 20, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,61,189,0.9)';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#ff3dbd';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(0, 0, WORLD_R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawFoods() {
    ctx.globalCompositeOperation = 'lighter';
    for (const f of foods) {
      if (!inView(f.x, f.y, 40)) continue;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 2.6, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${f.hue},100%,60%,0.18)`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${f.hue},100%,72%,0.95)`;
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawSnake(s, dead) {
    if (s.trail.length < 2) return;
    if (s.x < view.x0 - 400 || s.x > view.x1 + 400 || s.y < view.y0 - 400 || s.y > view.y1 + 400) return;

    const color = `hsl(${s.hue},100%,${dead ? 55 : 62}%)`;
    const glow = `hsl(${s.hue},100%,50%)`;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (!dead) {
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      for (let i = 0; i < s.trail.length; i++) ctx.lineTo(s.trail[i].x, s.trail[i].y);
      ctx.strokeStyle = glow;
      ctx.lineWidth = s.radius * 2 + 10;
      ctx.globalAlpha = 0.22;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    for (let i = 0; i < s.trail.length; i++) ctx.lineTo(s.trail[i].x, s.trail[i].y);
    ctx.strokeStyle = dead ? `hsla(${s.hue},40%,40%,0.35)` : color;
    ctx.lineWidth = s.radius * 2;
    ctx.stroke();

    if (dead) return;

    // Head
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Eyes
    const perpX = Math.cos(s.angle + Math.PI / 2);
    const perpY = Math.sin(s.angle + Math.PI / 2);
    const fx = Math.cos(s.angle) * s.radius * 0.35;
    const fy = Math.sin(s.angle) * s.radius * 0.35;
    const ox = perpX * s.radius * 0.45;
    const oy = perpY * s.radius * 0.45;
    const eR = s.radius * 0.32;

    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(s.x + fx + ox, s.y + fy + oy, eR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s.x + fx - ox, s.y + fy - oy, eR, 0, Math.PI * 2); ctx.fill();

    const px = Math.cos(s.angle) * eR * 0.45;
    const py = Math.sin(s.angle) * eR * 0.45;
    ctx.fillStyle = '#0a0a12';
    ctx.beginPath(); ctx.arc(s.x + fx + ox + px, s.y + fy + oy + py, eR * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s.x + fx - ox + px, s.y + fy - oy + py, eR * 0.55, 0, Math.PI * 2); ctx.fill();

    // Name tag
    if (!s.isPlayer) {
      ctx.fillStyle = `hsla(${s.hue},80%,75%,0.85)`;
      ctx.font = `700 ${Math.max(10, s.radius * 0.95)}px 'Orbitron',sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(s.name, s.x, s.y - s.radius * 2.2);
    }
  }

  function drawMinimap() {
    const size = 130, pad = 16;
    const cx = window.innerWidth - pad - size;
    const cy = window.innerHeight - pad - size;
    const scale = size / (WORLD_R * 2);

    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle = 'rgba(10,10,22,0.75)';
    ctx.strokeStyle = 'rgba(255,61,189,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    for (const s of snakes) {
      if (!s.alive) continue;
      const mx = size / 2 + s.x * scale;
      const my = size / 2 + s.y * scale;
      if (s.isPlayer) {
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 12;
      } else {
        ctx.fillStyle = `hsl(${s.hue},100%,60%)`;
        ctx.shadowBlur = 0;
      }
      ctx.beginPath();
      ctx.arc(mx, my, s.isPlayer ? 4 : 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function render() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = '#07070f';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    ctx.save();
    ctx.translate(window.innerWidth / 2, window.innerHeight / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    drawGrid();
    drawBoundary();
    drawFoods();

    for (const s of snakes) if (!s.alive) drawSnake(s, true);
    for (const s of snakes) if (s.alive) drawSnake(s, false);

    ctx.restore();
    drawMinimap();
  }

  // ---------- Loop ----------
  function loop(t) {
    if (!running) return;
    const dt = Math.min(3, (t - lastT) / 16.6667) || 1;
    lastT = t;
    update(dt);
    updateView();
    render();
    raf = requestAnimationFrame(loop);
  }

  // ---------- Game control ----------
  function startGame() {
    gameId++;
    cancelAnimationFrame(raf);
    snakes = []; foods = [];
    camera = { x: 0, y: 0, zoom: 1 };
    mouse.active = false;

    player = new Snake(0, 0, 165, true, 'YOU');
    player.segments = 28;
    snakes.push(player);

    for (let i = 0; i < BOT_COUNT; i++) spawnBot();
    for (let i = 0; i < FOOD_COUNT; i++) spawnFood();

    scoreEl.textContent = '0';
    lengthEl.textContent = '28';
    rankEl.textContent = '—';
    leaderboardEl.innerHTML = '';

    startScreen.classList.add('hidden');
    gameOverEl.classList.add('hidden');
    hintEl.classList.remove('hidden');

    running = true;
    lastT = performance.now();
    raf = requestAnimationFrame(loop);

    setTimeout(() => hintEl.classList.add('hidden'), 4000);
  }

  // ---------- Input ----------
  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
  });
  window.addEventListener('touchstart', e => {
    if (e.touches[0]) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; mouse.active = true; }
  }, { passive: true });
  window.addEventListener('touchmove', e => {
    if (e.touches[0]) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY; mouse.active = true; }
    e.preventDefault();
  }, { passive: false });

  window.addEventListener('touchend', () => { mouse.active = false; }, { passive: true });
  window.addEventListener('blur', () => {
    keys.left = keys.right = keys.up = keys.down = false;
  });

  // ---------- UI ----------
  $('playBtn').onclick = startGame;
  $('restartBtn').onclick = startGame;
  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.left = true;
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = true;
    if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') keys.up = true;
    if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') keys.down = true;
    if ((e.key === 'Enter' || e.key === ' ') && !running) startGame();
  });
  window.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keys.left = false;
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keys.right = false;
    if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') keys.up = false;
    if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') keys.down = false;
  });

  // Initial camera view so render() doesn't error before play
  camera = { x: 0, y: 0, zoom: 1 };
  updateView();
})();