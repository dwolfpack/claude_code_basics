// ─── Jungle Runner ───────────────────────────────────────────────────────────

const canvas  = document.getElementById('gameCanvas');
const ctx     = canvas.getContext('2d');
const W       = canvas.width;
const H       = canvas.height;

// ── Ground & sky constants ────────────────────────────────────────────────────
const GROUND_Y = H - 60;   // top of ground strip
const PLAYER_X = 90;

// ── Game state ────────────────────────────────────────────────────────────────
let state = 'idle';        // 'idle' | 'playing' | 'dead' | 'gameover'
let score, lives, hiScore = 0, frame, speed, spawnTimer, scrollX;

// ── Player ────────────────────────────────────────────────────────────────────
const player = {
  y: GROUND_Y - 52,
  vy: 0,
  w: 36, h: 52,
  jumping: false,
  dead: false,
  runFrame: 0,
  runTick: 0,
  invincible: 0,   // frames of invincibility after hit
};

// ── Sprite drawing helpers ────────────────────────────────────────────────────
// Colours
const C = {
  skin:   '#f4a460',
  hair:   '#3b1a00',
  shirt:  '#1e90ff',
  pants:  '#2f2f7a',
  shoe:   '#3b1a00',
  gem:    ['#ff4444','#44ff88','#ffd700','#44cfff'],
  snake:  '#4caf50',
  tiger:  '#ff8c00',
  croc:   '#556b2f',
  trunk:  '#7b5e3a',
  leaf:   '#2d8a2d',
  leaf2:  '#1a5e1a',
  ground: '#2d5a00',
  sky1:   '#0a1a05',
  sky2:   '#071205',
  vine:   '#4a7c2f',
};

function drawPlayer(px, py, legPhase, dead) {
  ctx.save();
  ctx.translate(px, py);

  if (dead) { ctx.rotate(Math.PI / 2); ctx.translate(-player.w / 2, -player.h / 2); }

  // shoes
  const legOffset = dead ? 0 : Math.sin(legPhase) * 8;
  ctx.fillStyle = C.shoe;
  ctx.fillRect(2,  player.h - 10, 14, 10);
  ctx.fillRect(20, player.h - 10 + legOffset, 14, 10);

  // pants
  ctx.fillStyle = C.pants;
  ctx.fillRect(4,  player.h - 24, 13, 16);
  ctx.fillRect(19, player.h - 24 + legOffset, 13, 16);

  // body / shirt
  ctx.fillStyle = C.shirt;
  ctx.fillRect(5, player.h - 42, 26, 20);

  // arms swinging
  const armSwing = dead ? 0 : Math.cos(legPhase) * 8;
  ctx.fillStyle = C.skin;
  ctx.fillRect(0,  player.h - 40 + armSwing,  8, 14);
  ctx.fillRect(28, player.h - 40 - armSwing, 8, 14);

  // head
  ctx.fillStyle = C.skin;
  ctx.beginPath();
  ctx.ellipse(18, player.h - 48, 12, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // hair
  ctx.fillStyle = C.hair;
  ctx.beginPath();
  ctx.ellipse(18, player.h - 56, 12, 7, 0, Math.PI, 0);
  ctx.fill();

  // eye
  ctx.fillStyle = '#222';
  ctx.fillRect(22, player.h - 51, 4, 4);

  ctx.restore();
}

function drawGem(x, y, colorIdx, bobOff) {
  const r = 11;
  const cy = y + bobOff;
  ctx.save();
  ctx.translate(x + r, cy + r);
  // glow
  ctx.shadowColor = C.gem[colorIdx];
  ctx.shadowBlur = 12;
  // diamond shape
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.7, 0);
  ctx.lineTo(0, r);
  ctx.lineTo(-r * 0.7, 0);
  ctx.closePath();
  ctx.fillStyle = C.gem[colorIdx];
  ctx.fill();
  ctx.shadowBlur = 0;
  // shine
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(-2, -3, 3, 5, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSnake(x, y) {
  ctx.save();
  ctx.translate(x, y);
  // body coil
  ctx.strokeStyle = C.snake;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(60, 30);
  ctx.quadraticCurveTo(40, 5, 20, 20);
  ctx.quadraticCurveTo(0, 35, -5, 20);
  ctx.stroke();
  // head
  ctx.fillStyle = '#388e3c';
  ctx.beginPath();
  ctx.ellipse(65, 28, 12, 8, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // tongue
  ctx.strokeStyle = '#ff1744';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(76, 27);
  ctx.lineTo(85, 24);
  ctx.moveTo(85, 24);
  ctx.lineTo(89, 21);
  ctx.moveTo(85, 24);
  ctx.lineTo(89, 27);
  ctx.stroke();
  // eye
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.ellipse(63, 25, 3, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(64, 25, 1.5, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTiger(x, y) {
  ctx.save();
  ctx.translate(x, y);
  // body
  ctx.fillStyle = C.tiger;
  ctx.beginPath();
  ctx.ellipse(35, 22, 35, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  // stripes
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  [[20,8,22,36],[30,6,32,34],[42,8,40,36]].forEach(([x1,y1,x2,y2]) => {
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  });
  // legs
  ctx.fillStyle = '#e07b00';
  [[12,32],[24,35],[44,35],[56,32]].forEach(([lx,ly]) => {
    ctx.fillRect(lx, ly, 9, 14);
  });
  // head
  ctx.fillStyle = C.tiger;
  ctx.beginPath();
  ctx.ellipse(72, 18, 16, 14, 0.1, 0, Math.PI * 2);
  ctx.fill();
  // ears
  ctx.fillStyle = '#e07b00';
  ctx.beginPath();
  ctx.moveTo(62,8); ctx.lineTo(68,0); ctx.lineTo(74,9); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(73,6); ctx.lineTo(80,0); ctx.lineTo(83,8); ctx.fill();
  // face
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(74, 22, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(69,16,3,3,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath();
  ctx.ellipse(77,16,3,3,0,0,Math.PI*2); ctx.fill();
  // tail
  ctx.strokeStyle = C.tiger;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0,20);
  ctx.quadraticCurveTo(-10,5,-5,-5);
  ctx.stroke();
  ctx.restore();
}

function drawCroc(x, y) {
  ctx.save();
  ctx.translate(x, y);
  // tail
  ctx.fillStyle = C.croc;
  ctx.beginPath();
  ctx.moveTo(0,20); ctx.lineTo(25,14); ctx.lineTo(25,26); ctx.closePath();
  ctx.fill();
  // body
  ctx.fillStyle = C.croc;
  ctx.beginPath();
  ctx.ellipse(45, 22, 38, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  // belly
  ctx.fillStyle = '#8bc34a';
  ctx.beginPath();
  ctx.ellipse(45, 26, 30, 8, 0, 0, Math.PI);
  ctx.fill();
  // scales
  ctx.fillStyle = '#3d5a1a';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(20 + i * 14, 12, 5, Math.PI, 0);
    ctx.fill();
  }
  // legs
  ctx.fillStyle = C.croc;
  [[20,28],[35,30],[52,30],[65,28]].forEach(([lx,ly]) => {
    ctx.fillRect(lx, ly, 8, 10);
  });
  // head
  ctx.fillStyle = C.croc;
  ctx.beginPath();
  ctx.ellipse(86, 20, 20, 11, -0.1, 0, Math.PI * 2);
  ctx.fill();
  // jaw
  ctx.fillStyle = '#8bc34a';
  ctx.beginPath();
  ctx.ellipse(86, 26, 18, 6, 0, 0, Math.PI);
  ctx.fill();
  // teeth
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(72 + i * 9, 22);
    ctx.lineTo(74 + i * 9, 29);
    ctx.lineTo(76 + i * 9, 22);
    ctx.fill();
  }
  // eye
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.ellipse(78,14,4,4,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(79,14,2,2,0,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

// ── Background scrolling layers ───────────────────────────────────────────────
// Trees defined by x (world), drawn as jungle trees
const bgTrees = [];
function initTrees() {
  bgTrees.length = 0;
  for (let i = 0; i < 12; i++) {
    bgTrees.push({ x: i * 130, scale: 0.6 + Math.random() * 0.8, layer: Math.random() < 0.5 ? 0 : 1 });
  }
}

function drawTree(tx, scale, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(tx, GROUND_Y);
  ctx.scale(scale, scale);

  // trunk
  ctx.fillStyle = C.trunk;
  ctx.fillRect(-8, -70, 16, 70);

  // canopy layers
  [0, -30, -55].forEach((dy, i) => {
    const r = 45 - i * 8;
    ctx.fillStyle = i % 2 === 0 ? C.leaf : C.leaf2;
    ctx.beginPath();
    ctx.ellipse(0, dy - 10, r, r * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // hanging vine
  ctx.strokeStyle = C.vine;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(15, -55);
  ctx.quadraticCurveTo(25, -10, 20, 0);
  ctx.stroke();

  ctx.restore();
}

// ── Obstacles & collectibles ──────────────────────────────────────────────────
let obstacles = [];   // { type, x, y, w, h }
let gems      = [];   // { x, y, colorIdx, bob }
let particles = [];   // { x, y, vx, vy, life, color }

const OBSTACLE_DEFS = {
  snake: { w: 90, h: 40,  floorOffset: 10, draw: drawSnake },
  tiger: { w: 90, h: 48,  floorOffset: 2,  draw: drawTiger },
  croc:  { w: 110, h: 40, floorOffset: 4,  draw: drawCroc  },
};

function spawnObstacle() {
  const types = Object.keys(OBSTACLE_DEFS);
  const type  = types[Math.floor(Math.random() * types.length)];
  const def   = OBSTACLE_DEFS[type];
  obstacles.push({
    type, draw: def.draw,
    x: W + 20,
    y: GROUND_Y - def.h + def.floorOffset,
    w: def.w, h: def.h,
  });
}

function spawnGem() {
  const colorIdx = Math.floor(Math.random() * C.gem.length);
  // gems either on ground or floating (reward jumping)
  const floating = Math.random() < 0.4;
  const y = floating ? GROUND_Y - 100 - Math.random() * 60 : GROUND_Y - 40;
  gems.push({ x: W + 20, y, colorIdx, bob: 0 });
}

// ── Particles ─────────────────────────────────────────────────────────────────
function burst(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const spd   = 2 + Math.random() * 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 2,
      life: 40 + Math.random() * 20,
      maxLife: 60,
      color,
    });
  }
}

// ── Collision ─────────────────────────────────────────────────────────────────
function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh, pad = 8) {
  return ax + pad < bx + bw - pad &&
         ax + aw - pad > bx + pad &&
         ay + pad < by + bh - pad &&
         ay + ah - pad > by + pad;
}

// ── Game lifecycle ────────────────────────────────────────────────────────────
function resetRound() {
  player.y  = GROUND_Y - player.h;
  player.vy = 0;
  player.jumping  = false;
  player.dead     = false;
  player.invincible = 90;
  obstacles.length = 0;
  gems.length      = 0;
  particles.length = 0;
  spawnTimer = 80;
  frame      = 0;
  speed      = 4;
  scrollX    = 0;
}

function startGame() {
  score  = 0;
  lives  = 3;
  state  = 'playing';
  initTrees();
  resetRound();
  updateHUD();
  setMsg('');
  document.getElementById('startBtn').disabled = true;
}

function playerDie() {
  player.dead = true;
  burst(PLAYER_X + player.w / 2, player.y + player.h / 2, '#ff4444', 16);
  lives--;
  updateHUD();
  state = 'dead';
  if (lives <= 0) {
    if (score > hiScore) hiScore = score;
    updateHUD();
    setTimeout(() => { state = 'gameover'; setMsg('GAME OVER — Press START'); document.getElementById('startBtn').disabled = false; }, 1000);
  } else {
    setTimeout(() => { state = 'playing'; resetRound(); setMsg(''); }, 1200);
  }
}

// ── HUD / UI helpers ──────────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById('scoreDisplay').textContent = score;
  document.getElementById('livesDisplay').textContent = lives;
  document.getElementById('hiDisplay').textContent    = hiScore;
}

function setMsg(txt) { document.getElementById('message').textContent = txt; }

// ── Drawing the scene ─────────────────────────────────────────────────────────
function drawBackground() {
  // sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  grad.addColorStop(0, '#071a03');
  grad.addColorStop(1, '#1a3d0a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, GROUND_Y);

  // moon
  ctx.fillStyle = '#fffde7';
  ctx.shadowColor = '#fffde7';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(700, 40, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // background trees (far, semi-transparent)
  const farOff = (scrollX * 0.2) % 130;
  bgTrees.filter(t => t.layer === 0).forEach(t => {
    const tx = ((t.x - farOff % (12 * 130)) % (W + 200)) - 100;
    drawTree(tx, t.scale * 0.55, 0.25);
  });

  // midground trees
  const midOff = (scrollX * 0.5) % 130;
  bgTrees.filter(t => t.layer === 1).forEach(t => {
    const tx = ((t.x - midOff % (12 * 130)) % (W + 200)) - 100;
    drawTree(tx, t.scale * 0.75, 0.45);
  });

  // ground
  const gGrad = ctx.createLinearGradient(0, GROUND_Y, 0, H);
  gGrad.addColorStop(0, '#3a7a10');
  gGrad.addColorStop(0.15, '#2d5a00');
  gGrad.addColorStop(1, '#1a3300');
  ctx.fillStyle = gGrad;
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

  // grass tufts scrolling
  ctx.fillStyle = '#5aaf1a';
  for (let i = 0; i < 20; i++) {
    const gx = ((i * 43 - scrollX * 1.2) % (W + 40) + W + 40) % (W + 40);
    ctx.beginPath();
    ctx.moveTo(gx, GROUND_Y);
    ctx.lineTo(gx - 5, GROUND_Y - 12);
    ctx.lineTo(gx + 5, GROUND_Y - 12);
    ctx.closePath();
    ctx.fill();
  }
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle   = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ── Main loop ─────────────────────────────────────────────────────────────────
let lastTime = 0;
function loop(ts) {
  const dt = Math.min((ts - lastTime) / 16.67, 3); // normalise to ~60fps
  lastTime = ts;

  ctx.clearRect(0, 0, W, H);
  drawBackground();

  if (state === 'playing' || state === 'dead') {
    frame++;
    if (state === 'playing') scrollX += speed;

    // ── speed up over time ──
    if (state === 'playing' && frame % 400 === 0) speed = Math.min(speed + 0.4, 14);

    // ── spawn ──
    if (state === 'playing') {
      spawnTimer--;
      if (spawnTimer <= 0) {
        spawnTimer = Math.max(55, 110 - score / 8);
        if (Math.random() < 0.55) spawnObstacle();
        if (Math.random() < 0.65) spawnGem();
      }
    }

    // ── physics (player) ──
    if (state === 'playing') {
      player.vy += 0.65;
      player.y  += player.vy;
      if (player.y >= GROUND_Y - player.h) {
        player.y  = GROUND_Y - player.h;
        player.vy = 0;
        player.jumping = false;
      }
      if (player.invincible > 0) player.invincible--;
    }

    // ── run animation ──
    if (!player.dead) {
      player.runTick++;
      if (player.runTick % 5 === 0) player.runFrame++;
    }

    // ── move obstacles ──
    obstacles.forEach(o => { if (state === 'playing') o.x -= speed; });
    obstacles = obstacles.filter(o => o.x > -150);

    // ── move gems ──
    gems.forEach(g => {
      if (state === 'playing') g.x -= speed;
      g.bob = Math.sin(frame * 0.08 + g.x * 0.05) * 5;
    });
    gems = gems.filter(g => g.x > -40);

    // ── collisions: gems ──
    gems = gems.filter(g => {
      if (rectsOverlap(PLAYER_X, player.y, player.w, player.h, g.x, g.y, 22, 22, 4)) {
        const pts = Math.floor(50 + speed * 10);
        score += pts;
        burst(g.x + 11, g.y + 11, C.gem[g.colorIdx]);
        updateHUD();
        return false;
      }
      return true;
    });

    // ── collisions: obstacles ──
    if (state === 'playing' && player.invincible === 0) {
      obstacles.forEach(o => {
        if (rectsOverlap(PLAYER_X, player.y, player.w, player.h, o.x, o.y, o.w, o.h)) {
          playerDie();
        }
      });
    }

    // ── score from running ──
    if (state === 'playing' && frame % 6 === 0) { score++; updateHUD(); }

    // ── particles ──
    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life--; });
    particles = particles.filter(p => p.life > 0);

    // ── draw gems ──
    gems.forEach(g => drawGem(g.x, g.y + g.bob, g.colorIdx, 0));

    // ── draw obstacles ──
    obstacles.forEach(o => o.draw(o.x, o.y));

    // ── draw player ──
    const legPhase = player.runFrame * 0.5;
    if (player.invincible > 0 && Math.floor(player.invincible / 5) % 2 === 0) {
      // blink when invincible
    } else {
      drawPlayer(PLAYER_X, player.y, legPhase, player.dead);
    }

    // ── particles on top ──
    drawParticles();

    // ── distance score display ──
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.font = '13px Courier New';
    ctx.fillText(`DIST: ${Math.floor(scrollX / 10)}m`, W - 140, 20);
  }

  if (state === 'idle' || state === 'gameover') {
    // still draw animated idle player
    const idleLeg = Math.sin(Date.now() * 0.006) * 0.8;
    drawPlayer(PLAYER_X, GROUND_Y - player.h, idleLeg, false);
  }

  requestAnimationFrame(loop);
}

// ── Input ─────────────────────────────────────────────────────────────────────
function jump() {
  if (state === 'playing' && !player.jumping && player.y >= GROUND_Y - player.h - 2) {
    player.vy     = -14;
    player.jumping = true;
  }
  if (state === 'idle' || state === 'gameover') startGame();
}

document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    e.preventDefault();
    jump();
  }
});

canvas.addEventListener('pointerdown', jump);
document.getElementById('startBtn').addEventListener('click', startGame);

// ── Boot ──────────────────────────────────────────────────────────────────────
initTrees();
player.y = GROUND_Y - player.h;
requestAnimationFrame(loop);
