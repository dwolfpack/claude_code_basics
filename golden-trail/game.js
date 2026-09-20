/* ============================================================================
   Golden Trail — an arcade beat-'em-up for phones.
   Four knights, one scrolling road, and dragons waiting at the end of it.
   Everything is drawn with canvas paths: no sprites, no dependencies.

   The world is measured in "design pixels" on a 720-tall stage; the renderer
   scales that to whatever screen it lands on. Fighters live at (x, y, z):
   x scrolls, y is the ground line inside the walkable band (depth), and z is
   height above the ground for jumps.
   ========================================================================== */
(function () {
  'use strict';

  /* ───────────────────────── Tuning ───────────────────────── */
  var DH = 640;              // design height; everything below is in these units
  var FLOOR_FAR = 300;       // ground line at the back of the walkable band
  var FLOOR_NEAR = 486;      // ground line at the front
  var CHAR_H = 112;          // a knight, head to heel, at scale 1
  var BAND = FLOOR_NEAR - FLOOR_FAR;

  var CFG = {
    gravity: -2600,
    jumpV: 900,
    depthSpeed: 0.55,        // walking "into" the screen is slower than along it
    hitStop: 0.065,          // freeze frames on a solid connect
    maxAttackers: 2,         // how many foes may swing at once (arcade fairness)
    depthHit: 30,            // depth tolerance for a blow to land
    knockFriction: 5.2,
    downTime: 1.05,
    hurtTime: 0.34,
    comboWindow: 0.46,
    invulnAfterDown: 1.1,
    spawnMargin: 260,
    maxVials: 6
  };

  /* ───────────────────────── The four knights ───────────────────────── */
  var KNIGHTS = [
    {
      id: 'alden', name: 'Sir Alden', role: 'Longsword', icon: '🗡️',
      blurb: 'Even-handed and unhurried. Good reach, good armour, nothing to relearn.',
      hp: 125, speed: 196, power: 1.0, reach: 52, weight: 1.0, vials: 3,
      magic: { name: 'Hallowed Nova', kind: 'nova', power: 26, color: '#ffe9a8' },
      look: { skin: '#e7bd93', hair: '#6d4a2a', plate: '#c9d2e0', trim: '#f2c14e',
              cloth: '#3f6fb5', accent: '#e8eef8', weapon: 'sword', plume: '#3f6fb5' }
    },
    {
      id: 'brynn', name: 'Brynn Ironmane', role: 'Great Axe', icon: '🪓',
      blurb: 'Slow to start, impossible to stop. One swing clears a doorway.',
      hp: 165, speed: 162, power: 1.5, reach: 58, weight: 1.45, vials: 2,
      magic: { name: 'Mountainfall', kind: 'quake', power: 34, color: '#f0a04b' },
      look: { skin: '#cf9d72', hair: '#8c3f22', plate: '#c08b3e', trim: '#ffd166',
              cloth: '#8e2f2a', accent: '#f0d08a', weapon: 'axe', plume: '#e0442f' }
    },
    {
      id: 'kael', name: 'Kael Swiftlance', role: 'Spear', icon: '🌾',
      blurb: 'Keeps everyone at arm\'s length and never stands still. Thin armour, though.',
      hp: 98, speed: 232, power: 0.84, reach: 76, weight: 0.72, vials: 4,
      magic: { name: 'Gale Edge', kind: 'gale', power: 19, color: '#9ff0d4' },
      look: { skin: '#a9764c', hair: '#241a12', plate: '#5fc9a0', trim: '#eaf6e8',
              cloth: '#1f7d63', accent: '#d8e6d2', weapon: 'spear', plume: '#9ff0d4' }
    },
    {
      id: 'mira', name: 'Mira Emberveil', role: 'Runeblade', icon: '✦',
      blurb: 'A light blade and a heavy spellbook. Save your vials and the road burns.',
      hp: 104, speed: 204, power: 0.76, reach: 48, weight: 0.85, vials: 5,
      magic: { name: 'Dragonfire', kind: 'fire', power: 47, color: '#ff8a3c' },
      look: { skin: '#f0cbb0', hair: '#b9424f', plate: '#8257c8', trim: '#ffb35c',
              cloth: '#33205a', accent: '#e4ccff', weapon: 'rune', plume: '#ff8a3c' }
    }
  ];

  /* ───────────────────────── Foes ─────────────────────────
     ai: how they behave. body: which drawing routine paints them. */
  var FOES = {
    bandit: {
      name: 'Road Bandit', hp: 36, speed: 124, power: 7, reach: 42, gold: 12, ai: 'chase',
      body: 'human', windup: 0.3, recover: 0.42,
      look: { skin: '#c69265', hair: '#2a2018', plate: '#59604a', trim: '#7d7455',
              cloth: '#463a30', accent: '#8d8a6e', weapon: 'sword', plume: '' }
    },
    brute: {
      name: 'Shield Brute', hp: 78, speed: 92, power: 12, reach: 46, gold: 26, ai: 'shield',
      body: 'human', windup: 0.44, recover: 0.6, guard: 0.55, weight: 1.9,
      look: { skin: '#b07f56', hair: '#1c1c1c', plate: '#5f666e', trim: '#8e9aa6',
              cloth: '#33404d', accent: '#aab4c0', weapon: 'mace', plume: '#33404d', shield: true }
    },
    thrower: {
      name: 'Axe Thrower', hp: 30, speed: 106, power: 9, reach: 320, gold: 19, ai: 'thrower',
      body: 'human', windup: 0.46, recover: 0.78, keepAway: 180,
      look: { skin: '#d6a071', hair: '#4a2f1c', plate: '#5d6b4a', trim: '#93a05a',
              cloth: '#3a4a32', accent: '#a8b08a', weapon: 'axe', plume: '' }
    },
    thief: {
      name: 'Gnome Thief', hp: 20, speed: 208, power: 0, reach: 0, gold: 0, ai: 'thief',
      body: 'gnome', weight: 0.5,
      look: { skin: '#e3b78d', hair: '#e8e2d6', plate: '#4a7f4f', trim: '#f2c14e',
              cloth: '#2f5c39', accent: '#f5e6c8', weapon: 'sack', plume: '#f2c14e' }
    },
    whelp: {
      name: 'Dragon Whelp', hp: 60, speed: 138, power: 13, reach: 96, gold: 34, ai: 'whelp',
      body: 'drake', windup: 0.56, recover: 0.8, weight: 1.6, scale: 0.92,
      look: { hide: '#8f4a2e', belly: '#e8b878', wing: '#c96a3a', eye: '#ffd166', horn: '#f0e0c0' }
    },
    rider: {
      name: 'Wyrm Rider', hp: 48, speed: 152, power: 11, reach: 44, gold: 30, ai: 'chase',
      body: 'human', windup: 0.32, recover: 0.4, mount: 'drake',
      look: { skin: '#b98a5e', hair: '#2b1b12', plate: '#6a4a6e', trim: '#d8a0e0',
              cloth: '#3a2450', accent: '#c7a8d6', weapon: 'sword', plume: '#d8a0e0' }
    }
  };

  // Mounts are ridden by a rider; knock the rider off and the saddle is yours.
  var MOUNTS = {
    drake: {
      name: 'Saddled Drake', hp: 72, speed: 244, breath: 15, stomp: 14, scale: 1.0,
      look: { hide: '#4e6f8f', belly: '#cfe0ea', wing: '#6d94b5', eye: '#ffd166', horn: '#e6eef5' }
    }
  };

  var BOSSES = {
    ember: {
      name: 'Ember Wyrm', hp: 430, speed: 96, scale: 1.4, gold: 260,
      breath: 20, claw: 22, stomp: 18,
      look: { hide: '#9c3b24', belly: '#f0b263', wing: '#d4562c', eye: '#ffe066', horn: '#f6e3bd' }
    },
    ashen: {
      name: 'Ashen Wyrm', hp: 720, speed: 108, scale: 1.65, gold: 520,
      breath: 25, claw: 27, stomp: 22, flies: true,
      look: { hide: '#4a4256', belly: '#c9c0d8', wing: '#6b5f7d', eye: '#ff6b4a', horn: '#efe8f5' }
    }
  };

  /* ───────────────────────── The trail ─────────────────────────
     Each gate locks the camera until the spawned band is cleared. */
  var STAGES = [
    {
      name: 'Greenwood Road', icon: '🌲', len: 2650,
      desc: 'Cart ruts under old oaks. The bandits here are more nuisance than menace.',
      pal: { skyTop: '#2f5f8a', skyMid: '#7ba7c4', skyLow: '#e6c9a0', sun: '#ffe9b8',
             hillFar: '#39586a', hillNear: '#2b4a3a', ground: '#4a6b41', groundAlt: '#3d5c38',
             path: '#9b7f52', pathAlt: '#8a6f47', prop: '#2c4130', fog: '#7ba7c4', motes: 'leaves' },
      gates: [
        { x: 420, foes: [['bandit', 2]] },
        { x: 1080, foes: [['bandit', 2], ['thief', 1]], chest: 1 },
        { x: 1760, foes: [['bandit', 3]] },
        { x: 2450, foes: [['bandit', 2], ['brute', 1]], chest: 1 }
      ]
    },
    {
      name: 'The Broken Bridge', icon: '🌉', len: 2900,
      desc: 'A river crossing held by throwers. Watch the axes, not the water.',
      pal: { skyTop: '#3a4f7a', skyMid: '#8f9ec4', skyLow: '#f0cbb0', sun: '#ffdcb0',
             hillFar: '#4a5a78', hillNear: '#3b4a5e', ground: '#7d7d86', groundAlt: '#6c6c76',
             path: '#a89c8c', pathAlt: '#948877', prop: '#55535c', fog: '#8f9ec4', motes: 'mist' },
      gates: [
        { x: 440, foes: [['bandit', 2], ['thrower', 1]] },
        { x: 1120, foes: [['thrower', 2], ['brute', 1]], chest: 1 },
        { x: 1840, foes: [['bandit', 3], ['thief', 1]] },
        { x: 2650, foes: [['brute', 2], ['thrower', 1]], chest: 1 }
      ]
    },
    {
      name: 'Ashfall Pass', icon: '🔥', len: 2500,
      desc: 'Hot stone and falling cinders. Something large has been nesting here.',
      pal: { skyTop: '#3a1d26', skyMid: '#8a3a2e', skyLow: '#e0713c', sun: '#ffb347',
             hillFar: '#4a2a2c', hillNear: '#341f22', ground: '#57404a', groundAlt: '#48353e',
             path: '#7a5a52', pathAlt: '#694c46', prop: '#2e1f23', fog: '#8a3a2e', motes: 'embers' },
      gates: [
        { x: 440, foes: [['bandit', 2], ['whelp', 1]] },
        { x: 1080, foes: [['whelp', 2], ['thief', 1]], chest: 1 },
        { x: 2200, boss: 'ember' }
      ]
    },
    {
      name: 'Frostwatch Keep', icon: '❄️', len: 3000,
      desc: 'Snow on a dead garrison. Wyrm riders patrol the walls — unseat one.',
      pal: { skyTop: '#25324f', skyMid: '#5b7099', skyLow: '#c3d3e8', sun: '#eef4ff',
             hillFar: '#39496b', hillNear: '#2a3653', ground: '#c8d6e6', groundAlt: '#b4c4d8',
             path: '#dce7f2', pathAlt: '#c6d4e4', prop: '#3c4a68', fog: '#5b7099', motes: 'snow' },
      gates: [
        { x: 460, foes: [['brute', 2]] },
        { x: 1160, foes: [['rider', 1], ['bandit', 2]], chest: 1 },
        { x: 1940, foes: [['thrower', 2], ['brute', 1]] },
        { x: 2750, foes: [['rider', 1], ['brute', 2]], chest: 1 }
      ]
    },
    {
      name: 'The Bonefield', icon: '💀', len: 3100,
      desc: 'Where the last company stopped. Whelps pick over what they left.',
      pal: { skyTop: '#2b2740', skyMid: '#6a5878', skyLow: '#d0a08a', sun: '#ffd0a8',
             hillFar: '#3d3552', hillNear: '#2c2540', ground: '#6b6252', groundAlt: '#5b5245',
             path: '#8f8371', pathAlt: '#7c7162', prop: '#3a3346', fog: '#6a5878', motes: 'ash' },
      gates: [
        { x: 460, foes: [['whelp', 1], ['bandit', 2]] },
        { x: 1180, foes: [['rider', 1], ['thrower', 1]], chest: 1 },
        { x: 1980, foes: [['whelp', 2], ['brute', 1]], chest: 1 },
        { x: 2820, foes: [['rider', 1], ['whelp', 1], ['thief', 1]] }
      ]
    },
    {
      name: "The Dragon's Spine", icon: '🐉', len: 2600,
      desc: 'The ridge road, and the Ashen Wyrm coiled at the end of it.',
      pal: { skyTop: '#1b1424', skyMid: '#4a2b52', skyLow: '#a8456a', sun: '#ffb3c8',
             hillFar: '#2f2140', hillNear: '#211730', ground: '#4a4154', groundAlt: '#3d3547',
             path: '#6a5f78', pathAlt: '#5a5067', prop: '#241a33', fog: '#4a2b52', motes: 'embers' },
      gates: [
        { x: 460, foes: [['rider', 1], ['whelp', 1]] },
        { x: 1160, foes: [['brute', 2], ['thrower', 1]], chest: 1 },
        { x: 2300, boss: 'ashen' }
      ]
    }
  ];

  /* ───────────────────────── Helpers ───────────────────────── */
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function chance(p) { return Math.random() < p; }
  function sign(v) { return v < 0 ? -1 : 1; }

  function hexToRgb(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mixHex(a, b, t) {
    var ca = hexToRgb(a), cb = hexToRgb(b);
    return 'rgb(' + Math.round(lerp(ca[0], cb[0], t)) + ',' + Math.round(lerp(ca[1], cb[1], t)) +
           ',' + Math.round(lerp(ca[2], cb[2], t)) + ')';
  }
  function rgba(hex, a) {
    var c = hexToRgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }
  function shade(hex, t) { return t < 0 ? mixHex(hex, '#000000', -t) : mixHex(hex, '#ffffff', t); }

  function depthOf(y) { return clamp((y - FLOOR_FAR) / BAND, 0, 1); }
  function scaleOf(y) { return 0.78 + 0.30 * depthOf(y); }

  /* ───────────────────────── Persistence ───────────────────────── */
  var Store = {
    key: 'goldentrail.v1',
    data: { best: 0, gold: 0, knight: '', sound: true, runs: 0, clears: 0, save: null },
    load: function () {
      try {
        var raw = localStorage.getItem(this.key);
        if (raw) {
          var parsed = JSON.parse(raw);
          for (var k in this.data) if (Object.prototype.hasOwnProperty.call(parsed, k)) this.data[k] = parsed[k];
        }
      } catch (e) { /* private mode — play with defaults */ }
      return this.data;
    },
    save: function () {
      try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
    }
  };
  Store.load();

  /* ───────────────────────── Audio (small WebAudio synth) ───────────────────────── */
  var Sfx = {
    ctx: null,
    on: Store.data.sound !== false,
    init: function () {
      if (this.ctx) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC(); } catch (e) { this.ctx = null; }
    },
    resume: function () { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
    tone: function (freq, dur, type, vol, slideTo, delay) {
      if (!this.on || !this.ctx) return;
      var t = this.ctx.currentTime + (delay || 0);
      var osc = this.ctx.createOscillator();
      var gain = this.ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t + dur);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol || 0.11, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    },
    noise: function (dur, vol, filterHz, delay) {
      if (!this.on || !this.ctx) return;
      var t = this.ctx.currentTime + (delay || 0);
      var rate = this.ctx.sampleRate;
      var len = Math.max(1, Math.floor(rate * dur));
      var buf = this.ctx.createBuffer(1, len, rate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = this.ctx.createBufferSource();
      var gain = this.ctx.createGain();
      src.buffer = buf;
      gain.gain.setValueAtTime(vol || 0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      if (filterHz) {
        var biq = this.ctx.createBiquadFilter();
        biq.type = 'lowpass';
        biq.frequency.value = filterHz;
        src.connect(biq).connect(gain).connect(this.ctx.destination);
      } else {
        src.connect(gain).connect(this.ctx.destination);
      }
      src.start(t);
    },
    play: function (name) {
      if (!this.on) return;
      this.init();
      this.resume();
      if (!this.ctx) return;
      switch (name) {
        case 'swing':   this.noise(0.1, 0.07, 2600); break;
        case 'hit':     this.tone(180, 0.1, 'square', 0.11, 90); this.noise(0.09, 0.1, 1400); break;
        case 'heavy':   this.tone(120, 0.22, 'sawtooth', 0.14, 54); this.noise(0.16, 0.13, 900); break;
        case 'guard':   this.tone(760, 0.09, 'square', 0.08, 1100); this.noise(0.06, 0.06, 5000); break;
        case 'hurt':    this.tone(300, 0.2, 'sawtooth', 0.12, 110); break;
        case 'down':    this.tone(140, 0.34, 'sawtooth', 0.12, 60); this.noise(0.2, 0.1, 700); break;
        case 'jump':    this.tone(420, 0.12, 'sine', 0.09, 760); break;
        case 'land':    this.noise(0.07, 0.05, 900); break;
        case 'coin':    this.tone(1180, 0.07, 'triangle', 0.09, 1720); break;
        case 'vial':    this.tone(640, 0.09, 'sine', 0.1, 1180); this.tone(1180, 0.12, 'sine', 0.07, 1560, 0.07); break;
        case 'heal':    this.tone(520, 0.1, 'triangle', 0.1, 780); this.tone(780, 0.16, 'triangle', 0.09, 1040, 0.09); break;
        case 'chest':   this.tone(420, 0.1, 'square', 0.08, 620); this.tone(820, 0.2, 'triangle', 0.09, 1240, 0.1); break;
        case 'magic':   this.tone(240, 0.5, 'sawtooth', 0.12, 900); this.noise(0.5, 0.12, 3200); break;
        case 'fire':    this.noise(0.42, 0.13, 1500); break;
        case 'roar':    this.tone(110, 0.7, 'sawtooth', 0.15, 62); this.noise(0.6, 0.12, 620); break;
        case 'mount':   this.tone(300, 0.14, 'triangle', 0.1, 560); this.tone(560, 0.2, 'triangle', 0.09, 840, 0.12); break;
        case 'gate':    this.tone(520, 0.12, 'square', 0.08, 700); this.tone(700, 0.18, 'square', 0.08, 940, 0.11); break;
        case 'clear':   this.tone(523, 0.14, 'triangle', 0.1); this.tone(659, 0.14, 'triangle', 0.1, 0, 0.13);
                        this.tone(784, 0.3, 'triangle', 0.11, 0, 0.26); break;
        case 'defeat':  this.tone(392, 0.3, 'sawtooth', 0.11, 180); this.tone(262, 0.6, 'sawtooth', 0.11, 98, 0.26); break;
      }
    },
    toggle: function () {
      this.on = !this.on;
      Store.data.sound = this.on;
      Store.save();
      if (this.on) this.play('gate');
      return this.on;
    }
  };

  /* ───────────────────────── Canvas & view ───────────────────────── */
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var view = { w: 0, h: 0, dpr: 1, s: 1, dw: 360, dh: DH };

  function resize() {
    view.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    view.w = canvas.clientWidth || window.innerWidth;
    view.h = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    view.s = view.h / DH;
    view.dw = view.w / view.s;
    view.dh = DH;
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });

  /* ───────────────────────── Run state ───────────────────────── */
  var G = {
    screen: 'menu',
    knight: KNIGHTS[0],
    stageIndex: 0,
    stage: null,
    player: null,
    foes: [],
    mounts: [],
    pickups: [],
    shots: [],
    parts: [],
    floats: [],
    props: [],
    motes: [],
    cam: { x: 0, shake: 0, lock: false, lockX: 0 },
    gateIndex: 0,
    gateOpen: false,
    stageDone: false,
    boss: null,
    gold: 0,
    kills: 0,
    runGold: 0,
    runKills: 0,
    time: 0,
    hitStop: 0,
    flash: 0,
    banner: null,
    bannerT: 0
  };

  /* ───────────────────────── Attack shapes ─────────────────────────
     hitAt/hitFor carve the active window out of the swing. */
  var COMBO = [
    { dur: 0.33, hitAt: 0.10, hitFor: 0.13, dmg: 1.0, knock: 95, reach: 1.0 },
    { dur: 0.34, hitAt: 0.10, hitFor: 0.13, dmg: 1.1, knock: 110, reach: 1.02 },
    { dur: 0.50, hitAt: 0.17, hitFor: 0.17, dmg: 1.7, knock: 280, reach: 1.12, launch: true }
  ];
  var HEAVY = { dur: 0.64, hitAt: 0.27, hitFor: 0.19, dmg: 2.3, knock: 330, reach: 1.2, launch: true, shake: 9 };
  var AIR   = { dur: 0.44, hitAt: 0.07, hitFor: 0.27, dmg: 1.45, knock: 190, reach: 1.0 };

  /* ───────────────────────── Input ───────────────────────── */
  var Input = {
    mx: 0, my: 0,            // stick direction, -1..1
    atkBuf: 0, jumpBuf: 0, magicBuf: 0, heavyBuf: 0,
    atkHeld: false, atkHold: 0,
    keys: {}
  };

  function bufferAttack() { Input.atkBuf = 0.2; }
  function bufferJump() { Input.jumpBuf = 0.2; }
  function bufferMagic() { Input.magicBuf = 0.2; }

  function onAttackDown() {
    if (Input.atkHeld) return;
    Input.atkHeld = true;
    Input.atkHold = 0;
    bufferAttack();
    Sfx.init();
  }
  function onAttackUp() {
    if (!Input.atkHeld) return;
    Input.atkHeld = false;
    if (Input.atkHold > 0.42) { Input.atkBuf = 0.22; Input.heavyBuf = 0.22; }
    Input.atkHold = 0;
  }

  /* Virtual stick — one pointer, tracked by id so the action pad stays free. */
  var stickEl = document.getElementById('stick');
  var nubEl = document.getElementById('stickNub');
  var stickId = null;
  var stickOrigin = { x: 0, y: 0 };
  var STICK_R = 46;

  function stickStart(e) {
    var t = e.changedTouches ? e.changedTouches[0] : e;
    if (stickId !== null) return;
    stickId = t.identifier === undefined ? 'mouse' : t.identifier;
    var r = stickEl.getBoundingClientRect();
    stickOrigin.x = r.left + r.width / 2;
    stickOrigin.y = r.top + r.height / 2;
    stickMove(e);
    Sfx.init();
  }
  function stickMove(e) {
    if (stickId === null) return;
    var list = e.changedTouches || [e];
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      var id = t.identifier === undefined ? 'mouse' : t.identifier;
      if (id !== stickId) continue;
      var dx = t.clientX - stickOrigin.x;
      var dy = t.clientY - stickOrigin.y;
      var len = Math.hypot(dx, dy);
      var capped = Math.min(len, STICK_R);
      var nx = len > 0.001 ? dx / len : 0;
      var ny = len > 0.001 ? dy / len : 0;
      var amt = capped / STICK_R;
      // A small dead zone keeps a resting thumb from drifting.
      Input.mx = amt < 0.18 ? 0 : nx * amt;
      Input.my = amt < 0.18 ? 0 : ny * amt;
      nubEl.style.transform = 'translate(' + (nx * capped) + 'px,' + (ny * capped) + 'px)';
    }
  }
  function stickEnd(e) {
    if (stickId === null) return;
    var list = e.changedTouches || [e];
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      var id = t.identifier === undefined ? 'mouse' : t.identifier;
      if (id !== stickId) continue;
      stickId = null;
      Input.mx = 0;
      Input.my = 0;
      nubEl.style.transform = '';
    }
  }

  stickEl.addEventListener('touchstart', function (e) { e.preventDefault(); stickStart(e); }, { passive: false });
  stickEl.addEventListener('touchmove', function (e) { e.preventDefault(); stickMove(e); }, { passive: false });
  stickEl.addEventListener('touchend', function (e) { e.preventDefault(); stickEnd(e); }, { passive: false });
  stickEl.addEventListener('touchcancel', function (e) { stickEnd(e); }, { passive: true });
  stickEl.addEventListener('mousedown', function (e) { e.preventDefault(); stickStart(e); });
  window.addEventListener('mousemove', function (e) { if (stickId === 'mouse') stickMove(e); });
  window.addEventListener('mouseup', function (e) { if (stickId === 'mouse') stickEnd(e); });

  function wireActionButton(el, down, up) {
    el.addEventListener('touchstart', function (e) { e.preventDefault(); el.classList.add('pressed'); down(); }, { passive: false });
    el.addEventListener('touchend', function (e) { e.preventDefault(); el.classList.remove('pressed'); if (up) up(); }, { passive: false });
    el.addEventListener('touchcancel', function () { el.classList.remove('pressed'); if (up) up(); }, { passive: true });
    el.addEventListener('mousedown', function (e) { e.preventDefault(); el.classList.add('pressed'); down(); });
    el.addEventListener('mouseup', function (e) { e.preventDefault(); el.classList.remove('pressed'); if (up) up(); });
    el.addEventListener('mouseleave', function () { if (el.classList.contains('pressed')) { el.classList.remove('pressed'); if (up) up(); } });
  }

  var btnAttack = document.getElementById('btnAttack');
  var btnJump = document.getElementById('btnJump');
  var btnMagic = document.getElementById('btnMagic');
  wireActionButton(btnAttack, onAttackDown, onAttackUp);
  wireActionButton(btnJump, bufferJump);
  wireActionButton(btnMagic, bufferMagic);

  var KEY_MOVE = {
    ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
    ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1]
  };

  function keyVector() {
    var x = 0, y = 0;
    for (var code in KEY_MOVE) {
      if (Input.keys[code]) { x += KEY_MOVE[code][0]; y += KEY_MOVE[code][1]; }
    }
    var len = Math.hypot(x, y);
    return len > 1 ? [x / len, y / len] : [x, y];
  }

  window.addEventListener('keydown', function (e) {
    if (e.repeat) return;
    Input.keys[e.code] = true;
    if (e.code === 'Space' || e.code === 'KeyJ') { e.preventDefault(); onAttackDown(); }
    else if (e.code === 'KeyK' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') { e.preventDefault(); bufferJump(); }
    else if (e.code === 'KeyL' || e.code === 'KeyE') { e.preventDefault(); bufferMagic(); }
    else if (e.code === 'KeyP' || e.code === 'Escape') { e.preventDefault(); togglePause(); }
    else if (e.code === 'KeyM') toggleSound();
    else if (KEY_MOVE[e.code]) e.preventDefault();
  });
  window.addEventListener('keyup', function (e) {
    Input.keys[e.code] = false;
    if (e.code === 'Space' || e.code === 'KeyJ') onAttackUp();
  });
  window.addEventListener('blur', function () { Input.keys = {}; Input.atkHeld = false; });

  /* ───────────────────────── Entity factories ───────────────────────── */
  function makePlayer(kn) {
    return {
      kind: 'player', kn: kn, look: kn.look, body: 'human',
      x: 90, y: FLOOR_NEAR - BAND * 0.45, z: 0, vz: 0, face: 1,
      hp: kn.hp, maxHp: kn.hp, vials: kn.vials, maxVials: CFG.maxVials,
      state: 'idle', stateT: 0, walkPhase: 0,
      atk: null, combo: 0, comboT: 0,
      hurt: 0, down: 0, invuln: 0, guard: 0,
      kx: 0, ky: 0, mount: null, charge: 0,
      flash: 0, dead: false, power: 1
    };
  }

  function makeFoe(typeId, x, y, hpScale) {
    var def = FOES[typeId];
    var hp = Math.round(def.hp * (hpScale || 1));
    return {
      kind: 'foe', type: typeId, def: def, look: def.look, body: def.body,
      x: x, y: clamp(y, FLOOR_FAR, FLOOR_NEAR), z: 0, vz: 0,
      face: -1, hp: hp, maxHp: hp,
      state: 'idle', stateT: 0, walkPhase: 0, think: rand(0.1, 0.7),
      atk: null, hurt: 0, down: 0, invuln: 0, dead: false, deadT: 0,
      kx: 0, ky: 0, attacker: false, flee: 0, hops: 0, flash: 0,
      slot: { dx: 0, dy: 0 }, slotT: 0, mount: null, scale: def.scale || 1
    };
  }

  function makeMount(defId, x, y, rider) {
    var def = MOUNTS[defId];
    return {
      kind: 'mount', def: def, look: def.look, body: 'drake',
      x: x, y: clamp(y, FLOOR_FAR, FLOOR_NEAR), z: 0, vz: 0, face: -1,
      hp: def.hp, maxHp: def.hp, rider: rider || null, ridden: false,
      state: 'idle', stateT: 0, walkPhase: 0, breath: 0, cool: 0,
      hurt: 0, flash: 0, leaving: 0, dead: false, scale: def.scale
    };
  }

  function makeBoss(defId, x) {
    var def = BOSSES[defId];
    return {
      kind: 'foe', type: 'boss', bossId: defId, def: def, look: def.look, body: 'dragon',
      x: x, y: FLOOR_FAR + BAND * 0.42, z: 0, vz: 0, face: -1,
      hp: def.hp, maxHp: def.hp, scale: def.scale,
      state: 'wake', stateT: 0, walkPhase: 0, think: 1.2,
      atk: null, hurt: 0, down: 0, invuln: 0, dead: false, deadT: 0,
      kx: 0, ky: 0, attacker: true, flash: 0, phase: 1, breath: 0,
      slot: { dx: 0, dy: 0 }, slotT: 0, wing: 0, fly: 0
    };
  }

  function makePickup(type, x, y, up) {
    return {
      kind: 'pickup', type: type, x: x, y: clamp(y, FLOOR_FAR, FLOOR_NEAR),
      z: up === undefined ? 34 : up, vz: up === undefined ? 210 : 260,
      vx: rand(-40, 40), life: 16, bob: rand(0, 6.28), landed: false
    };
  }

  function makeShot(kind, x, y, z, vx, vy, dmg, owner) {
    return { kind: 'shot', type: kind, x: x, y: y, z: z, vx: vx, vy: vy, vz: 0,
             dmg: dmg, owner: owner, spin: 0, life: 3.4, dead: false };
  }

  function spark(x, y, z, color, count, spread, opts) {
    opts = opts || {};
    for (var i = 0; i < count; i++) {
      var a = rand(0, Math.PI * 2);
      G.parts.push({
        x: x, y: y, z: z,
        vx: Math.cos(a) * rand(20, spread), vy: Math.sin(a) * rand(6, spread * 0.22),
        vz: rand(20, spread * 0.9), g: opts.g === undefined ? -900 : opts.g,
        life: opts.life || rand(0.28, 0.6), maxLife: 0.6,
        size: opts.size || rand(2, 5), color: color, glow: !!opts.glow
      });
    }
  }

  function floater(x, y, z, text, color, big) {
    G.floats.push({ x: x, y: y, z: z, text: text, color: color, life: 0.85, big: !!big });
  }

  function banner(text, time) {
    G.banner = text;
    G.bannerT = time || 1.4;
    var el = document.getElementById('banner');
    el.textContent = text;
    el.classList.remove('hidden');
    // restart the entrance animation
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
  }

  var toastTimer = null;
  function toast(text) {
    var el = document.getElementById('toast');
    el.textContent = text;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.add('hidden'); }, 1700);
  }

  /* ───────────────────────── Stage building ───────────────────────── */
  // Scenery kinds each stage dresses its roadside with.
  var STAGE_PROPS = [
    ['tree', 'tree', 'tree', 'bush', 'rock', 'stump'],
    ['post', 'rock', 'ruin', 'bush', 'post'],
    ['rock', 'ruin', 'spire', 'rock', 'stump'],
    ['pine', 'pine', 'pine', 'ruin', 'rock', 'post'],
    ['bones', 'stump', 'rock', 'bones', 'ruin'],
    ['spire', 'rock', 'bones', 'spire', 'ruin']
  ];

  function seeded(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function buildProps(stage, index) {
    var kinds = STAGE_PROPS[index % STAGE_PROPS.length];
    var rnd = seeded(1337 + index * 7919);
    var props = [];
    for (var x = -140; x < stage.len + 300; x += 96 + rnd() * 120) {
      var roll = rnd();
      var kind = kinds[Math.floor(rnd() * kinds.length)];
      var y, layer;
      if (roll < 0.62) {                       // the far verge
        layer = 'back';
        y = FLOOR_FAR - 4 - rnd() * 26;
      } else if (roll < 0.84) {                // at the road's far edge
        layer = 'band';
        y = FLOOR_FAR + rnd() * 14;
      } else {                                 // in front of the camera
        layer = 'front';
        y = FLOOR_NEAR + 26 + rnd() * 52;
      }
      props.push({
        kind: kind, layer: layer, x: x, y: y,
        size: 0.62 + rnd() * 0.5, flip: rnd() < 0.5, sway: rnd() * 6.28
      });
    }
    return props;
  }

  function buildMotes(stage) {
    var motes = [];
    var n = stage.pal.motes === 'none' ? 0 : 46;
    for (var i = 0; i < n; i++) {
      motes.push({ x: Math.random(), y: Math.random(), v: rand(0.3, 1), p: rand(0, 6.28), s: rand(1.4, 3.6) });
    }
    return motes;
  }

  function maxCam() { return Math.max(0, G.stage.len - view.dw); }

  function currentGate() {
    return G.gateIndex < G.stage.gates.length ? G.stage.gates[G.gateIndex] : null;
  }

  function combatants() {
    var live = [];
    for (var i = 0; i < G.foes.length; i++) {
      var f = G.foes[i];
      if (f.dead || f.type === 'chest' || f.type === 'thief') continue;
      live.push(f);
    }
    return live;
  }

  function hpScale() { return 1 + G.stageIndex * 0.1; }

  function spawnSide(side, y) {
    // side -1 spawns behind the camera, +1 ahead of it
    var cx = G.cam.x;
    return side < 0 ? cx - CFG.spawnMargin * 0.28 : cx + view.dw + CFG.spawnMargin * 0.28;
  }

  function openGate(gate) {
    G.gateOpen = true;
    G.cam.lock = true;
    G.cam.lockX = clamp(gate.x - view.dw * 0.62, 0, maxCam());

    if (gate.boss) {
      var boss = makeBoss(gate.boss, G.cam.lockX + view.dw * 0.82);
      G.foes.push(boss);
      G.boss = boss;
      banner(boss.def.name.toUpperCase(), 2);
      Sfx.play('roar');
      G.cam.shake = 16;
      showBossBar(boss);
      return;
    }

    var list = gate.foes || [];
    var delay = 0;
    for (var i = 0; i < list.length; i++) {
      var typeId = list[i][0];
      var count = list[i][1];
      for (var c = 0; c < count; c++) {
        var side = chance(0.62) ? 1 : -1;
        var y = rand(FLOOR_FAR + 14, FLOOR_NEAR - 8);
        var foe = makeFoe(typeId, spawnSide(side, y), y, hpScale());
        foe.face = side > 0 ? -1 : 1;
        foe.think = delay;
        delay += rand(0.1, 0.35);
        if (FOES[typeId].mount) {
          var mount = makeMount(FOES[typeId].mount, foe.x, foe.y, foe);
          mount.face = foe.face;
          foe.mount = mount;
          G.mounts.push(mount);
        }
        G.foes.push(foe);
      }
    }
    if (gate.chest) {
      var chest = makeFoe('bandit', gate.x + rand(-60, 90), rand(FLOOR_FAR + 20, FLOOR_NEAR - 20), 1);
      chest.type = 'chest';
      chest.body = 'chest';
      chest.hp = chest.maxHp = 1;
      chest.def = { name: 'Strongbox', gold: 0, power: 0, reach: 0, speed: 0, ai: 'prop' };
      G.foes.push(chest);
    }
    Sfx.play('gate');
    banner('HOLD THE ROAD', 1.1);
  }

  function closeGate() {
    G.gateOpen = false;
    G.cam.lock = false;
    G.gateIndex++;
    if (G.gateIndex >= G.stage.gates.length) {
      banner('THE ROAD IS OPEN', 1.3);
    } else {
      banner('GO  →', 1.1);
    }
    Sfx.play('gate');
  }

  function updateGates() {
    var gate = currentGate();
    if (!G.gateOpen) {
      if (gate && G.player.x >= gate.x - view.dw * 0.42) openGate(gate);
      return;
    }
    if (combatants().length === 0) closeGate();
  }

  /* ───────────────────────── Stage lifecycle ───────────────────────── */
  function newRun(knight) {
    G.knight = knight;
    G.run = {
      hp: knight.hp, maxHp: knight.hp, vials: knight.vials,
      gold: 0, kills: 0, furthest: 0
    };
    Store.data.knight = knight.id;
    Store.data.runs++;
    Store.save();
  }

  function startStage(index, freshHp) {
    G.stageIndex = clamp(index, 0, STAGES.length - 1);
    G.stage = STAGES[G.stageIndex];
    G.foes.length = 0;
    G.mounts.length = 0;
    G.pickups.length = 0;
    G.shots.length = 0;
    G.parts.length = 0;
    G.floats.length = 0;
    G.props = buildProps(G.stage, G.stageIndex);
    G.motes = buildMotes(G.stage);
    G.gateIndex = 0;
    G.gateOpen = false;
    G.stageDone = false;
    G.boss = null;
    G.gold = 0;
    G.kills = 0;
    G.time = 0;
    G.hitStop = 0;
    G.flash = 0;

    var p = makePlayer(G.knight);
    p.hp = freshHp ? p.maxHp : clamp(G.run.hp + p.maxHp * 0.4, 1, p.maxHp);
    p.vials = freshHp ? G.knight.vials : G.run.vials;
    G.player = p;

    G.cam.x = 0;
    G.cam.shake = 0;
    G.cam.lock = false;

    hideBossBar();
    renderHud();
    banner(G.stage.name.toUpperCase(), 1.7);
    G.dying = false;
  }

  function stageCleared() {
    if (G.stageDone) return;
    G.stageDone = true;
    G.run.hp = G.player.hp;
    G.run.vials = G.player.vials;
    G.run.gold += G.gold;
    G.run.kills += G.kills;
    Store.data.gold = (Store.data.gold || 0) + G.gold;
    Store.data.best = Math.max(Store.data.best || 0, G.stageIndex + 1);
    if (G.stageIndex + 1 >= STAGES.length) Store.data.clears++;
    Store.data.save = G.stageIndex + 1 < STAGES.length
      ? { stage: G.stageIndex + 1, knight: G.knight.id, hp: G.run.hp, vials: G.run.vials, gold: G.run.gold, kills: G.run.kills }
      : null;
    Store.save();
    Sfx.play('clear');
    setTimeout(function () {
      if (G.stageIndex + 1 >= STAGES.length) showWin();
      else showClear();
    }, 900);
  }

  function playerDown() {
    if (G.screen !== 'play' || G.dying) return;
    G.dying = true;
    Sfx.play('defeat');
    setTimeout(function () { G.dying = false; showOver(); }, 1300);
  }

  /* ───────────────────────── Combat ───────────────────────── */
  G.fx = [];                               // full-screen flourishes (magic, shockwaves)

  function activeRider(f) { return f.mount && !f.mount.dead ? f.mount : null; }

  function bodyTop(e) {
    var s = (e.scale || 1) * scaleOf(e.y);
    if (e.body === 'dragon') return 128 * s;
    if (e.body === 'drake') return 104 * s;
    if (e.body === 'chest') return 40 * s;
    if (e.body === 'gnome') return 56 * s;
    return 104 * s;
  }

  function canAct(e) {
    return !e.dead && e.down <= 0 && e.hurt <= 0;
  }

  function faceToward(e, target) {
    e.face = target.x < e.x ? -1 : 1;
  }

  // Hits land in a box in front of the attacker: along x by reach, across depth
  // by CFG.depthHit, and roughly at the attacker's height.
  function inSwing(attacker, target, reach) {
    // Big bodies are wide: measure to the flank, not to the centre point.
    var girth = target.body === 'dragon' ? 58 * (target.scale || 1)
              : target.body === 'drake' ? 26 * (target.scale || 1) : 0;
    var dx = (target.x - attacker.x) * attacker.face;
    if (dx < -22 - girth || dx > reach + 24 + girth) return false;
    if (Math.abs(target.y - attacker.y) > CFG.depthHit + (target.body === 'dragon' ? 40 : 0)) return false;
    var dz = Math.abs((target.z || 0) - (attacker.z || 0));
    if (dz > 78 + (target.body === 'dragon' ? 90 : 0)) return false;
    return true;
  }

  function playerTarget() {
    // While mounted the drake soaks the blows.
    var p = G.player;
    return p.mount && !p.mount.dead ? p.mount : p;
  }

  function damage(target, amount, opts) {
    opts = opts || {};
    if (!target || target.dead) return false;
    if (target.kind === 'player' && (target.invuln > 0 || target.down > 0)) return false;
    if (target.kind === 'mount' && target.leaving > 0) return false;

    var dealt = Math.max(1, Math.round(amount));
    var guarded = false;
    if (target.def && target.def.guard && target.state !== 'swing' && target.state !== 'recover' &&
        opts.dir && opts.dir !== target.face && chance(target.def.guard)) {
      // Brutes block blows that come at the face of their shield.
      dealt = Math.max(1, Math.round(dealt * 0.25));
      guarded = true;
    }

    target.hp -= dealt;
    target.flash = 0.14;

    if (guarded) {
      Sfx.play('guard');
      spark(target.x + target.face * 16, target.y, bodyTop(target) * 0.5, '#e8eef8', 5, 130);
    } else {
      spark(opts.hx || target.x, target.y, opts.hz || bodyTop(target) * 0.55,
            opts.color || '#ffd77a', opts.big ? 12 : 7, opts.big ? 260 : 170, { glow: true });
      if (target.kind === 'foe' || target.kind === 'mount') {
        floater(target.x, target.y, bodyTop(target) * 0.9, String(dealt), opts.big ? '#ffb347' : '#ffe9a8', opts.big);
      }
    }

    var dir = opts.dir || (target.x < (opts.fromX === undefined ? target.x - 1 : opts.fromX) ? -1 : 1);
    var weight = (target.def && target.def.weight) || target.weight || 1;
    if (target.body === 'dragon') weight = 9;
    if (!guarded && opts.knock) target.kx += (opts.knock / weight) * dir;

    if (target.hp <= 0) {
      killEntity(target, opts);
      return true;
    }

    if (guarded) return true;
    if (target.kind === 'player') {
      target.hurt = CFG.hurtTime;
      target.state = 'hurt';
      target.combo = 0;
      target.atk = null;
      Sfx.play('hurt');
      G.cam.shake = Math.max(G.cam.shake, 6);
      G.flash = Math.max(G.flash, 0.18);
      renderHud();
    } else if (opts.launch && target.body !== 'dragon') {
      target.down = CFG.downTime;
      target.state = 'down';
      target.vz = 300;
      target.atk = null;
      Sfx.play('down');
      G.cam.shake = Math.max(G.cam.shake, opts.shake || 5);
    } else if (target.type === 'boss') {
      // A wyrm only flinches — its state machine keeps running.
      target.hurt = CFG.hurtTime * 0.4;
      Sfx.play('hit');
    } else {
      target.hurt = CFG.hurtTime;
      target.state = 'hurt';
      target.atk = null;
      Sfx.play('hit');
    }
    if (target === G.boss) renderBossBar();
    return true;
  }

  function dropLoot(x, y, rolls) {
    for (var i = 0; i < rolls; i++) {
      var r = Math.random();
      var type = r < 0.52 ? 'gold' : r < 0.76 ? 'vial' : r < 0.94 ? 'meat' : 'shard';
      G.pickups.push(makePickup(type, x + rand(-24, 24), y + rand(-10, 10)));
    }
  }

  function killEntity(e, opts) {
    if (e.dead) return;
    e.dead = true;
    e.deadT = 0;
    e.hp = 0;

    if (e.kind === 'mount') {
      // A beaten drake shakes its rider loose and limps off the road.
      e.leaving = 2.2;
      e.dead = false;
      e.hp = 1;
      if (e.ridden && G.player.mount === e) dismount(true);
      if (e.rider && !e.rider.dead) e.rider.mount = null;
      e.rider = null;
      spark(e.x, e.y, 50, '#cfe0ea', 14, 240);
      return;
    }

    if (e.kind === 'player') {
      e.state = 'down';
      e.down = 999;
      playerDown();
      return;
    }

    if (e.type === 'chest') {
      Sfx.play('chest');
      spark(e.x, e.y, 30, '#f2c14e', 18, 260, { glow: true });
      dropLoot(e.x, e.y, randInt(2, 4));
      return;
    }

    G.kills++;
    var gold = e.def.gold || 0;
    if (gold) {
      G.gold += gold;
      floater(e.x, e.y, bodyTop(e), '+' + gold, '#f2c14e');
      Sfx.play('coin');
    }
    if (e.mount) { e.mount.rider = null; e.mount = null; }         // unseated: the drake is free

    if (e.type === 'boss') {
      G.cam.shake = 22;
      Sfx.play('roar');
      spark(e.x, e.y, 120, '#ff8a3c', 40, 400, { glow: true, life: 1.2 });
      dropLoot(e.x, e.y - 10, 5);
      hideBossBar();
      setTimeout(stageCleared, 1400);
    } else if (chance(0.34)) {
      dropLoot(e.x, e.y, 1);
    }
    renderHud();
  }

  function swingHits(attacker, shape, dmg, opts) {
    opts = opts || {};
    var reach = (opts.reach || 46) * (shape.reach || 1);
    var hitAny = false;
    var list = opts.vsPlayer ? [playerTarget()] : G.foes.concat(G.mounts);

    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (!t || t.dead || t === attacker) continue;
      if (!opts.vsPlayer && t.kind === 'mount') {
        // ridden, manned or waiting to be claimed — never the thing you hit
        continue;
      }
      if (t.down > 0) continue;
      if (attacker.hitList && attacker.hitList.indexOf(t) >= 0) continue;
      if (!inSwing(attacker, t, reach)) continue;

      if (attacker.hitList) attacker.hitList.push(t);
      damage(t, dmg, {
        dir: attacker.face, knock: shape.knock, launch: shape.launch,
        hx: attacker.x + attacker.face * reach * 0.7, hz: bodyTop(t) * 0.55,
        big: !!shape.launch, shake: shape.shake, color: opts.color
      });
      hitAny = true;
    }
    if (hitAny) {
      G.hitStop = Math.max(G.hitStop, shape.launch ? CFG.hitStop * 1.6 : CFG.hitStop);
      if (shape.shake) G.cam.shake = Math.max(G.cam.shake, shape.shake);
    }
    return hitAny;
  }

  /* ───────────────────────── Player ───────────────────────── */
  function playerDamage() { return 12 * G.knight.power * G.player.power; }

  function startPlayerAttack(kind, shape) {
    var p = G.player;
    p.atk = { shape: shape, t: 0, kind: kind };
    p.hitList = [];
    p.state = 'attack';
    Sfx.play(kind === 'heavy' ? 'heavy' : 'swing');
  }

  function tryMount() {
    var p = G.player;
    for (var i = 0; i < G.mounts.length; i++) {
      var m = G.mounts[i];
      if (m.ridden || m.rider || m.leaving > 0) continue;
      if (Math.abs(m.x - p.x) < 74 && Math.abs(m.y - p.y) < 40) {
        p.mount = m;
        m.ridden = true;
        m.face = p.face;
        p.state = 'idle';
        p.atk = null;
        Sfx.play('mount');
        toast('You take the saddle — ⚔ breathes fire');
        spark(m.x, m.y, 40, '#ffd77a', 14, 220, { glow: true });
        return true;
      }
    }
    return false;
  }

  function dismount(thrown) {
    var p = G.player;
    var m = p.mount;
    if (!m) return;
    p.mount = null;
    m.ridden = false;
    p.x = m.x - m.face * 40;
    p.y = m.y;
    p.z = thrown ? 40 : 20;
    p.vz = thrown ? 280 : 160;
    p.invuln = thrown ? CFG.invulnAfterDown : 0.4;
    if (thrown) {
      p.state = 'down';
      p.down = 0.6;
    }
    Sfx.play('land');
  }

  function castMagic() {
    var p = G.player;
    if (p.vials <= 0) { toast('No vials left'); return; }
    var spell = G.knight.magic;
    var vials = p.vials;
    p.vials = 0;
    p.state = 'magic';
    p.stateT = 0;
    p.atk = null;
    p.invuln = Math.max(p.invuln, 1.3);
    Sfx.play('magic');
    G.cam.shake = 14;
    G.flash = 0.5;
    G.fx.push({ type: spell.kind, t: 0, dur: 1.25, color: spell.color, power: vials });

    var total = spell.power * vials;
    var live = G.foes.concat(G.mounts);
    for (var i = 0; i < live.length; i++) {
      var f = live[i];
      if (!f || f.dead || f.type === 'chest') continue;
      if (f.kind === 'mount') continue;
      if (Math.abs(f.x - p.x) > view.dw * 0.75) continue;
      damage(f, total, { dir: f.x < p.x ? -1 : 1, knock: 210, launch: true, big: true, color: spell.color });
    }
    for (var s = 0; s < 26; s++) {
      spark(p.x + rand(-view.dw * 0.4, view.dw * 0.4), rand(FLOOR_FAR, FLOOR_NEAR),
            rand(10, 140), spell.color, 3, 260, { glow: true, life: rand(0.5, 1) });
    }
    renderHud();
  }

  function mountBreath() {
    var p = G.player;
    var m = p.mount;
    if (!m || m.cool > 0) return;
    m.cool = 0.52;
    m.breath = 0.3;
    Sfx.play('fire');
    for (var i = 0; i < 7; i++) {
      var sh = makeShot('flame', m.x + m.face * 52, m.y + rand(-10, 10), 58 + rand(-10, 14),
                        m.face * rand(360, 520), rand(-24, 24), m.def.breath, 'player');
      sh.life = 0.42;
      G.shots.push(sh);
    }
  }

  function updatePlayer(dt) {
    var p = G.player;
    var mount = p.mount && !p.mount.dead && p.mount.leaving <= 0 ? p.mount : null;
    if (p.mount && !mount) p.mount = null;

    p.stateT += dt;
    if (p.invuln > 0) p.invuln -= dt;
    if (p.flash > 0) p.flash -= dt;
    if (p.comboT > 0) { p.comboT -= dt; if (p.comboT <= 0) p.combo = 0; }
    if (Input.atkHeld) Input.atkHold += dt;
    p.charge = Input.atkHeld ? clamp((Input.atkHold - 0.2) / 0.32, 0, 1) : 0;

    // stick or keyboard
    var kv = keyVector();
    var mx = Input.mx || kv[0];
    var my = Input.my || kv[1];

    if (p.down > 0) {
      p.down -= dt;
      if (p.down <= 0 && p.hp > 0) {
        p.state = 'idle';
        p.invuln = CFG.invulnAfterDown;
      }
    } else if (p.hurt > 0) {
      p.hurt -= dt;
      if (p.hurt <= 0) p.state = 'idle';
    } else if (p.state === 'magic') {
      if (p.stateT > 1.1) p.state = 'idle';
    } else if (p.atk) {
      var a = p.atk;
      a.t += dt;
      var shape = a.shape;
      if (a.t >= shape.hitAt && a.t < shape.hitAt + shape.hitFor) {
        swingHits(p, shape, playerDamage() * shape.dmg, { reach: G.knight.reach });
      }
      if (a.t >= shape.dur) {
        p.atk = null;
        p.state = p.z > 0 ? 'jump' : 'idle';
        p.comboT = CFG.comboWindow;
      }
    } else {
      // ── free to act ──
      var speed = mount ? mount.def.speed : G.knight.speed;
      var moving = Math.abs(mx) > 0.02 || Math.abs(my) > 0.02;
      if (moving) {
        p.x += mx * speed * dt;
        p.y += my * speed * CFG.depthSpeed * dt;
        if (Math.abs(mx) > 0.12) p.face = mx < 0 ? -1 : 1;
        p.state = p.z > 0 ? 'jump' : 'walk';
        p.walkPhase += dt * (6 + Math.abs(mx) * 5);
      } else if (p.z <= 0) {
        p.state = 'idle';
        p.walkPhase += dt * 2;
      }

      if (Input.magicBuf > 0) {
        Input.magicBuf = 0;
        if (mount) toast('Not from the saddle');
        else castMagic();
      }
      else if (Input.jumpBuf > 0) {
        Input.jumpBuf = 0;
        if (mount) { dismount(false); }
        else if (p.z <= 0) { p.vz = CFG.jumpV; p.z = 0.1; p.state = 'jump'; Sfx.play('jump'); }
      } else if (Input.atkBuf > 0) {
        Input.atkBuf = 0;
        if (mount) {
          mountBreath();
        } else if (!tryMount()) {
          if (p.z > 0) {
            startPlayerAttack('air', AIR);
          } else if (Input.heavyBuf > 0) {
            Input.heavyBuf = 0;
            startPlayerAttack('heavy', HEAVY);
            p.combo = 0;
          } else {
            var step = p.comboT > 0 ? clamp(p.combo, 0, COMBO.length - 1) : 0;
            startPlayerAttack('light', COMBO[step]);
            p.combo = (step + 1) % COMBO.length;
            p.comboT = CFG.comboWindow;
          }
        }
      }
    }

    // gravity & friction
    if (p.z > 0 || p.vz !== 0) {
      p.vz += CFG.gravity * dt;
      p.z += p.vz * dt;
      if (p.z <= 0) {
        p.z = 0;
        if (p.vz < -240) { Sfx.play('land'); spark(p.x, p.y, 4, '#cbbfa8', 5, 90, { g: -500 }); }
        p.vz = 0;
        if (p.state === 'jump') p.state = 'idle';
      }
    }
    if (p.kx) {
      p.x += p.kx * dt;
      p.kx -= p.kx * CFG.knockFriction * dt;
      if (Math.abs(p.kx) < 6) p.kx = 0;
    }

    // keep the knight inside the band and inside the camera
    p.y = clamp(p.y, FLOOR_FAR, FLOOR_NEAR);
    var loX = G.cam.x + 24;
    var hiX = G.cam.x + view.dw - 24;
    if (!G.cam.lock) hiX = Math.min(hiX, G.stage.len - 20);
    p.x = clamp(p.x, loX, hiX);

    if (mount) {
      mount.x = p.x;
      mount.y = p.y;
      mount.z = p.z;
      mount.face = p.face;
      mount.walkPhase = p.walkPhase;
      if (mount.cool > 0) mount.cool -= dt;
      if (mount.breath > 0) mount.breath -= dt;
    }

    // stage end
    if (!G.stageDone && G.gateIndex >= G.stage.gates.length && p.x >= G.stage.len - 40) stageCleared();
  }

  /* ───────────────────────── Foe behaviour ───────────────────────── */
  var attackerTimer = 0;

  function assignAttackers(dt) {
    attackerTimer -= dt;
    if (attackerTimer > 0) return;
    attackerTimer = 0.45;
    var p = G.player;
    var live = combatants().slice();
    live.sort(function (a, b) { return Math.abs(a.x - p.x) - Math.abs(b.x - p.x); });
    for (var i = 0; i < live.length; i++) {
      live[i].attacker = i < CFG.maxAttackers || live[i].type === 'boss';
    }
  }

  function foeShape(def) {
    return { hitAt: 0, hitFor: 0.12, dmg: 1, knock: 140, reach: 1 };
  }

  function startFoeAttack(f) {
    f.atk = { t: 0, phase: 'windup', swung: false };
    f.state = 'windup';
    f.hitList = [];
  }

  function foeStrike(f) {
    var def = f.def;
    var reach = activeRider(f) ? 78 : def.reach;
    Sfx.play('swing');
    swingHits(f, { hitAt: 0, hitFor: 0.1, dmg: 1, knock: 170, reach: 1 }, def.power, {
      vsPlayer: true, reach: reach
    });
  }

  function throwAxe(f) {
    var p = playerTarget();
    var dx = p.x - f.x;
    var dy = p.y - f.y;
    var len = Math.max(40, Math.hypot(dx, dy));
    var speed = 360;
    var shot = makeShot('axe', f.x + f.face * 22, f.y, 58, dx / len * speed, dy / len * speed * 0.5, f.def.power, f);
    G.shots.push(shot);
    Sfx.play('swing');
  }

  function breatheFire(f, dmg) {
    var p = playerTarget();
    var dy = clamp((p.y - f.y) * 0.5, -70, 70);
    for (var i = 0; i < 5; i++) {
      var sh = makeShot('flame', f.x + f.face * 40 * (f.scale || 1), f.y + rand(-8, 8),
                        bodyTop(f) * 0.52, f.face * rand(300, 460), dy * rand(0.4, 1) + rand(-18, 18), dmg, f);
      sh.life = 0.46;
      G.shots.push(sh);
    }
    Sfx.play('fire');
  }

  function updateFoe(f, dt) {
    var p = G.player;
    var pt = playerTarget();

    if (f.flash > 0) f.flash -= dt;
    if (f.lastHp === undefined) f.lastHp = f.hp;
    if (f.hp < f.lastHp && f.type === 'thief') {
      // Thieves carry the good stuff loose in a sack.
      G.pickups.push(makePickup(chance(0.55) ? 'vial' : 'gold', f.x, f.y));
      Sfx.play('coin');
    }
    f.lastHp = f.hp;

    if (f.dead) {
      f.deadT += dt;
      f.z = Math.max(0, f.z + f.vz * dt);
      f.vz += CFG.gravity * dt;
      f.x += f.kx * dt;
      f.kx -= f.kx * CFG.knockFriction * dt;
      return;
    }

    if (f.type === 'chest') {
      f.walkPhase += dt;
      return;
    }
    if (f.type === 'boss') { updateBoss(f, dt); return; }

    f.stateT += dt;

    if (f.down > 0) {
      f.down -= dt;
      if (f.down <= 0) { f.state = 'idle'; f.invuln = 0.3; }
    } else if (f.hurt > 0) {
      f.hurt -= dt;
      if (f.hurt <= 0) f.state = 'idle';
    } else if (f.atk) {
      var def = f.def;
      f.atk.t += dt;
      if (f.atk.phase === 'windup' && f.atk.t >= def.windup) {
        f.atk.phase = 'swing';
        f.atk.t = 0;
        f.state = 'swing';
        if (f.type === 'thrower') throwAxe(f);
        else if (f.type === 'whelp') breatheFire(f, def.power);
        else foeStrike(f);
      } else if (f.atk.phase === 'swing' && f.atk.t >= 0.16) {
        f.atk.phase = 'recover';
        f.atk.t = 0;
        f.state = 'recover';
      } else if (f.atk.phase === 'recover' && f.atk.t >= def.recover) {
        f.atk = null;
        f.state = 'idle';
      }
    } else {
      var ai = f.def.ai;
      var dx = pt.x - f.x;
      var dy = pt.y - f.y;
      var dist = Math.abs(dx);
      var speed = f.def.speed;
      var vx = 0, vy = 0;

      if (ai === 'thief') {
        // Runs the other way, bouncing along the depth of the road.
        f.flee += dt;
        vx = (f.x < p.x ? -1 : 1) * speed;
        vy = Math.sin(f.flee * 3.4) * speed * 0.4;
        f.face = vx < 0 ? -1 : 1;
        f.hops = (f.hops || 0) + dt;
        if (f.z <= 0 && f.hops > 0.42) { f.hops = 0; f.vz = 420; f.z = 0.1; }
        if (f.x < G.cam.x - 200 || f.x > G.cam.x + view.dw + 200) f.dead = true;
      } else {
        faceToward(f, pt);
        f.slotT -= dt;
        if (f.slotT <= 0) {
          f.slotT = rand(0.9, 1.8);
          f.slot.dy = rand(-26, 26);
        }
        var want, reach = activeRider(f) ? 74 : f.def.reach;
        if (ai === 'thrower') {
          want = f.def.keepAway;
          if (dist < want - 30) vx = -sign(dx) * speed;
          else if (dist > want + 50) vx = sign(dx) * speed;
          vy = clamp((pt.y + f.slot.dy - f.y) * 2.2, -speed * 0.6, speed * 0.6);
          if (f.attacker && dist > 120 && dist < f.def.reach && Math.abs(dy) < 60) startFoeAttack(f);
        } else if (ai === 'whelp') {
          want = 128;
          if (dist > want + 24) vx = sign(dx) * speed;
          else if (dist < want - 50) vx = -sign(dx) * speed * 0.6;
          vy = clamp((pt.y + f.slot.dy - f.y) * 2.4, -speed * 0.6, speed * 0.6);
          if (f.attacker && dist < f.def.reach + 60 && Math.abs(dy) < 50) startFoeAttack(f);
        } else {
          want = f.attacker ? reach * 0.72 : rand(150, 190);
          var standX = pt.x - sign(dx) * want;
          if (Math.abs(standX - f.x) > 8) vx = sign(standX - f.x) * speed;
          vy = clamp((pt.y + (f.attacker ? 0 : f.slot.dy) - f.y) * 2.4, -speed * 0.62, speed * 0.62);
          if (f.attacker && dist < reach * 0.95 && Math.abs(dy) < 26 && p.down <= 0) startFoeAttack(f);
        }
        if (ai === 'shield') vx *= 0.9;
      }

      f.x += vx * dt;
      f.y += vy * CFG.depthSpeed * dt;
      f.state = (Math.abs(vx) > 4 || Math.abs(vy) > 4) ? 'walk' : 'idle';
      f.walkPhase += dt * (f.state === 'walk' ? 6.5 : 2);
    }

    // physics
    if (f.z > 0 || f.vz !== 0) {
      f.vz += CFG.gravity * dt;
      f.z += f.vz * dt;
      if (f.z <= 0) { f.z = 0; f.vz = 0; }
    }
    if (f.kx) {
      f.x += f.kx * dt;
      f.kx -= f.kx * CFG.knockFriction * dt;
      if (Math.abs(f.kx) < 6) f.kx = 0;
    }
    f.y = clamp(f.y, FLOOR_FAR, FLOOR_NEAR);
    f.x = clamp(f.x, G.cam.x - 240, G.cam.x + view.dw + 240);

    // separation so the band never turns into a single stack
    for (var i = 0; i < G.foes.length; i++) {
      var o = G.foes[i];
      if (o === f || o.dead || o.type === 'chest' || o.type === 'boss') continue;
      if (Math.abs(o.y - f.y) < 22 && Math.abs(o.x - f.x) < 40) {
        var push = (f.x < o.x ? -1 : 1) * 46 * dt;
        f.x += push;
        o.x -= push;
      }
    }

    if (f.mount) {
      f.mount.x = f.x;
      f.mount.y = f.y;
      f.mount.z = f.z;
      f.mount.face = f.face;
      f.mount.walkPhase = f.walkPhase;
      f.mount.state = f.state;
    }
  }

  /* ───────────────────────── Loose mounts ───────────────────────── */
  function updateMount(m, dt) {
    if (m.flash > 0) m.flash -= dt;
    if (m.ridden || (m.rider && !m.rider.dead)) return;    // driven by its rider or the knight

    if (m.leaving > 0) {
      m.leaving -= dt;
      m.x += m.face * -220 * dt;
      m.walkPhase += dt * 8;
      if (m.leaving <= 0) m.dead = true;
      return;
    }
    // free: shuffles about and waits to be claimed
    m.stateT += dt;
    var drift = Math.sin(m.stateT * 1.3) * 34;
    m.x += drift * dt;
    m.walkPhase += dt * 2.6;
    m.state = Math.abs(drift) > 10 ? 'walk' : 'idle';
    if (Math.abs(G.player.x - m.x) < 74 && Math.abs(G.player.y - m.y) < 40) m.face = G.player.x < m.x ? -1 : 1;
  }

  /* ───────────────────────── Dragon bosses ───────────────────────── */
  function updateBoss(b, dt) {
    var p = playerTarget();
    b.stateT += dt;
    b.wing += dt * (b.fly > 0 ? 9 : 3.2);
    if (b.flash > 0) b.flash -= dt;

    if (b.hurt > 0) b.hurt -= dt;
    if (b.phase === 1 && b.hp < b.maxHp * 0.5) {
      b.phase = 2;
      banner('IT IS ANGRY NOW', 1.2);
      Sfx.play('roar');
      G.cam.shake = 14;
      b.state = 'wake';
      b.stateT = 0;
    }

    var dx = p.x - b.x;
    var dist = Math.abs(dx);
    var speed = b.def.speed * (b.phase === 2 ? 1.28 : 1);

    switch (b.state) {
      case 'wake':
        if (b.stateT > 1.1) { b.state = 'stalk'; b.stateT = 0; }
        break;

      case 'stalk':
        b.face = dx < 0 ? -1 : 1;
        if (dist > 118) b.x += sign(dx) * speed * dt;
        b.y += clamp((p.y - b.y) * 1.6, -speed * 0.5, speed * 0.5) * dt;
        b.walkPhase += dt * 5;
        if (b.stateT > (b.phase === 2 ? 1.0 : 1.5)) {
          b.stateT = 0;
          if (dist < 190) b.state = 'claw';
          else if (b.def.flies && b.phase === 2 && chance(0.4)) b.state = 'liftoff';
          else b.state = 'breath';
          b.atkDone = false;
        }
        break;

      case 'claw':
        if (!b.atkDone && b.stateT > 0.46) {
          b.atkDone = true;
          b.hitList = [];
          Sfx.play('swing');
          swingHits(b, { hitAt: 0, hitFor: 0.1, dmg: 1, knock: 260, reach: 1 }, b.def.claw,
                    { vsPlayer: true, reach: 168 * b.scale * 0.6 });
          G.cam.shake = 8;
        }
        if (b.stateT > 1.15) { b.state = 'stalk'; b.stateT = 0; }
        break;

      case 'breath':
        b.face = dx < 0 ? -1 : 1;
        if (b.stateT > 0.55 && b.stateT < 1.5) {
          b.breath = 1;
          if (!b.puff || b.stateT - b.puff > 0.1) {
            b.puff = b.stateT;
            breatheFire(b, b.def.breath * 0.42);
          }
        } else {
          b.breath = 0;
        }
        if (b.stateT > 1.9) { b.state = 'stalk'; b.stateT = 0; b.puff = 0; }
        break;

      case 'liftoff':
        b.fly = 1;
        b.z += 420 * dt;
        if (b.z > 260) { b.state = 'soar'; b.stateT = 0; b.dropped = 0; }
        break;

      case 'soar':
        b.x += sign(p.x - b.x + (b.face * 10)) * 300 * dt;
        b.z = 260 + Math.sin(b.stateT * 3) * 18;
        b.face = p.x < b.x ? -1 : 1;
        if (b.stateT > 0.5 + b.dropped * 0.7 && b.dropped < 3) {
          b.dropped++;
          var fb = makeShot('fireball', b.x, b.y, b.z - 30, rand(-40, 40), 0, b.def.breath, b);
          fb.vz = -60;
          G.shots.push(fb);
          Sfx.play('fire');
        }
        if (b.stateT > 3.2) { b.state = 'land'; b.stateT = 0; }
        break;

      case 'land':
        b.z -= 620 * dt;
        b.y = clamp(p.y, FLOOR_FAR, FLOOR_NEAR);
        if (b.z <= 0) {
          b.z = 0;
          b.fly = 0;
          G.cam.shake = 18;
          Sfx.play('heavy');
          spark(b.x, b.y, 8, '#cbbfa8', 24, 320, { g: -600 });
          if (Math.abs(p.x - b.x) < 190 && Math.abs(p.y - b.y) < 70) {
            damage(playerTarget(), b.def.stomp, { dir: sign(p.x - b.x), knock: 240 });
          }
          b.state = 'stalk';
          b.stateT = 0;
        }
        break;

      default:
        b.state = 'stalk';
        b.stateT = 0;
        break;
    }

    if (b.kx) {
      b.x += b.kx * dt;
      b.kx -= b.kx * CFG.knockFriction * dt;
      if (Math.abs(b.kx) < 6) b.kx = 0;
    }
    b.y = clamp(b.y, FLOOR_FAR, FLOOR_NEAR);
    b.x = clamp(b.x, G.cam.x + 60, G.cam.x + view.dw - 60);
  }

  /* ───────────────────────── Shots, pickups, particles ───────────────────────── */
  function updateShots(dt) {
    for (var i = G.shots.length - 1; i >= 0; i--) {
      var s = G.shots[i];
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.spin += dt * 14;

      if (s.type === 'fireball') {
        s.vz = (s.vz || 0) - 900 * dt;
        s.z += s.vz * dt;
        if (s.z <= 0) {
          spark(s.x, s.y, 6, '#ff8a3c', 16, 300, { glow: true });
          G.cam.shake = Math.max(G.cam.shake, 7);
          if (Math.abs(playerTarget().x - s.x) < 74 && Math.abs(playerTarget().y - s.y) < 44) {
            damage(playerTarget(), s.dmg, { dir: sign(playerTarget().x - s.x), knock: 180 });
          }
          G.shots.splice(i, 1);
          continue;
        }
      }
      if (s.type === 'flame') {
        spark(s.x, s.y, s.z, chance(0.5) ? '#ffb347' : '#ff6b3c', 1, 40, { g: 120, life: 0.3, size: rand(4, 9), glow: true });
      }

      var gone = s.life <= 0 || s.x < G.cam.x - 200 || s.x > G.cam.x + view.dw + 200;
      if (gone) { G.shots.splice(i, 1); continue; }

      // contact
      if (s.owner === 'player') {
        var list = G.foes.concat(G.mounts);
        for (var j = 0; j < list.length; j++) {
          var t = list[j];
          if (!t || t.dead || t.down > 0 || t.type === 'chest') continue;
          if (t.kind === 'mount') continue;
          if (Math.abs(t.x - s.x) > 46 || Math.abs(t.y - s.y) > 34) continue;
          damage(t, s.dmg, { dir: sign(s.vx), knock: 60, color: '#ff8a3c' });
          if (s.type !== 'flame') { G.shots.splice(i, 1); }
          break;
        }
      } else {
        var pt = playerTarget();
        if (Math.abs(pt.x - s.x) < 34 && Math.abs(pt.y - s.y) < 30 && Math.abs((pt.z || 0) - s.z) < 76) {
          damage(pt, s.dmg, { dir: sign(s.vx || 1), knock: 150 });
          G.shots.splice(i, 1);
        }
      }
    }
  }

  var PICKUPS = {
    gold: { label: 'gold', color: '#f2c14e' },
    vial: { label: 'vial', color: '#6db8ff' },
    meat: { label: 'meat', color: '#d97a4a' },
    shard: { label: 'shard', color: '#c08bff' }
  };

  function collect(pk) {
    var p = G.player;
    if (pk.type === 'gold') {
      var amount = randInt(9, 24);
      G.gold += amount;
      floater(pk.x, pk.y, 60, '+' + amount, '#f2c14e');
      Sfx.play('coin');
    } else if (pk.type === 'vial') {
      if (p.vials < p.maxVials) {
        p.vials++;
        floater(pk.x, pk.y, 60, 'vial', '#6db8ff');
        Sfx.play('vial');
      } else {
        G.gold += 20;
        floater(pk.x, pk.y, 60, '+20', '#f2c14e');
        Sfx.play('coin');
      }
    } else if (pk.type === 'meat') {
      var heal = Math.round(p.maxHp * 0.26);
      p.hp = clamp(p.hp + heal, 0, p.maxHp);
      floater(pk.x, pk.y, 60, '+' + heal, '#7bd88f');
      Sfx.play('heal');
    } else if (pk.type === 'shard') {
      p.power += 0.1;
      floater(pk.x, pk.y, 60, 'power up', '#c08bff');
      toast('Rune shard — your blows bite deeper');
      Sfx.play('vial');
    }
    spark(pk.x, pk.y, 30, PICKUPS[pk.type].color, 8, 160, { glow: true });
    renderHud();
  }

  function updatePickups(dt) {
    var p = G.player;
    for (var i = G.pickups.length - 1; i >= 0; i--) {
      var pk = G.pickups[i];
      pk.life -= dt;
      if (!pk.landed) {
        pk.vz += CFG.gravity * 0.55 * dt;
        pk.z += pk.vz * dt;
        pk.x += pk.vx * dt;
        pk.vx -= pk.vx * 2.4 * dt;
        if (pk.z <= 0) { pk.z = 0; pk.vz = 0; pk.landed = true; }
      } else {
        pk.bob += dt * 3.4;
      }
      if (Math.abs(pk.x - p.x) < 38 && Math.abs(pk.y - p.y) < 30 && p.z < 60) {
        collect(pk);
        G.pickups.splice(i, 1);
        continue;
      }
      if (pk.life <= 0) G.pickups.splice(i, 1);
    }
  }

  function updateParticles(dt) {
    for (var i = G.parts.length - 1; i >= 0; i--) {
      var q = G.parts[i];
      q.life -= dt;
      if (q.life <= 0) { G.parts.splice(i, 1); continue; }
      q.vz += q.g * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.z += q.vz * dt;
      if (q.z < 0) { q.z = 0; q.vz *= -0.32; q.vx *= 0.7; }
    }
    for (var f = G.floats.length - 1; f >= 0; f--) {
      var fl = G.floats[f];
      fl.life -= dt;
      fl.z += 52 * dt;
      if (fl.life <= 0) G.floats.splice(f, 1);
    }
    for (var e = G.fx.length - 1; e >= 0; e--) {
      G.fx[e].t += dt;
      if (G.fx[e].t >= G.fx[e].dur) G.fx.splice(e, 1);
    }
  }

  /* ───────────────────────── World step ───────────────────────── */
  function step(dt) {
    G.time += dt;
    if (G.hitStop > 0) {
      G.hitStop -= dt;
      dt *= 0.18;
    }
    if (G.flash > 0) G.flash -= dt * 2;

    Input.atkBuf = Math.max(0, Input.atkBuf - dt);
    Input.jumpBuf = Math.max(0, Input.jumpBuf - dt);
    Input.magicBuf = Math.max(0, Input.magicBuf - dt);
    Input.heavyBuf = Math.max(0, Input.heavyBuf - dt);

    updatePlayer(dt);
    assignAttackers(dt);

    for (var i = G.foes.length - 1; i >= 0; i--) {
      var f = G.foes[i];
      updateFoe(f, dt);
      if (f.dead && f.deadT > 1.5) G.foes.splice(i, 1);
    }
    for (var m = G.mounts.length - 1; m >= 0; m--) {
      updateMount(G.mounts[m], dt);
      if (G.mounts[m].dead) G.mounts.splice(m, 1);
    }

    updateShots(dt);
    updatePickups(dt);
    updateParticles(dt);
    updateGates(dt);

    // camera
    var target = G.cam.lock ? G.cam.lockX : G.player.x - view.dw * 0.42;
    G.cam.x = lerp(G.cam.x, clamp(target, 0, maxCam()), 1 - Math.pow(0.0015, dt));
    if (G.cam.shake > 0) G.cam.shake = Math.max(0, G.cam.shake - dt * 34);

    if (G.bannerT > 0) {
      G.bannerT -= dt;
      if (G.bannerT <= 0) document.getElementById('banner').classList.add('hidden');
    }
    if (G.boss && G.boss.dead) { G.boss = null; hideBossBar(); }
  }

  /* ───────────────────────── Drawing: setup ───────────────────────── */
  var shakeX = 0, shakeY = 0;

  function setLayer(parallax) {
    var k = view.dpr * view.s;
    ctx.setTransform(k, 0, 0, k, (-G.cam.x * parallax + shakeX) * k, shakeY * k);
  }
  function setScreen() {
    var k = view.dpr * view.s;
    ctx.setTransform(k, 0, 0, k, 0, 0);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function ellipse(x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
  }

  function limb(x1, y1, x2, y2, w, color, cap) {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = cap || 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  /* ───────────────────────── Drawing: background ───────────────────────── */
  function drawSky(pal) {
    setScreen();
    var g = ctx.createLinearGradient(0, 0, 0, FLOOR_FAR + 30);
    g.addColorStop(0, pal.skyTop);
    g.addColorStop(0.58, pal.skyMid);
    g.addColorStop(1, pal.skyLow);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, view.dw, FLOOR_FAR + 40);

    // clouds drift slowly on their own layer
    setLayer(0.06);
    ctx.fillStyle = rgba('#ffffff', 0.1);
    var span = view.dw + 400;
    for (var i = 0; i < 7; i++) {
      var cx = ((i * 337) % span) - 100;
      var cy = 54 + ((i * 53) % 90);
      var w = 60 + (i % 3) * 34;
      ellipse(cx, cy, w, 15 + (i % 2) * 7);
      ctx.fill();
      ellipse(cx + w * 0.5, cy + 6, w * 0.55, 12);
      ctx.fill();
    }

    // sun / moon, sitting above the cloud deck
    setScreen();
    var sunX = view.dw * 0.74 - (G.cam.x * 0.03) % view.dw;
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = pal.sun;
    ellipse(sunX, 96, 58, 58);
    ctx.fill();
    ctx.globalAlpha = 0.92;
    ellipse(sunX, 96, 31, 31);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawHills(pal) {
    // far ridge
    setLayer(0.22);
    ctx.fillStyle = pal.hillFar;
    ctx.beginPath();
    ctx.moveTo(-200, FLOOR_FAR + 20);
    var x;
    for (x = -200; x < G.stage.len + view.dw; x += 70) {
      var h = 130 + Math.sin(x * 0.0071) * 54 + Math.sin(x * 0.0023) * 40;
      ctx.lineTo(x, FLOOR_FAR - h * 0.52);
    }
    ctx.lineTo(x, FLOOR_FAR + 20);
    ctx.closePath();
    ctx.fill();

    // near ridge
    setLayer(0.46);
    ctx.fillStyle = pal.hillNear;
    ctx.beginPath();
    ctx.moveTo(-200, FLOOR_FAR + 26);
    for (x = -200; x < G.stage.len + view.dw; x += 52) {
      var h2 = 78 + Math.sin(x * 0.0113 + 1.7) * 34 + Math.sin(x * 0.0041) * 26;
      ctx.lineTo(x, FLOOR_FAR - h2 * 0.45);
    }
    ctx.lineTo(x, FLOOR_FAR + 26);
    ctx.closePath();
    ctx.fill();

    // haze where the ground meets the hills
    setScreen();
    var hz = ctx.createLinearGradient(0, FLOOR_FAR - 40, 0, FLOOR_FAR + 26);
    hz.addColorStop(0, rgba(pal.fog, 0));
    hz.addColorStop(1, rgba(pal.fog, 0.55));
    ctx.fillStyle = hz;
    ctx.fillRect(0, FLOOR_FAR - 40, view.dw, 66);
  }

  function drawGround(pal) {
    setScreen();
    var g = ctx.createLinearGradient(0, FLOOR_FAR - 10, 0, DH);
    g.addColorStop(0, pal.ground);
    g.addColorStop(0.55, pal.groundAlt);
    g.addColorStop(1, shade(pal.groundAlt, -0.35));
    ctx.fillStyle = g;
    ctx.fillRect(0, FLOOR_FAR - 10, view.dw, DH - FLOOR_FAR + 10);

    // the road itself, slightly wider at the near edge
    setLayer(1);
    var left = G.cam.x - 40;
    var right = G.cam.x + view.dw + 40;
    var pg = ctx.createLinearGradient(0, FLOOR_FAR, 0, FLOOR_NEAR + 40);
    pg.addColorStop(0, pal.path);
    pg.addColorStop(1, pal.pathAlt);
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.moveTo(left, FLOOR_FAR + 4);
    ctx.lineTo(right, FLOOR_FAR + 4);
    ctx.lineTo(right, FLOOR_NEAR + 46);
    ctx.lineTo(left, FLOOR_NEAR + 46);
    ctx.closePath();
    ctx.fill();

    // ruts and stones so the scroll reads
    ctx.strokeStyle = rgba(shade(pal.pathAlt, -0.22), 0.28);
    ctx.lineWidth = 2;
    for (var r = 0; r < 2; r++) {
        var ry = FLOOR_FAR + 52 + r * 58;
      ctx.beginPath();
      for (var x = left; x < right; x += 24) {
        ctx.lineTo(x, ry + Math.sin(x * 0.02 + r) * 3);
      }
      ctx.stroke();
    }
    var start = Math.floor(left / 64) * 64;
    for (var sx = start; sx < right; sx += 64) {
      var jitter = (Math.sin(sx * 0.37) + 1) * 0.5;
      ctx.fillStyle = rgba(shade(pal.path, 0.2), 0.34);
      ellipse(sx + jitter * 30, FLOOR_FAR + 10 + jitter * 14, 7 + jitter * 4, 2.4 + jitter * 1.5);
      ctx.fill();
      ctx.fillStyle = rgba(shade(pal.pathAlt, -0.16), 0.26);
      ellipse(sx + 28 - jitter * 20, FLOOR_NEAR + 14 + jitter * 18, 10 + jitter * 6, 3 + jitter * 2);
      ctx.fill();
    }

    // grass/edge lines mark where the walkable band starts and stops
    ctx.strokeStyle = rgba(shade(pal.ground, -0.25), 0.55);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(left, FLOOR_FAR + 3);
    ctx.lineTo(right, FLOOR_FAR + 3);
    ctx.stroke();
  }

  /* ───────────────────────── Drawing: scenery ───────────────────────── */
  function drawProp(pr, pal) {
    var s = pr.size * (pr.layer === 'front' ? 1.12 : pr.layer === 'band' ? 1 : 0.92);
    var sway = Math.sin(G.time * 1.1 + pr.sway) * 2 * s;
    ctx.save();
    if (pr.layer === 'front') ctx.globalAlpha = 0.8;
    ctx.translate(pr.x, pr.y);
    ctx.scale(pr.flip ? -s : s, s);

    var dark = shade(pal.prop, -0.3);
    ctx.fillStyle = rgba('#000000', 0.12);
    ellipse(0, 0, 18, 4.5);
    ctx.fill();

    switch (pr.kind) {
      case 'tree':
        ctx.fillStyle = shade(pal.prop, -0.45);
        roundRect(-7, -66, 14, 68, 5); ctx.fill();
        ctx.fillStyle = pal.prop;
        ellipse(sway - 14, -80, 30, 26); ctx.fill();
        ellipse(sway + 16, -74, 26, 22); ctx.fill();
        ellipse(sway, -102, 32, 27); ctx.fill();
        ctx.fillStyle = rgba('#ffffff', 0.07);
        ellipse(sway - 6, -110, 18, 12); ctx.fill();
        break;
      case 'pine':
        ctx.fillStyle = shade(pal.prop, -0.5);
        roundRect(-5, -44, 10, 46, 3); ctx.fill();
        ctx.fillStyle = pal.prop;
        for (var t = 0; t < 3; t++) {
          ctx.beginPath();
          ctx.moveTo(sway * (t / 3), -128 + t * 34);
          ctx.lineTo(-26 + t * 3, -70 + t * 26);
          ctx.lineTo(26 - t * 3, -70 + t * 26);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = rgba('#ffffff', 0.12);
        ctx.beginPath();
        ctx.moveTo(sway, -128); ctx.lineTo(-10, -96); ctx.lineTo(8, -98);
        ctx.closePath(); ctx.fill();
        break;
      case 'rock':
        ctx.fillStyle = pal.prop;
        ctx.beginPath();
        ctx.moveTo(-24, 2); ctx.lineTo(-16, -22); ctx.lineTo(2, -30);
        ctx.lineTo(20, -18); ctx.lineTo(25, 2);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = rgba('#ffffff', 0.1);
        ctx.beginPath();
        ctx.moveTo(-16, -22); ctx.lineTo(2, -30); ctx.lineTo(4, -16);
        ctx.closePath(); ctx.fill();
        break;
      case 'stump':
        ctx.fillStyle = dark;
        roundRect(-14, -26, 28, 28, 6); ctx.fill();
        ctx.fillStyle = shade(pal.prop, 0.2);
        ellipse(0, -26, 14, 5); ctx.fill();
        break;
      case 'bush':
        ctx.fillStyle = pal.prop;
        ellipse(-10, -10, 15, 12); ctx.fill();
        ellipse(9, -12, 17, 13); ctx.fill();
        ellipse(0, -20, 14, 11); ctx.fill();
        break;
      case 'post':
        ctx.fillStyle = dark;
        roundRect(-4, -72, 8, 74, 3); ctx.fill();
        ctx.fillStyle = shade(pal.prop, 0.25);
        roundRect(-22, -70, 44, 10, 3); ctx.fill();
        ctx.fillStyle = rgba('#f2c14e', 0.55);
        roundRect(-14, -58 + sway * 0.6, 12, 30, 2); ctx.fill();
        break;
      case 'ruin':
        ctx.fillStyle = pal.prop;
        roundRect(-30, -54, 22, 56, 3); ctx.fill();
        roundRect(6, -80, 24, 82, 3); ctx.fill();
        ctx.fillStyle = rgba('#000000', 0.25);
        roundRect(10, -64, 12, 22, 2); ctx.fill();
        ctx.fillStyle = shade(pal.prop, 0.16);
        roundRect(-32, -60, 26, 8, 2); ctx.fill();
        break;
      case 'bones':
        ctx.strokeStyle = '#d9d0bc';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-20, 0); ctx.quadraticCurveTo(-6, -34, 12, -30);
        ctx.stroke();
        ctx.fillStyle = '#e6ded0';
        ellipse(16, -34, 11, 9); ctx.fill();
        ctx.fillStyle = rgba('#000000', 0.5);
        ellipse(12, -36, 3, 3); ctx.fill();
        break;
      case 'spire':
        ctx.fillStyle = pal.prop;
        ctx.beginPath();
        ctx.moveTo(-14, 2); ctx.lineTo(-5, -74); ctx.lineTo(6, -96);
        ctx.lineTo(12, -60); ctx.lineTo(18, 2);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = rgba('#ff8a3c', 0.22);
        ctx.beginPath();
        ctx.moveTo(-5, -74); ctx.lineTo(6, -96); ctx.lineTo(10, -66);
        ctx.closePath(); ctx.fill();
        break;
    }
    ctx.restore();
  }

  function drawProps(layer, pal) {
    setLayer(1);
    var left = G.cam.x - 200;
    var right = G.cam.x + view.dw + 200;
    for (var i = 0; i < G.props.length; i++) {
      var pr = G.props[i];
      if (pr.layer !== layer || pr.x < left || pr.x > right) continue;
      drawProp(pr, pal);
    }
  }

  function drawMotes(pal) {
    var kind = pal.motes;
    if (kind === 'none') return;
    setScreen();
    for (var i = 0; i < G.motes.length; i++) {
      var m = G.motes[i];
      var t = G.time * m.v;
      var x, y, a = 0.5;
      if (kind === 'snow') {
        x = (m.x * view.dw + Math.sin(t * 1.3 + m.p) * 26 - G.cam.x * 0.12) % view.dw;
        y = (m.y * DH + t * 42) % DH;
        ctx.fillStyle = rgba('#ffffff', 0.62);
      } else if (kind === 'embers') {
        x = (m.x * view.dw + Math.sin(t * 2 + m.p) * 18 - G.cam.x * 0.1) % view.dw;
        y = DH - ((m.y * DH + t * 62) % DH);
        ctx.fillStyle = rgba(chance(0.5) ? '#ffb347' : '#ff6b3c', 0.6);
      } else if (kind === 'ash') {
        x = (m.x * view.dw + Math.sin(t + m.p) * 30 - G.cam.x * 0.08) % view.dw;
        y = (m.y * DH + t * 26) % DH;
        ctx.fillStyle = rgba('#cfc7bd', 0.4);
      } else if (kind === 'mist') {
        x = (m.x * view.dw + t * 20 - G.cam.x * 0.14) % view.dw;
        y = FLOOR_FAR + (m.y * 160);
        ctx.fillStyle = rgba('#e8f0f8', 0.09);
        ellipse(x < 0 ? x + view.dw : x, y, m.s * 22, m.s * 5);
        ctx.fill();
        continue;
      } else {                                  // leaves, drifting near the road
        x = (m.x * view.dw + Math.sin(t * 1.6 + m.p) * 40 - G.cam.x * 0.1) % view.dw;
        y = FLOOR_FAR - 70 + (m.y * (DH - FLOOR_FAR + 70) + t * 34) % (DH - FLOOR_FAR + 70);
        ctx.fillStyle = rgba('#9dc76a', 0.45);
      }
      if (x < 0) x += view.dw;
      ellipse(x, y, m.s, m.s * (kind === 'leaves' ? 0.6 : 1));
      ctx.fill();
    }
  }

  /* ───────────────────────── Drawing: fighters ───────────────────────── */
  function drawShadow(x, y, r, z) {
    var lift = clamp(1 - (z || 0) / 320, 0.25, 1);
    ctx.fillStyle = rgba('#000000', 0.3 * lift);
    ellipse(x, y, r * lift, r * 0.34 * lift);
    ctx.fill();
  }

  // Where the weapon points, and how far the body is committed to the swing.
  function swingPose(e) {
    var pose = { angle: -0.8, reachOut: 0, lean: 0, arc: 0, crouch: 0 };
    if (!e.atk) return pose;
    var a = e.atk;
    var shape = a.shape || { dur: 0.4, hitAt: 0.12, hitFor: 0.12 };
    var t = clamp(a.t / shape.dur, 0, 1);
    var hitStart = shape.hitAt / shape.dur;
    var hitEnd = (shape.hitAt + shape.hitFor) / shape.dur;

    if (a.kind === 'air') {
      pose.angle = lerp(-1.9, 1.15, clamp(t / hitEnd, 0, 1));
      pose.lean = 0.24;
      pose.arc = t < hitEnd ? 1 : 0;
      return pose;
    }
    if (t < hitStart) {                                   // wind up
      var w = t / Math.max(0.001, hitStart);
      pose.angle = lerp(-0.8, -2.5, w);
      pose.lean = -0.16 * w;
      pose.reachOut = -4 * w;
    } else if (t < hitEnd) {                              // the blow itself
      var k = (t - hitStart) / Math.max(0.001, hitEnd - hitStart);
      pose.angle = lerp(-2.5, 0.55, k);
      pose.lean = lerp(-0.16, 0.3, k);
      pose.reachOut = lerp(-4, 12, k);
      pose.arc = 1 - k * 0.4;
    } else {                                              // follow through
      var r = (t - hitEnd) / Math.max(0.001, 1 - hitEnd);
      pose.angle = lerp(0.55, -0.8, r);
      pose.lean = lerp(0.3, 0, r);
      pose.reachOut = lerp(12, 0, r);
    }
    return pose;
  }

  // Every shape gets a dark edge: it is what makes a figure read against busy
  // ground at phone size.
  var INK = 'rgba(20,13,8,0.6)';
  function paint(fill, lw) {
    ctx.fillStyle = fill;
    ctx.fill();
    if (lw !== 0) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw || 2;
      ctx.stroke();
    }
  }

  // Weapons are drawn in the hand's frame: the grip sits at the origin and the
  // business end points along +x.
  function drawWeapon(kind, look, C) {
    switch (kind) {
      case 'sword':
        ctx.fillStyle = C('#6b4a2a');
        roundRect(-12, -2.6, 13, 5.2, 2.2); paint(C('#6b4a2a'), 1.4);
        ellipse(-13, 0, 3.4, 3.4); paint(C(look.trim), 1.4);
        roundRect(0, -9, 5, 18, 2); paint(C(look.trim), 1.6);
        ctx.beginPath();
        ctx.moveTo(5, -4.6); ctx.lineTo(33, -3.6); ctx.lineTo(42, 0);
        ctx.lineTo(33, 3.6); ctx.lineTo(5, 4.6);
        ctx.closePath(); paint(C('#e9eef6'), 1.8);
        ctx.beginPath();
        ctx.moveTo(8, -1.4); ctx.lineTo(32, -1); ctx.lineTo(32, 0.4); ctx.lineTo(8, 0.8);
        ctx.closePath(); paint(C(rgba('#ffffff', 0.85)), 0);
        break;

      case 'axe':
        roundRect(-18, -3, 54, 6, 3); paint(C('#7a5535'), 1.6);
        ctx.beginPath();                                   // crescent head
        ctx.moveTo(24, -7);
        ctx.quadraticCurveTo(48, -24, 47, -2);
        ctx.quadraticCurveTo(48, 20, 24, 7);
        ctx.quadraticCurveTo(33, 0, 24, -7);
        ctx.closePath(); paint(C('#cfd6e2'), 2);
        ctx.beginPath();
        ctx.moveTo(30, -5); ctx.quadraticCurveTo(42, -15, 42, -3);
        ctx.quadraticCurveTo(42, 9, 30, 3);
        ctx.closePath(); paint(C(rgba('#ffffff', 0.4)), 0);
        roundRect(20, -8, 6, 16, 2); paint(C(look.trim), 1.4);
        break;

      case 'mace':
        roundRect(-14, -2.8, 34, 5.6, 2.6); paint(C('#6b5233'), 1.4);
        ctx.save();
        ctx.translate(28, 0);
        for (var i = 0; i < 6; i++) {
          var a = i * Math.PI / 3 + 0.3;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7);
          ctx.lineTo(Math.cos(a + 0.22) * 16, Math.sin(a + 0.22) * 16);
          ctx.lineTo(Math.cos(a + 0.5) * 7, Math.sin(a + 0.5) * 7);
          ctx.closePath(); paint(C('#b9c4d0'), 1.4);
        }
        ellipse(0, 0, 9, 9); paint(C('#8e9aa6'), 1.8);
        ctx.restore();
        break;

      case 'spear':
        roundRect(-28, -2.4, 84, 4.8, 2.4); paint(C('#8a6a42'), 1.5);
        ctx.beginPath();                                   // leaf blade
        ctx.moveTo(52, 0);
        ctx.quadraticCurveTo(62, -7, 74, 0);
        ctx.quadraticCurveTo(62, 7, 52, 0);
        ctx.closePath(); paint(C('#e9eef6'), 1.8);
        roundRect(44, -4.5, 9, 9, 3); paint(C(look.plume || look.trim), 1.4);
        break;

      case 'rune':
        roundRect(-11, -2.6, 12, 5.2, 2.2); paint(C(shade(look.plate, 0.15)), 1.4);
        roundRect(0, -7, 4.5, 14, 2); paint(C(look.trim), 1.5);
        ctx.beginPath();
        ctx.moveTo(4, -5); ctx.lineTo(28, -4); ctx.lineTo(36, 0);
        ctx.lineTo(28, 4); ctx.lineTo(4, 5);
        ctx.closePath(); paint(C('#efe4ff'), 1.8);
        ctx.globalAlpha = 0.55 + Math.sin(G.time * 6) * 0.25;
        ctx.beginPath();
        ctx.moveTo(8, -1.6); ctx.lineTo(30, 0); ctx.lineTo(8, 1.6);
        ctx.closePath(); paint(C(look.trim), 0);
        ctx.globalAlpha = 1;
        break;

      case 'sack':
        ctx.beginPath();
        ctx.moveTo(-2, -10);
        ctx.quadraticCurveTo(22, -8, 20, 6);
        ctx.quadraticCurveTo(16, 18, 4, 16);
        ctx.quadraticCurveTo(-6, 12, -2, -10);
        ctx.closePath(); paint(C('#b08a4a'), 1.8);
        roundRect(-4, -14, 13, 6, 3); paint(C('#7d6034'), 1.4);
        ellipse(10, 4, 3.4, 3.4); paint(C('#f2c14e'), 1.2);
        break;
    }
  }

  function drawSlashArc(pose, reach, color) {
    if (pose.arc <= 0.05) return;
    ctx.save();
    ctx.globalAlpha = 0.45 * pose.arc;
    ctx.strokeStyle = color || '#ffffff';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(8, -60, reach * 0.8, pose.angle - 1.2, pose.angle + 0.2);
    ctx.stroke();
    ctx.globalAlpha = 0.18 * pose.arc;
    ctx.lineWidth = 16;
    ctx.stroke();
    ctx.restore();
  }

  /* A knight, a bandit and a brute are all the same figure with different
     colours, weapon and trimmings. Local origin is between the heels. */
  function drawHuman(e, opts) {
    opts = opts || {};
    var look = e.look;
    var s = scaleOf(e.y) * (e.scale || 1) * (opts.scale || 1);
    var flashing = e.flash > 0 && Math.floor(e.flash * 40) % 2 === 0;
    // the knight flickers while invulnerable — but never mid-spell
    var blink = e.kind === 'player' && e.invuln > 0 && e.state !== 'magic' &&
                Math.floor(e.invuln * 14) % 2 === 0;
    function C(c) { return flashing ? '#ffffff' : c; }

    if (!opts.noShadow) {
      drawShadow(e.x, e.y, 17 * s, e.z);
      if (e.kind === 'player' && e.z < 6) {                 // a ring so you never lose yourself
        ctx.strokeStyle = rgba('#f2c14e', 0.5);
        ctx.lineWidth = 2.5;
        ellipse(e.x, e.y, 21 * s, 7 * s);
        ctx.stroke();
      }
    }
    if (blink) return;

    var KNEE = -26, HIP = -52, WAIST = -60, SHOULDER = -88, HEAD = -103, TOP = -116;
    var pose = swingPose(e);
    var walking = e.state === 'walk';
    var swing = walking ? Math.sin(e.walkPhase) : 0;
    var bob = walking ? Math.abs(Math.sin(e.walkPhase)) * 3 : Math.sin(G.time * 2.4 + e.x * 0.02);
    var down = e.down > 0 || (e.dead && e.kind === 'foe');
    var hurt = e.hurt > 0;
    var boot = shade(look.plate, -0.42);
    var leather = shade(look.cloth || '#4a3a2a', -0.12);

    ctx.save();
    ctx.translate(e.x + (opts.dx || 0), e.y - e.z + (opts.dy || 0));
    ctx.scale(e.face * s, s);

    if (down) {
      var fall = e.dead ? 1 : clamp(1 - e.down / CFG.downTime, 0, 1);
      ctx.rotate(-clamp(fall * 1.5, 0, 1.45));
      ctx.translate(0, -8);
      if (e.dead) ctx.globalAlpha = clamp(1.4 - e.deadT, 0, 1);
    } else if (hurt) {
      ctx.rotate(0.2);
    } else {
      ctx.rotate(pose.lean * 0.3);
    }
    ctx.translate(0, -bob);

    function leg(dir, cloth) {
      if (opts.mounted) {                                    // legs down the flank
        var off = dir * 3;
        limb(off, HIP + 4, 13 + off, KNEE + 8, 12, C(cloth));
        limb(13 + off, KNEE + 8, 9 + off, -8, 10, C(cloth));
        roundRect(1 + off, -11, 18, 8, 3); paint(C(boot), 1.6);
        return;
      }
      var kx = dir * swing * 11;
      var fx = dir * swing * 18;
      limb(dir * 3, HIP + 4, kx * 0.5, KNEE, 12, C(cloth));
      limb(kx * 0.5, KNEE, fx, -5, 10, C(cloth));
      roundRect(fx - 8, -7, 18, 8, 3); paint(C(boot), 1.6);
    }

    // cloak, hung behind everything
    if (look.cloth && opts.cloak !== false) {
      ctx.beginPath();
      ctx.moveTo(-7, SHOULDER + 4);
      ctx.quadraticCurveTo(-28 - swing * 6, HIP + 6, -17 - swing * 9, -6);
      ctx.lineTo(3, -8);
      ctx.quadraticCurveTo(8, HIP, 7, SHOULDER + 4);
      ctx.closePath();
      paint(C(shade(look.cloth, -0.24)), 1.8);
    }

    leg(1, shade(leather, -0.22));                          // back leg

    // back arm, plus the shield it may be carrying
    var bax = -13 - swing * 6;
    limb(-7, SHOULDER + 4, bax, SHOULDER + 26, 9, C(shade(look.plate, -0.28)));
    if (look.shield) {
      ctx.save();
      ctx.translate(bax - 3, SHOULDER + 30);
      ctx.rotate(-0.12);
      roundRect(-14, -28, 26, 50, 9); paint(C(shade(look.trim, -0.12)), 2);
      roundRect(-10, -23, 18, 40, 7); paint(C(look.cloth), 1.6);
      ellipse(-1, -3, 5.5, 5.5); paint(C(look.trim), 1.4);
      ctx.restore();
    }

    leg(-1, leather);                                       // front leg

    // tassets over the hips
    ctx.beginPath();
    ctx.moveTo(-12, WAIST + 2);
    ctx.lineTo(12, WAIST + 2);
    ctx.lineTo(15, HIP + 8);
    ctx.lineTo(-15, HIP + 8);
    ctx.closePath();
    paint(C(shade(look.plate, -0.14)), 1.8);

    // torso
    ctx.beginPath();
    ctx.moveTo(-14, SHOULDER + 4);
    ctx.quadraticCurveTo(-17, WAIST - 10, -11, WAIST);
    ctx.lineTo(11, WAIST);
    ctx.quadraticCurveTo(17, WAIST - 10, 14, SHOULDER + 4);
    ctx.quadraticCurveTo(0, SHOULDER - 2, -14, SHOULDER + 4);
    ctx.closePath();
    paint(C(look.plate), 2);
    ctx.beginPath();                                        // lit side
    ctx.moveTo(2, SHOULDER + 6);
    ctx.quadraticCurveTo(13, WAIST - 12, 10, WAIST - 2);
    ctx.lineTo(2, WAIST - 2);
    ctx.closePath();
    paint(C(rgba('#ffffff', 0.13)), 0);
    ellipse(0, SHOULDER + 22, 6, 8); paint(C(shade(look.accent || look.plate, 0.18)), 1.5);
    roundRect(-12, WAIST - 6, 24, 6, 2); paint(C(look.trim), 1.5);

    // shoulder pads
    ellipse(-13, SHOULDER + 5, 8.5, 7.5); paint(C(shade(look.plate, -0.08)), 1.6);
    ellipse(13, SHOULDER + 4, 9.5, 8.5); paint(C(look.trim), 1.8);

    // head
    limb(0, SHOULDER + 2, 0, HEAD + 9, 8, C(shade(look.skin, -0.25)));
    ellipse(1, HEAD, 11, 12); paint(C(look.skin), 1.8);
    if (opts.helm === false) {
      ctx.beginPath();                                      // bare head
      ctx.moveTo(-10, HEAD - 1);
      ctx.quadraticCurveTo(-11, TOP + 3, 1, TOP + 1);
      ctx.quadraticCurveTo(12, TOP + 3, 11, HEAD - 1);
      ctx.quadraticCurveTo(3, HEAD - 6, -10, HEAD - 1);
      ctx.closePath();
      paint(C(look.hair), 1.6);
    } else {
      ctx.beginPath();                                      // helm
      ctx.moveTo(-11, HEAD + 5);
      ctx.quadraticCurveTo(-13, TOP, 1, TOP - 1);
      ctx.quadraticCurveTo(13, TOP, 12, HEAD + 5);
      ctx.lineTo(12, HEAD + 1);
      ctx.quadraticCurveTo(1, HEAD - 3, -11, HEAD + 1);
      ctx.closePath();
      paint(C(look.plate), 1.8);
      roundRect(-11, HEAD + 2, 23, 4, 1.8); paint(C(look.trim), 1.2);
      if (look.plume) {
        ctx.beginPath();
        ctx.moveTo(-3, TOP + 2);
        ctx.quadraticCurveTo(-17 - swing * 4, TOP - 12, -25 - swing * 6, TOP + 12);
        ctx.quadraticCurveTo(-12, TOP - 2, 2, TOP + 4);
        ctx.closePath();
        paint(C(look.plume), 1.4);
      }
    }
    ellipse(7, HEAD + 6, 2, 2.4); paint(C('#2b1a10'), 0);   // eye under the brim

    // sword arm
    var armAngle = pose.angle * 0.62 + (walking ? -swing * 0.25 : 0);
    if (e.state === 'magic') armAngle = -1.7;
    ctx.save();
    ctx.translate(8, SHOULDER + 8);
    ctx.rotate(armAngle);
    limb(0, 0, 13, 4, 10, C(shade(look.plate, 0.04)));
    limb(13, 4, 25 + pose.reachOut * 0.4, 7, 8.5, C(shade(look.skin, -0.12)));
    ctx.save();
    ctx.translate(26 + pose.reachOut * 0.45, 7);
    ctx.rotate(pose.angle - armAngle);
    ellipse(0, 0, 5, 5); paint(C(look.trim), 1.4);
    drawWeapon(look.weapon, look, C);
    ctx.restore();
    ctx.restore();

    if (pose.arc > 0) drawSlashArc(pose, opts.reach || 46, e.kind === 'player' ? '#fff3cf' : '#ffd0a0');

    if (e.kind === 'player' && !down) {                      // "that one is you"
      var mk = TOP - 14 + Math.sin(G.time * 4) * 2.5;
      ctx.beginPath();
      ctx.moveTo(1, mk + 9);
      ctx.lineTo(-7, mk);
      ctx.lineTo(9, mk);
      ctx.closePath();
      paint(rgba('#f2c14e', 0.92), 1.4);
    }
    ctx.restore();
  }

  function drawGnome(e) {
    var look = e.look;
    var s = scaleOf(e.y) * 0.92;
    var flashing = e.flash > 0 && Math.floor(e.flash * 40) % 2 === 0;
    function C(c) { return flashing ? '#ffffff' : c; }
    drawShadow(e.x, e.y, 15 * s, e.z);

    ctx.save();
    ctx.translate(e.x, e.y - e.z);
    ctx.scale(e.face * s, s);
    var ph = e.walkPhase;
    var swing = Math.sin(ph * 1.6);
    ctx.translate(0, -Math.abs(swing) * 2);

    limb(0, -26, -swing * 9, 0, 8, C(shade(look.cloth, -0.2)));
    limb(0, -26, swing * 9, 0, 8, C(look.cloth));
    ctx.fillStyle = C(look.plate);
    roundRect(-12, -46, 24, 24, 9); ctx.fill();               // round little body
    ctx.fillStyle = C(look.skin);
    ellipse(2, -52, 9, 8); ctx.fill();
    ctx.fillStyle = C(look.hair);                             // beard
    ctx.beginPath();
    ctx.moveTo(-2, -50); ctx.quadraticCurveTo(10, -44, 2, -34);
    ctx.quadraticCurveTo(-6, -40, -6, -50);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = C(look.trim);                             // pointed hat
    ctx.beginPath();
    ctx.moveTo(-10, -56); ctx.lineTo(12, -56); ctx.lineTo(-2, -76);
    ctx.closePath(); ctx.fill();
    ctx.save();
    ctx.translate(-10, -34);
    ctx.rotate(Math.sin(ph * 1.6) * 0.3);
    drawWeapon('sack', look, C);
    ctx.restore();
    ctx.restore();
  }

  /* Drakes, whelps and the great wyrms all come out of the same routine:
     a standing lizard seen from the side, facing +x before the flip. */
  function drawDragon(e, opts) {
    opts = opts || {};
    var look = e.look;
    var big = e.body === 'dragon';
    var s = scaleOf(e.y) * (e.scale || 1);
    var flashing = e.flash > 0 && Math.floor(e.flash * 40) % 2 === 0;
    function C(c) { return flashing ? '#ffffff' : c; }

    drawShadow(e.x, e.y, 34 * s, e.z);

    ctx.save();
    ctx.translate(e.x, e.y - e.z);
    ctx.scale(e.face * s, s);
    if (e.dead) ctx.globalAlpha = clamp(1.4 - e.deadT, 0, 1);

    var step = Math.sin(e.walkPhase);
    var flap = Math.sin((e.wing || G.time * 3) * (e.fly > 0 ? 1.6 : 0.7));
    var breathing = e.breath > 0 || (e.state === 'breath' && e.stateT > 0.55);
    var wind = e.state === 'breath' && e.stateT < 0.55 ? e.stateT / 0.55 : 0;
    var hide = C(look.hide), dark = C(shade(look.hide, -0.26)), belly = C(look.belly);

    // tail, sweeping back and down
    ctx.strokeStyle = dark;
    ctx.lineWidth = 15;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-28, -54);
    ctx.quadraticCurveTo(-64, -52 + step * 5, -88, -22 - step * 8);
    ctx.stroke();
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-70, -36 + step * 2);
    ctx.quadraticCurveTo(-92, -28 - step * 6, -104, -8 - step * 8);
    ctx.stroke();
    ctx.beginPath();                                          // tail fin
    ctx.moveTo(-100, -12 - step * 8);
    ctx.lineTo(-118, -26 - step * 10);
    ctx.lineTo(-108, -2 - step * 6);
    ctx.closePath();
    paint(C(shade(look.hide, 0.2)), 1.8);

    // far side limbs and wing, painted dark so they sit behind
    limb(-20, -42, -30 + step * 8, -2, 11, dark);
    limb(18, -44, 26 - step * 8, -2, 11, dark);
    ctx.beginPath();
    ctx.moveTo(-6, -70);
    ctx.quadraticCurveTo(-40, -104 - flap * 16, -2, -116 - flap * 12);
    ctx.quadraticCurveTo(0, -92, -6, -70);
    ctx.closePath();
    paint(C(shade(look.wing, -0.3)), 1.6);

    // haunch, barrel and chest
    ellipse(-22, -52, 24, 24); paint(hide, 2);
    ellipse(0, -52, 34, 26); paint(hide, 2);
    ellipse(20, -56, 22, 21); paint(hide, 2);
    ellipse(2, -42, 27, 15); paint(belly, 0);

    // near legs, with toes
    limb(-16, -44, -22 - step * 9, -6, 13, hide);
    roundRect(-33 - step * 9, -9, 22, 9, 4); paint(dark, 1.6);
    limb(20, -46, 27 + step * 9, -6, 13, hide);
    roundRect(17 + step * 9, -9, 22, 9, 4); paint(dark, 1.6);

    // spines, following the curve of the back
    ctx.fillStyle = C(shade(look.hide, -0.12));
    for (var i = 0; i < 5; i++) {
      var px = -26 + i * 13;
      var py = -52 - Math.sqrt(Math.max(0, 1 - (px / 40) * (px / 40))) * 25;
      ctx.beginPath();
      ctx.moveTo(px - 5, py + 3);
      ctx.lineTo(px + 1, py - (big ? 16 : 10));
      ctx.lineTo(px + 6, py + 3);
      ctx.closePath();
      ctx.fill();
    }

    // near wing: membrane stretched over three struts
    var wr = { x: 4, y: -68 };
    var tipX = 10 + flap * 10, tipY = -124 - flap * 14;
    ctx.beginPath();
    ctx.moveTo(wr.x, wr.y);
    ctx.quadraticCurveTo(-42 + flap * 6, -108 - flap * 10, tipX, tipY);
    ctx.quadraticCurveTo(-2, -110 - flap * 6, -8, -92 - flap * 4);
    ctx.quadraticCurveTo(-2, -78, wr.x, wr.y);
    ctx.closePath();
    paint(C(look.wing), 2);
    ctx.strokeStyle = C(shade(look.wing, -0.34));
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(wr.x, wr.y); ctx.quadraticCurveTo(-26 + flap * 4, -98 - flap * 8, tipX, tipY);
    ctx.moveTo(wr.x, wr.y); ctx.lineTo(-10 + flap * 3, -98 - flap * 6);
    ctx.moveTo(wr.x, wr.y); ctx.lineTo(2 + flap * 2, -104 - flap * 8);
    ctx.stroke();

    // neck
    var lift = breathing ? -8 : wind * -12;
    ctx.strokeStyle = hide;
    ctx.lineWidth = 17;
    ctx.beginPath();
    ctx.moveTo(24, -62);
    ctx.quadraticCurveTo(44, -74 + lift, 48, -94 + lift);
    ctx.stroke();
    ctx.strokeStyle = belly;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(30, -60);
    ctx.quadraticCurveTo(48, -74 + lift, 52, -92 + lift);
    ctx.stroke();

    // head
    ctx.save();
    ctx.translate(50, -98 + lift);
    ctx.rotate(breathing ? 0.2 : wind * -0.35);
    ctx.beginPath();                                          // skull + snout
    ctx.moveTo(-12, -10);
    ctx.quadraticCurveTo(16, -15, 30, -5);
    ctx.lineTo(31, 1);
    ctx.quadraticCurveTo(16, 6, -10, 12);
    ctx.quadraticCurveTo(-18, 0, -12, -10);
    ctx.closePath();
    paint(hide, 2);
    ctx.beginPath();                                          // lower jaw
    ctx.moveTo(-8, 4);
    ctx.quadraticCurveTo(12, 8, 28, 3);
    ctx.quadraticCurveTo(14, 13, -6, 12);
    ctx.closePath();
    paint(belly, 1.6);
    ctx.fillStyle = C('#fdf6e6');                             // a couple of teeth
    ctx.beginPath();
    ctx.moveTo(22, 2); ctx.lineTo(25, 8); ctx.lineTo(27, 2); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(14, 2); ctx.lineTo(16, 7); ctx.lineTo(19, 2); ctx.closePath(); ctx.fill();
    ctx.beginPath();                                          // swept horn
    ctx.moveTo(-6, -9);
    ctx.quadraticCurveTo(-20, -26, -30, -30);
    ctx.quadraticCurveTo(-16, -22, -2, -12);
    ctx.closePath();
    paint(C(look.horn), 1.6);
    if (big) {
      ctx.beginPath();
      ctx.moveTo(2, -10);
      ctx.quadraticCurveTo(-8, -30, -16, -36);
      ctx.quadraticCurveTo(-4, -24, 8, -12);
      ctx.closePath();
      paint(C(look.horn), 1.6);
    }
    ctx.beginPath();                                          // brow
    ctx.moveTo(0, -10); ctx.lineTo(12, -8); ctx.lineTo(2, -4);
    ctx.closePath();
    paint(dark, 0);
    ellipse(6, -3, 4, 3.4); paint(C(look.eye), 1.2);
    ellipse(7.5, -3, 1.4, 2.6); paint(C('#2a1208'), 0);
    if (breathing) {
      ctx.fillStyle = rgba('#ffb347', 0.85);
      ellipse(36, 1, 13 + Math.random() * 7, 8 + Math.random() * 4); ctx.fill();
      ctx.fillStyle = rgba('#fff0c0', 0.8);
      ellipse(32, 1, 6, 4.5); ctx.fill();
    } else if (wind > 0.3) {
      ctx.fillStyle = rgba('#ff6b3c', 0.4 * wind);
      ellipse(32, 1, 7 * wind, 5 * wind); ctx.fill();
    }
    ctx.restore();

    // saddle, when someone can ride it
    if (e.kind === 'mount') {
      ctx.beginPath();
      ctx.moveTo(-14, -74); ctx.lineTo(12, -76);
      ctx.quadraticCurveTo(18, -64, 10, -62);
      ctx.lineTo(-12, -60);
      ctx.quadraticCurveTo(-20, -66, -14, -74);
      ctx.closePath();
      paint(C('#6b4a2a'), 1.8);
      roundRect(-15, -78, 9, 8, 3); paint(C('#f2c14e'), 1.2);
      if (!e.rider && !e.ridden && e.leaving <= 0) {
        ctx.strokeStyle = rgba('#ffd77a', 0.4 + Math.sin(G.time * 5) * 0.3);
        ctx.lineWidth = 3;
        ellipse(0, -2, 46, 13);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawChest(e) {
    var s = scaleOf(e.y);
    var flashing = e.flash > 0;
    drawShadow(e.x, e.y, 22 * s, 0);
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(s, s);
    var lift = Math.sin(G.time * 2 + e.walkPhase) * 1.4;
    ctx.fillStyle = flashing ? '#ffffff' : '#6b4526';
    roundRect(-22, -30 + lift, 44, 30, 4); ctx.fill();
    ctx.fillStyle = flashing ? '#ffffff' : '#7d5430';
    ctx.beginPath();
    ctx.moveTo(-22, -30 + lift);
    ctx.quadraticCurveTo(0, -48 + lift, 22, -30 + lift);
    ctx.lineTo(22, -26 + lift);
    ctx.lineTo(-22, -26 + lift);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f2c14e';
    roundRect(-24, -30 + lift, 48, 4, 2); ctx.fill();
    roundRect(-5, -24 + lift, 10, 12, 2); ctx.fill();
    ctx.fillStyle = rgba('#ffe9a8', 0.5 + Math.sin(G.time * 4) * 0.25);
    ellipse(0, -18 + lift, 3, 3); ctx.fill();
    ctx.restore();
  }

  function drawEntity(e) {
    if (e.kind === 'mount') {
      drawDragon(e);
      // whoever is in the saddle rides along on top
      var seat = e.ridden ? G.player : e.rider;
      if (seat && !seat.dead) {
        // hips land on the saddle: the rider's own scale is folded in here
        drawHuman(seat, {
          noShadow: true, scale: 0.86, reach: 40, cloak: false, mounted: true,
          dy: scaleOf(e.y) * (44 - 70 * (e.scale || 1))
        });
      }
      return;
    }
    if (e.body === 'chest') return drawChest(e);
    if (e.body === 'gnome') return drawGnome(e);
    if (e.body === 'drake' || e.body === 'dragon') return drawDragon(e);
    drawHuman(e, { reach: e.kind === 'player' ? G.knight.reach : (e.def && e.def.reach) || 46 });
  }

  /* ───────────────────────── Drawing: loot, shots, effects ───────────────────────── */
  function drawPickup(pk) {
    var s = scaleOf(pk.y);
    var bobZ = pk.landed ? Math.sin(pk.bob) * 3 : 0;
    var x = pk.x, y = pk.y - pk.z - bobZ;
    var fade = pk.life < 3 ? (Math.floor(pk.life * 6) % 2 === 0 ? 0.35 : 1) : 1;
    drawShadow(pk.x, pk.y, 9 * s, pk.z);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(x, y);
    ctx.scale(s, s);
    if (pk.type === 'gold') {
      ctx.fillStyle = '#b9813a';
      ellipse(0, -8, 11, 8); ctx.fill();
      ctx.fillStyle = '#f2c14e';
      ellipse(0, -10, 10, 7); ctx.fill();
      ctx.fillStyle = rgba('#fff3cf', 0.8);
      ellipse(-3, -12, 3.5, 2.4); ctx.fill();
    } else if (pk.type === 'vial') {
      ctx.fillStyle = '#8a6a44';
      roundRect(-3, -24, 6, 5, 2); ctx.fill();
      ctx.fillStyle = rgba('#6db8ff', 0.95);
      ctx.beginPath();
      ctx.moveTo(-6, -20); ctx.lineTo(6, -20);
      ctx.quadraticCurveTo(9, -4, 0, -1);
      ctx.quadraticCurveTo(-9, -4, -6, -20);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = rgba('#ffffff', 0.55);
      ellipse(-2, -13, 2, 4); ctx.fill();
    } else if (pk.type === 'meat') {
      ctx.fillStyle = '#e0c9a0';
      roundRect(-14, -8, 10, 5, 2); ctx.fill();
      ctx.fillStyle = '#c0663a';
      ellipse(2, -9, 12, 9); ctx.fill();
      ctx.fillStyle = rgba('#e8935c', 0.9);
      ellipse(0, -11, 7, 5); ctx.fill();
    } else {
      ctx.fillStyle = rgba('#c08bff', 0.9);
      ctx.beginPath();
      ctx.moveTo(0, -24); ctx.lineTo(8, -12); ctx.lineTo(0, 0); ctx.lineTo(-8, -12);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = rgba('#f0e0ff', 0.85);
      ctx.beginPath();
      ctx.moveTo(0, -20); ctx.lineTo(4, -12); ctx.lineTo(0, -4); ctx.lineTo(-4, -12);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function drawShot(s) {
    var sc = scaleOf(s.y);
    ctx.save();
    ctx.translate(s.x, s.y - s.z);
    ctx.scale(sc, sc);
    if (s.type === 'axe') {
      ctx.rotate(s.spin);
      ctx.fillStyle = '#7a5535';
      roundRect(-14, -2, 28, 4, 2); ctx.fill();
      ctx.fillStyle = '#cfd6e2';
      ctx.beginPath();
      ctx.moveTo(8, -3); ctx.quadraticCurveTo(22, -14, 24, -2);
      ctx.quadraticCurveTo(22, 12, 8, 3);
      ctx.closePath(); ctx.fill();
    } else if (s.type === 'flame') {
      var r = 12 + Math.random() * 6;
      ctx.fillStyle = rgba('#ff6b3c', 0.6);
      ellipse(0, 0, r, r * 0.8); ctx.fill();
      ctx.fillStyle = rgba('#ffcf6b', 0.75);
      ellipse(0, 0, r * 0.55, r * 0.45); ctx.fill();
    } else {
      var f = 16 + Math.sin(G.time * 22) * 3;
      ctx.fillStyle = rgba('#ff8a3c', 0.55);
      ellipse(0, 0, f * 1.3, f * 1.3); ctx.fill();
      ctx.fillStyle = rgba('#ffd166', 0.9);
      ellipse(0, 0, f * 0.7, f * 0.7); ctx.fill();
    }
    ctx.restore();
  }

  function drawParticles() {
    for (var i = 0; i < G.parts.length; i++) {
      var q = G.parts[i];
      var a = clamp(q.life / (q.maxLife || 0.6), 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = q.color;
      if (q.glow) {
        ctx.globalAlpha = a * 0.35;
        ellipse(q.x, q.y - q.z, q.size * 2.4, q.size * 2.4);
        ctx.fill();
        ctx.globalAlpha = a;
      }
      ellipse(q.x, q.y - q.z, q.size, q.size);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (var f = 0; f < G.floats.length; f++) {
      var fl = G.floats[f];
      ctx.globalAlpha = clamp(fl.life / 0.85, 0, 1);
      ctx.font = (fl.big ? '700 22px' : '700 15px') + " 'Avenir Next', system-ui, sans-serif";
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = rgba('#000000', 0.55);
      ctx.strokeText(fl.text, fl.x, fl.y - fl.z);
      ctx.fillStyle = fl.color;
      ctx.fillText(fl.text, fl.x, fl.y - fl.z);
    }
    ctx.globalAlpha = 1;
  }

  function drawMagicFx() {
    for (var i = 0; i < G.fx.length; i++) {
      var fx = G.fx[i];
      var t = fx.t / fx.dur;
      var p = G.player;
      setLayer(1);
      ctx.save();
      if (fx.type === 'nova') {
        ctx.globalAlpha = (1 - t) * 0.85;
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 14 * (1 - t) + 2;
        ellipse(p.x, p.y, 40 + t * view.dw * 0.9, (40 + t * view.dw * 0.9) * 0.34);
        ctx.stroke();
        ctx.globalAlpha = (1 - t) * 0.35;
        ctx.lineWidth = 40 * (1 - t);
        ellipse(p.x, p.y, 20 + t * view.dw * 0.6, (20 + t * view.dw * 0.6) * 0.34);
        ctx.stroke();
      } else if (fx.type === 'quake') {
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = fx.color;
        for (var c = 0; c < 14; c++) {
          var cx = p.x + (c - 7) * 62 + Math.sin(c * 2.3) * 20;
          var cy = FLOOR_FAR + ((c * 97) % BAND);
          var h = (1 - t) * (30 + (c % 4) * 18);
          ctx.beginPath();
          ctx.moveTo(cx - 10, cy);
          ctx.lineTo(cx, cy - h);
          ctx.lineTo(cx + 12, cy);
          ctx.closePath();
          ctx.fill();
        }
      } else if (fx.type === 'gale') {
        ctx.globalAlpha = (1 - t) * 0.9;
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        for (var g = 0; g < 9; g++) {
          var gy = FLOOR_FAR + (g / 9) * BAND;
          var gx = p.x - view.dw * 0.6 + t * view.dw * 1.6 + g * 26;
          ctx.beginPath();
          ctx.moveTo(gx, gy);
          ctx.lineTo(gx + 90, gy - 10);
          ctx.stroke();
        }
      } else {                                   // dragonfire
        ctx.globalAlpha = (1 - t) * 0.9;
        var grd = ctx.createLinearGradient(p.x - view.dw * 0.6, 0, p.x + view.dw * 0.6, 0);
        grd.addColorStop(0, rgba('#ff3c1f', 0.1));
        grd.addColorStop(0.5, rgba('#ff8a3c', 0.75));
        grd.addColorStop(1, rgba('#ffd166', 0.1));
        ctx.fillStyle = grd;
        for (var w = 0; w < 4; w++) {
          var wy = FLOOR_FAR + BAND * (w / 3);
          var amp = 26 + Math.sin(G.time * 12 + w) * 10;
          ctx.beginPath();
          ctx.moveTo(p.x - view.dw, wy - amp * (1 - t));
          ctx.quadraticCurveTo(p.x, wy - amp * 2 * (1 - t), p.x + view.dw, wy - amp * (1 - t));
          ctx.quadraticCurveTo(p.x, wy + amp * (1 - t), p.x - view.dw, wy - amp * (1 - t));
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  function drawGoArrow() {
    if (G.screen !== 'play' || G.gateOpen || G.stageDone) return;
    setScreen();
    var a = 0.45 + Math.sin(G.time * 5) * 0.3;
    var x = view.dw - 46 + Math.sin(G.time * 3) * 6;
    var y = FLOOR_FAR - 34;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath();
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x + 24, y);
    ctx.lineTo(x, y + 14);
    ctx.lineTo(x + 6, y);
    ctx.closePath();
    ctx.fill();
    ctx.font = "700 12px 'Avenir Next', system-ui, sans-serif";
    ctx.textAlign = 'right';
    ctx.fillText('GO', x - 6, y + 5);
    ctx.restore();
  }

  function drawVignette() {
    setScreen();
    if (G.flash > 0) {
      ctx.fillStyle = rgba('#ffffff', clamp(G.flash, 0, 0.6) * 0.6);
      ctx.fillRect(0, 0, view.dw, DH);
    }
    var g = ctx.createRadialGradient(view.dw / 2, DH * 0.5, DH * 0.32, view.dw / 2, DH * 0.5, DH * 0.8);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, view.dw, DH);
  }

  function drawFrame() {
    var pal = (G.stage || STAGES[0]).pal;
    shakeX = G.cam.shake > 0 ? rand(-G.cam.shake, G.cam.shake) : 0;
    shakeY = G.cam.shake > 0 ? rand(-G.cam.shake, G.cam.shake) * 0.6 : 0;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawSky(pal);
    drawHills(pal);
    drawGround(pal);
    drawProps('back', pal);

    // everything that stands on the road, painted back to front
    setLayer(1);
    var list = [];
    var p = G.player;
    if (p && !p.mount) list.push(p);
    for (var i = 0; i < G.foes.length; i++) {
      if (!G.foes[i].mount) list.push(G.foes[i]);
    }
    for (var m = 0; m < G.mounts.length; m++) list.push(G.mounts[m]);
    for (var k = 0; k < G.pickups.length; k++) list.push(G.pickups[k]);
    for (var s = 0; s < G.shots.length; s++) list.push(G.shots[s]);
    list.sort(function (a, b) { return a.y - b.y; });

    for (var d = 0; d < list.length; d++) {
      var e = list[d];
      if (e.kind === 'pickup') drawPickup(e);
      else if (e.kind === 'shot') drawShot(e);
      else drawEntity(e);
    }

    drawParticles();
    drawMagicFx();
    setLayer(1);
    drawProps('front', pal);
    drawMotes(pal);
    drawGoArrow();
    drawVignette();
  }

  /* ───────────────────────── HUD ───────────────────────── */
  var el = {
    hud: document.getElementById('hud'),
    name: document.getElementById('hudName'),
    hp: document.getElementById('hudHp'),
    hpBar: document.querySelector('.bar.hp'),
    vials: document.getElementById('hudVials'),
    stage: document.getElementById('hudStage'),
    gold: document.getElementById('hudGold'),
    face: document.getElementById('hudFace'),
    touch: document.getElementById('touch'),
    pauseBtn: document.getElementById('pauseBtn'),
    soundBtn: document.getElementById('soundBtn'),
    bossBar: document.getElementById('bossBar'),
    bossName: document.getElementById('bossName'),
    bossHp: document.getElementById('bossHp'),
    banner: document.getElementById('banner')
  };

  var lastGold = -1;
  function renderHud() {
    var p = G.player;
    if (!p) return;
    el.name.textContent = G.knight.name;
    var frac = clamp(p.hp / p.maxHp, 0, 1);
    el.hp.style.width = (frac * 100) + '%';
    el.hpBar.classList.toggle('low', frac < 0.3);

    if (el.vials.childElementCount !== p.maxVials) {
      el.vials.innerHTML = '';
      for (var i = 0; i < p.maxVials; i++) {
        var v = document.createElement('span');
        v.className = 'vial';
        el.vials.appendChild(v);
      }
    }
    for (var k = 0; k < el.vials.childElementCount; k++) {
      el.vials.children[k].classList.toggle('full', k < p.vials);
    }

    el.stage.textContent = (G.stageIndex + 1) + '/' + STAGES.length;
    el.gold.textContent = G.run.gold + G.gold;
    if (lastGold !== -1 && G.gold !== lastGold) {
      var box = el.gold.parentNode;
      box.classList.remove('bump');
      void box.offsetWidth;
      box.classList.add('bump');
    }
    lastGold = G.gold;

    // the magic button dims when there is nothing to spend
    btnMagic.classList.toggle('dim', p.vials <= 0 || !!p.mount);
  }

  function showBossBar(boss) {
    el.bossName.textContent = boss.def.name;
    el.bossHp.style.width = '100%';
    el.bossBar.classList.remove('hidden');
  }
  function renderBossBar() {
    if (!G.boss) return;
    el.bossHp.style.width = clamp(G.boss.hp / G.boss.maxHp, 0, 1) * 100 + '%';
  }
  function hideBossBar() { el.bossBar.classList.add('hidden'); }

  /* ───────────────────────── Portraits ───────────────────────── */
  function paintFigure(c2d, w, h, knight, pose) {
    var saved = ctx;
    ctx = c2d;
    c2d.setTransform(1, 0, 0, 1, 0, 0);
    c2d.clearRect(0, 0, w, h);
    var s = (h * 0.84) / CHAR_H;
    c2d.setTransform(s, 0, 0, s, w / 2, h - h * 0.06);
    c2d.translate(0, -FLOOR_NEAR);
    var fake = {
      kind: 'card', look: knight.look, x: 0, y: FLOOR_NEAR, z: 0, face: 1,
      state: pose === 'walk' ? 'walk' : 'idle', walkPhase: G.time * 4,
      hurt: 0, down: 0, flash: 0, atk: null, invuln: 0, scale: 1 / scaleOf(FLOOR_NEAR)
    };
    drawHuman(fake, { noShadow: true, reach: knight.reach });
    ctx = saved;
  }

  function paintBust(c2d, w, h, knight) {
    var saved = ctx;
    ctx = c2d;
    c2d.setTransform(1, 0, 0, 1, 0, 0);
    c2d.clearRect(0, 0, w, h);
    var s = (h * 2.0) / CHAR_H;
    c2d.setTransform(s, 0, 0, s, w / 2, h * 1.55);
    c2d.translate(0, -FLOOR_NEAR);
    var fake = {
      kind: 'card', look: knight.look, x: 0, y: FLOOR_NEAR, z: 0, face: 1,
      state: 'idle', walkPhase: 0, hurt: 0, down: 0, flash: 0, atk: null, invuln: 0,
      scale: 1 / scaleOf(FLOOR_NEAR)
    };
    drawHuman(fake, { noShadow: true, reach: knight.reach });
    ctx = saved;
  }

  /* ───────────────────────── Screens ───────────────────────── */
  var SCREEN_NODES = {
    menu: 'menu', select: 'selectScreen', trail: 'trailScreen',
    pause: 'pauseScreen', clear: 'clearScreen', over: 'overScreen', win: 'winScreen'
  };

  function gotoScreen(name) {
    G.screen = name;
    for (var key in SCREEN_NODES) {
      document.getElementById(SCREEN_NODES[key]).classList.toggle('hidden', key !== name);
    }
    var playing = name === 'play';
    el.hud.classList.toggle('hidden', !playing);
    el.touch.classList.toggle('hidden', !playing);
    el.pauseBtn.classList.toggle('hidden', !playing);
    if (!playing) {
      Input.mx = 0;
      Input.my = 0;
      Input.atkHeld = false;
      nubEl.style.transform = '';
    }
  }

  var selected = null;
  function buildKnightCards() {
    var grid = document.getElementById('knightGrid');
    grid.innerHTML = '';
    KNIGHTS.forEach(function (kn, i) {
      var card = document.createElement('div');
      card.className = 'knight-card';
      var c = document.createElement('canvas');
      c.width = 150;
      c.height = 184;
      card.appendChild(c);
      var nm = document.createElement('div');
      nm.className = 'kn-name';
      nm.textContent = kn.name;
      card.appendChild(nm);
      var role = document.createElement('div');
      role.className = 'kn-role';
      role.textContent = kn.role;
      card.appendChild(role);

      var stats = document.createElement('div');
      stats.className = 'kn-stats';
      var rows = [
        ['Might', kn.power / 1.5],
        ['Speed', (kn.speed - 140) / 100],
        ['Armour', (kn.hp - 80) / 90],
        ['Magic', kn.magic.power / 48]
      ];
      rows.forEach(function (r) {
        var row = document.createElement('div');
        row.className = 'kn-stat';
        row.innerHTML = '<i>' + r[0] + '</i><span class="kn-track"><b style="width:' +
                        Math.round(clamp(r[1], 0.12, 1) * 100) + '%"></b></span>';
        stats.appendChild(row);
      });
      card.appendChild(stats);

      card.addEventListener('click', function () { selectKnight(i); });
      grid.appendChild(card);
      kn._canvas = c;
    });
  }

  function selectKnight(i) {
    selected = i;
    var grid = document.getElementById('knightGrid');
    for (var c = 0; c < grid.children.length; c++) {
      grid.children[c].classList.toggle('on', c === i);
    }
    var kn = KNIGHTS[i];
    document.getElementById('knightBlurb').textContent = kn.blurb + '  Magic: ' + kn.magic.name + '.';
    document.getElementById('chooseBtn').disabled = false;
    Sfx.play('gate');
  }

  function buildTrailMap() {
    var map = document.getElementById('trailMap');
    map.innerHTML = '<div class="trail-line"></div>';
    var unlocked = Math.max(0, Math.min(STAGES.length - 1, G.mapSel === undefined ? G.stageIndex : G.mapSel));
    STAGES.forEach(function (st, i) {
      var node = document.createElement('div');
      node.className = 'trail-node';
      if (i <= G.unlocked) node.classList.add('open');
      if (i < G.unlocked) node.classList.add('done');
      if (i === unlocked) node.classList.add('on');
      node.innerHTML = '<span class="node-dot">' + st.icon + '</span><span class="node-num">' + (i + 1) + '</span>';
      node.addEventListener('click', function () {
        if (i > G.unlocked) { toast('Walk the road in order'); return; }
        G.mapSel = i;
        buildTrailMap();
        Sfx.play('gate');
      });
      map.appendChild(node);
    });
    var sel = STAGES[unlocked];
    document.getElementById('trailTitle').textContent = (unlocked + 1) + '. ' + sel.name;
    document.getElementById('trailDesc').textContent = sel.desc;
    document.getElementById('trailGold').textContent = G.run.gold;
    document.getElementById('trailVials').textContent = G.run.vials;
  }

  function showTrail() {
    G.mapSel = G.unlocked;
    buildTrailMap();
    gotoScreen('trail');
  }

  function setMenuStats() {
    document.getElementById('menuBest').textContent = 'Stage ' + Math.max(1, Store.data.best || 1);
    document.getElementById('menuGold').textContent = Store.data.gold || 0;
    var save = Store.data.save;
    var cont = document.getElementById('continueBtn');
    if (save && save.stage < STAGES.length) {
      cont.classList.remove('hidden');
      document.getElementById('continueStage').textContent = save.stage + 1;
    } else {
      cont.classList.add('hidden');
    }
  }

  function showClear() {
    document.getElementById('clearTitle').textContent = G.stage.name + ' cleared';
    document.getElementById('clearGold').textContent = G.gold;
    document.getElementById('clearKills').textContent = G.kills;
    document.getElementById('clearHp').textContent = Math.round(G.player.hp / G.player.maxHp * 100) + '%';
    document.getElementById('clearVials').textContent = G.player.vials;
    G.unlocked = Math.min(STAGES.length - 1, G.stageIndex + 1);
    gotoScreen('clear');
  }

  function showWin() {
    document.getElementById('winGold').textContent = G.run.gold;
    document.getElementById('winKills').textContent = G.run.kills;
    document.getElementById('winKnight').textContent = G.knight.name.split(' ')[0];
    document.getElementById('winText').textContent =
      'The Ashen Wyrm falls, the ridge road goes quiet, and ' + G.knight.name + ' walks home with ' +
      G.run.gold + ' gold.';
    gotoScreen('win');
  }

  function showOver() {
    document.getElementById('overStage').textContent = (G.stageIndex + 1);
    document.getElementById('overKills').textContent = G.run.kills + G.kills;
    document.getElementById('overGold').textContent = G.run.gold + G.gold;
    document.getElementById('overText').textContent = G.boss
      ? 'The wyrm stands over you. The trail is patient — come back for it.'
      : 'The road takes its toll. Stand up and walk it again.';
    gotoScreen('over');
  }

  function togglePause() {
    if (G.screen === 'play') {
      document.getElementById('pauseStage').textContent = (G.stageIndex + 1) + '/' + STAGES.length;
      document.getElementById('pauseGold').textContent = G.run.gold + G.gold;
      document.getElementById('pauseKills').textContent = G.run.kills + G.kills;
      gotoScreen('pause');
    } else if (G.screen === 'pause') {
      gotoScreen('play');
    }
  }

  function toggleSound() {
    var on = Sfx.toggle();
    el.soundBtn.textContent = on ? '🔊' : '🔈';
  }

  /* ───────────────────────── Buttons ───────────────────────── */
  document.getElementById('playBtn').addEventListener('click', function () {
    Sfx.init();
    Sfx.resume();
    gotoScreen('select');
    if (selected === null) selectKnight(0);
  });

  document.getElementById('continueBtn').addEventListener('click', function () {
    var save = Store.data.save;
    if (!save) return;
    Sfx.init();
    Sfx.resume();
    var kn = KNIGHTS[0];
    for (var i = 0; i < KNIGHTS.length; i++) if (KNIGHTS[i].id === save.knight) kn = KNIGHTS[i];
    G.knight = kn;
    G.run = { hp: save.hp, maxHp: kn.hp, vials: save.vials, gold: save.gold, kills: save.kills };
    G.unlocked = clamp(save.stage, 0, STAGES.length - 1);
    G.stageIndex = G.unlocked;
    showTrail();
  });

  document.getElementById('selectBackBtn').addEventListener('click', function () { gotoScreen('menu'); });

  document.getElementById('chooseBtn').addEventListener('click', function () {
    if (selected === null) return;
    newRun(KNIGHTS[selected]);
    G.unlocked = 0;
    G.stageIndex = 0;
    paintBust(el.face.getContext('2d'), el.face.width, el.face.height, G.knight);
    showTrail();
  });

  document.getElementById('marchBtn').addEventListener('click', function () {
    Sfx.init();
    Sfx.resume();
    paintBust(el.face.getContext('2d'), el.face.width, el.face.height, G.knight);
    startStage(G.mapSel === undefined ? G.unlocked : G.mapSel, false);
    gotoScreen('play');
  });

  document.getElementById('trailQuitBtn').addEventListener('click', function () {
    setMenuStats();
    gotoScreen('menu');
  });

  document.getElementById('resumeBtn').addEventListener('click', function () { gotoScreen('play'); });
  document.getElementById('quitBtn').addEventListener('click', function () {
    G.run.hp = G.player.hp;
    G.run.vials = G.player.vials;
    showTrail();
  });

  document.getElementById('onwardBtn').addEventListener('click', function () { showTrail(); });

  document.getElementById('retryBtn').addEventListener('click', function () {
    G.run.hp = G.knight.hp;
    G.run.vials = G.knight.vials;
    startStage(G.stageIndex, true);
    gotoScreen('play');
  });

  document.getElementById('overMenuBtn').addEventListener('click', function () {
    setMenuStats();
    gotoScreen('menu');
  });

  document.getElementById('winAgainBtn').addEventListener('click', function () {
    newRun(G.knight);
    G.unlocked = 0;
    G.stageIndex = 0;
    showTrail();
  });

  document.getElementById('winMenuBtn').addEventListener('click', function () {
    setMenuStats();
    gotoScreen('menu');
  });

  el.pauseBtn.addEventListener('click', togglePause);
  el.soundBtn.addEventListener('click', toggleSound);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && G.screen === 'play') togglePause();
  });

  /* ───────────────────────── Boot & loop ───────────────────────── */
  resize();
  buildKnightCards();
  G.unlocked = 0;
  G.run = { hp: KNIGHTS[0].hp, maxHp: KNIGHTS[0].hp, vials: KNIGHTS[0].vials, gold: 0, kills: 0 };
  G.stage = STAGES[0];
  G.props = buildProps(G.stage, 0);
  G.motes = buildMotes(G.stage);
  setMenuStats();
  el.soundBtn.textContent = Sfx.on ? '🔊' : '🔈';

  var last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;

    if (G.screen === 'play') {
      step(dt);
      renderBossBar();
    } else {
      G.time += dt;
      if (G.screen === 'menu' || G.screen === 'select' || G.screen === 'trail') {
        // the backdrop keeps drifting behind the menus
        var span = Math.max(1, maxCam());
        G.cam.x = (G.cam.x + dt * 22) % span;
      }
      if (G.screen === 'select' && selected !== null) {
        for (var i = 0; i < KNIGHTS.length; i++) {
          var kn = KNIGHTS[i];
          if (!kn._canvas) continue;
          paintFigure(kn._canvas.getContext('2d'), kn._canvas.width, kn._canvas.height, kn,
                      i === selected ? 'walk' : 'idle');
        }
      }
    }
    drawFrame();
  }
  requestAnimationFrame(frame);

  gotoScreen('menu');

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline play is optional */ });
    });
  }
})();
