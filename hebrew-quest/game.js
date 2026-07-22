// Game engine for "מסע בעברית".
(() => {
  const screens = {
    home: document.getElementById('screen-home'),
    menu: document.getElementById('screen-menu'),
    quiz: document.getElementById('screen-quiz'),
    results: document.getElementById('screen-results'),
  };

  const state = {
    grade: null,
    category: null,
    questions: [],
    scorableTotal: 0,
    index: 0,
    score: 0,
    locked: false,
    lastPct: 0,
  };

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
    const fab = document.getElementById('btn-home-fab');
    fab.hidden = name === 'home';
  }

  function shuffled(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // ===== Haptics (mobile-only, silently no-ops elsewhere) =====
  function vibrate(pattern) {
    if ('vibrate' in navigator) { try { navigator.vibrate(pattern); } catch (e) { /* ignore */ } }
  }

  // ===== Text-to-speech (best-effort; silently no-ops if unsupported) =====
  function speakHebrew(text) {
    if (!text || !('speechSynthesis' in window)) return;
    unlockAudioOnce();
    const say = () => {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'he-IL';
        utter.rate = 0.85;
        const setSpeaking = (on) => {
          const btn = document.querySelector('.replay-btn');
          if (btn) btn.classList.toggle('speaking', on);
        };
        utter.onstart = () => setSpeaking(true);
        utter.onend = () => setSpeaking(false);
        utter.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utter);
      } catch (e) { /* audio is a bonus, never block the game on it */ }
    };
    // Voices load asynchronously on first use in some browsers; speaking too
    // early silently produces no audio, so wait for the list once if it's empty.
    if (window.speechSynthesis.getVoices().length === 0) {
      let said = false;
      const sayOnce = () => { if (!said) { said = true; say(); } };
      window.speechSynthesis.addEventListener('voiceschanged', sayOnce, { once: true });
      setTimeout(sayOnce, 300); // fallback if voiceschanged never fires
    } else {
      say();
    }
  }

  // ===== Sound effects: tiny synthesized tones, no external assets =====
  // Bug fix: scheduling a tone on a still-suspended AudioContext plays nothing on
  // most mobile browsers - resume() is async, so we must wait for it before we
  // schedule anything instead of firing resume() and continuing immediately.
  let audioCtx = null;
  function getAudioCtx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    return audioCtx;
  }

  function playTone(freq, duration, type, delay, gainLevel) {
    unlockAudioOnce();
    const ctx = getAudioCtx();
    if (!ctx) return;
    const schedule = () => {
      try {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.value = freq;
        osc.connect(g);
        g.connect(ctx.destination);
        const start = ctx.currentTime + (delay || 0);
        g.gain.setValueAtTime(gainLevel || 0.15, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.start(start);
        osc.stop(start + duration + 0.02);
      } catch (e) { /* audio is a bonus, never block the game on it */ }
    };
    if (ctx.state === 'running') {
      schedule();
    } else {
      ctx.resume().then(schedule).catch(() => { /* audio is a bonus, never block the game on it */ });
    }
  }

  // Unlock both the AudioContext and speech synthesis from the first real user
  // gesture, since iOS/Safari require both to start from inside one. Guarded so
  // the (cheap but not free) unlock work only ever runs once, even though it's
  // wired to several event types and also called defensively from every sound
  // function in case the gesture listeners below somehow miss the first tap.
  let audioUnlocked = false;
  function unlockAudioOnce() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    const ctx = getAudioCtx();
    if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
    if ('speechSynthesis' in window) {
      try {
        const primer = new SpeechSynthesisUtterance(' ');
        primer.volume = 0;
        window.speechSynthesis.speak(primer);
      } catch (e) { /* ignore */ }
    }
  }
  ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(evt => {
    document.addEventListener(evt, unlockAudioOnce, { once: true, passive: true });
  });

  function playDing() {
    playTone(880, 0.12, 'sine', 0, 0.16);
    playTone(1318.5, 0.2, 'sine', 0.09, 0.16);
  }

  function playBuzz() {
    playTone(190, 0.28, 'sawtooth', 0, 0.09);
  }

  function playFanfare() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => playTone(f, 0.22, 'triangle', i * 0.1, 0.14));
  }

  // ===== Mascot =====
  const MASCOT = {
    grade1: { idle: '🐣', happy: '🐥', sad: '🥺' },
    grade5: { idle: '🦉', happy: '🤩', sad: '😅' },
  };

  function setMascotGrade(grade) {
    const el = document.getElementById('mascot');
    el.classList.remove('happy', 'sad');
    el.textContent = (MASCOT[grade] || MASCOT.grade1).idle;
  }

  function reactMascot(kind) {
    const el = document.getElementById('mascot');
    const set = MASCOT[state.grade] || MASCOT.grade1;
    el.classList.remove('happy', 'sad');
    void el.offsetWidth;
    el.textContent = kind === 'happy' ? set.happy : set.sad;
    el.classList.add(kind === 'happy' ? 'happy' : 'sad');
    setTimeout(() => { el.textContent = set.idle; }, 750);
  }

  // ===== localStorage helpers =====
  function bestKey(grade, categoryId) { return `hebrewquest_best_${grade}_${categoryId}`; }
  function likeKey(grade, categoryId) { return `hebrewquest_like_${grade}_${categoryId}`; }
  const TOTAL_LIKES_KEY = 'hebrewquest_total_likes';

  function getBest(grade, categoryId) { return Number(localStorage.getItem(bestKey(grade, categoryId)) || 0); }
  function setBest(grade, categoryId, score) {
    if (score > getBest(grade, categoryId)) localStorage.setItem(bestKey(grade, categoryId), String(score));
  }
  function isLiked(grade, categoryId) { return localStorage.getItem(likeKey(grade, categoryId)) === '1'; }
  function getTotalLikes() { return Number(localStorage.getItem(TOTAL_LIKES_KEY) || 0); }

  function refreshTotalLikesBadge() {
    const total = getTotalLikes();
    const badge = document.getElementById('total-likes');
    document.getElementById('total-likes-count').textContent = total;
    badge.hidden = total === 0;
  }

  // ===== Confetti =====
  function launchConfetti(intensity) {
    const layer = document.getElementById('confetti-layer');
    const colors = ['#8b5cf6', '#f472b6', '#38bdf8', '#22c55e', '#facc15', '#fb923c'];
    const count = intensity === 'high' ? 90 : intensity === 'mid' ? 50 : 24;
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = `${Math.random() * 100}vw`;
      piece.style.background = pick(colors);
      piece.style.animationDelay = `${Math.random() * 0.4}s`;
      piece.style.animationDuration = `${1.6 + Math.random() * 1.2}s`;
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      piece.style.width = piece.style.height = `${6 + Math.random() * 6}px`;
      layer.appendChild(piece);
      setTimeout(() => piece.remove(), 3200);
    }
  }

  function launchHearts() {
    const layer = document.getElementById('heart-layer');
    const icons = ['❤️', '💖', '💗', '⭐'];
    for (let i = 0; i < 18; i++) {
      const heart = document.createElement('div');
      heart.className = 'heart-piece';
      heart.textContent = pick(icons);
      heart.style.left = `${40 + Math.random() * 20}vw`;
      heart.style.animationDelay = `${Math.random() * 0.3}s`;
      heart.style.animationDuration = `${1.2 + Math.random() * 0.8}s`;
      heart.style.fontSize = `${18 + Math.random() * 16}px`;
      layer.appendChild(heart);
      setTimeout(() => heart.remove(), 2200);
    }
  }

  // ===== Home =====
  document.querySelectorAll('.grade-card').forEach(btn => {
    btn.addEventListener('click', () => openMenu(btn.dataset.grade));
  });
  refreshTotalLikesBadge();

  function openMenu(grade) {
    state.grade = grade;
    const data = CONTENT[grade];
    document.getElementById('menu-title').textContent = `${data.label} — בחרו משחק`;
    const grid = document.getElementById('category-grid');
    grid.innerHTML = '';
    data.categories.forEach(cat => {
      const best = getBest(grade, cat.id);
      const card = document.createElement('button');
      card.className = 'category-card';
      card.innerHTML = `
        <div class="category-emoji">${cat.emoji}</div>
        <div class="category-title">${cat.title}</div>
        <div class="category-desc">${cat.desc}</div>
        ${best ? `<div class="category-best">🏆 שיא: ${best}</div>` : ''}
      `;
      card.addEventListener('click', () => startQuiz(grade, cat));
      grid.appendChild(card);
    });
    showScreen('menu');
  }

  document.getElementById('btn-menu-back').addEventListener('click', () => showScreen('home'));
  document.getElementById('btn-quiz-back').addEventListener('click', () => {
    window.speechSynthesis && window.speechSynthesis.cancel();
    stopBalloonGame();
    openMenu(state.grade);
  });
  document.getElementById('btn-home-fab').addEventListener('click', () => {
    window.speechSynthesis && window.speechSynthesis.cancel();
    stopBalloonGame();
    showScreen('home');
  });

  // ===== Progress display: numeric fraction (grade5) or dots (grade1) =====
  function setProgressMode(grade) {
    const isDots = grade === 'grade1';
    document.getElementById('progress-fraction').hidden = isDots;
    document.getElementById('progress-dots').hidden = !isDots;
  }

  function renderProgressDots(filled, total) {
    const wrap = document.getElementById('progress-dots');
    wrap.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('span');
      dot.className = 'progress-dot' + (i < filled ? ' filled' : '');
      wrap.appendChild(dot);
    }
  }

  // ===== Quiz dispatch =====
  function startQuiz(grade, category) {
    stopBalloonGame();
    state.grade = grade;
    state.category = category;
    document.getElementById('quiz-card').classList.remove('memory-mode');
    setMascotGrade(grade);
    setProgressMode(grade);
    showScreen('quiz');
    if (category.type === 'memory') {
      startMemoryGame(category);
    } else if (category.type === 'build') {
      startBuildGame(category);
    } else if (category.type === 'balloon') {
      startBalloonGame(category);
    } else {
      startMcQuiz(category);
    }
  }

  // ===== Multiple-choice quiz =====
  function startMcQuiz(category) {
    state.questions = category.build();
    state.scorableTotal = state.questions.filter(q => q.type !== 'intro').length;
    state.index = 0;
    state.score = 0;
    document.getElementById('q-total').textContent = state.scorableTotal;
    renderQuestion();
  }

  function renderQuestion() {
    state.locked = false;
    const q = state.questions[state.index];
    const feedback = document.getElementById('quiz-feedback');
    feedback.textContent = '';
    feedback.className = 'quiz-feedback';

    document.getElementById('q-index').textContent = Math.min(state.index + 1, state.questions.length);
    document.getElementById('q-score').textContent = state.score;
    const progressPct = (state.index / state.questions.length) * 100;
    document.getElementById('progress-fill').style.width = `${progressPct}%`;
    if (state.grade === 'grade1') renderProgressDots(state.index, state.questions.length);

    const emojiEl = document.getElementById('quiz-emoji');
    const questionEl = document.getElementById('quiz-question');
    const optionsEl = document.getElementById('quiz-options');
    optionsEl.innerHTML = '';
    // The replay button lives as a sibling of questionEl (outside optionsEl), so it
    // survives an early exit (back/home mid-question) unless removed explicitly here.
    document.querySelectorAll('.replay-btn').forEach(el => el.remove());

    if (q.type === 'intro') {
      emojiEl.textContent = q.emoji;
      questionEl.classList.add('passage');
      questionEl.textContent = q.text;
      const btn = document.createElement('button');
      btn.className = 'btn-primary continue-btn';
      btn.textContent = 'המשך לשאלות ←';
      btn.addEventListener('click', nextQuestion);
      optionsEl.appendChild(btn);
      return;
    }

    questionEl.classList.remove('passage');
    emojiEl.textContent = q.emoji || '';
    questionEl.textContent = q.question;

    if (q.speak) {
      const replayBtn = document.createElement('button');
      replayBtn.className = 'replay-btn';
      replayBtn.type = 'button';
      replayBtn.setAttribute('aria-label', 'השמיעו שוב');
      replayBtn.textContent = '🔊';
      replayBtn.addEventListener('click', () => speakHebrew(q.speak));
      questionEl.after(replayBtn);
      setTimeout(() => speakHebrew(q.speak), 250);
    }

    shuffled(q.options).forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => selectAnswer(btn, opt, q.answer));
      optionsEl.appendChild(btn);
    });
  }

  function selectAnswer(btn, chosen, answer) {
    if (state.locked) return;
    state.locked = true;
    const correct = chosen === answer;
    const feedback = document.getElementById('quiz-feedback');
    const allBtns = document.querySelectorAll('.option-btn');

    allBtns.forEach(b => {
      b.disabled = true;
      if (b.textContent === answer) b.classList.add('correct');
    });

    if (correct) {
      state.score++;
      btn.classList.add('correct');
      feedback.textContent = pick(['כל הכבוד! 🎉', 'מעולה! ✨', 'נכון מאוד! 👏', 'איזה יופי! 🌟']);
      feedback.className = 'quiz-feedback good';
      vibrate(30);
      playDing();
      reactMascot('happy');
    } else {
      btn.classList.add('wrong');
      feedback.textContent = pick(['כמעט! נסו שוב בפעם הבאה 💪', 'לא נורא, ממשיכים! 🙂', 'התשובה הנכונה מסומנת למעלה 👆']);
      feedback.className = 'quiz-feedback bad';
      vibrate([20, 40, 20]);
      playBuzz();
      reactMascot('sad');
    }

    document.getElementById('q-score').textContent = state.score;
    const replay = document.querySelector('.replay-btn');
    if (replay) replay.remove();
    setTimeout(nextQuestion, 1100);
  }

  function nextQuestion() {
    state.index++;
    if (state.index >= state.questions.length) {
      finishQuiz(state.score, state.scorableTotal);
    } else {
      renderQuestion();
    }
  }

  // ===== Memory match minigame =====
  const memory = { flipped: [], matched: 0, pairs: 0, mistakes: 0, lock: false };

  function startMemoryGame(category) {
    const symbols = category.build();
    memory.pairs = symbols.length;
    memory.matched = 0;
    memory.mistakes = 0;
    memory.flipped = [];
    memory.lock = false;

    document.getElementById('q-total').textContent = memory.pairs;
    document.getElementById('q-index').textContent = 0;
    document.getElementById('q-score').textContent = 0;
    document.getElementById('progress-fill').style.width = '0%';
    document.getElementById('quiz-feedback').textContent = '';
    document.getElementById('quiz-feedback').className = 'quiz-feedback';
    renderProgressDots(0, memory.pairs);

    const card = document.getElementById('quiz-card');
    card.classList.add('memory-mode');
    const emojiEl = document.getElementById('quiz-emoji');
    const questionEl = document.getElementById('quiz-question');
    const optionsEl = document.getElementById('quiz-options');
    emojiEl.textContent = '';
    questionEl.classList.remove('passage');
    questionEl.textContent = 'מצאו את כל הזוגות!';
    optionsEl.innerHTML = '';

    const board = document.createElement('div');
    board.className = 'memory-board';
    const deck = shuffled([...symbols, ...symbols]);
    deck.forEach((symbol, i) => {
      const cardBtn = document.createElement('button');
      cardBtn.className = 'memory-card';
      cardBtn.dataset.symbol = symbol;
      cardBtn.dataset.index = i;
      cardBtn.innerHTML = '<span class="memory-face">❔</span>';
      cardBtn.addEventListener('click', () => flipMemoryCard(cardBtn));
      board.appendChild(cardBtn);
    });
    optionsEl.appendChild(board);
  }

  function flipMemoryCard(cardBtn) {
    if (memory.lock) return;
    if (cardBtn.classList.contains('flipped') || cardBtn.classList.contains('matched')) return;

    cardBtn.classList.add('flipped');
    cardBtn.querySelector('.memory-face').textContent = cardBtn.dataset.symbol;
    memory.flipped.push(cardBtn);

    if (memory.flipped.length < 2) return;

    memory.lock = true;
    const [a, b] = memory.flipped;
    if (a.dataset.symbol === b.dataset.symbol) {
      vibrate(30);
      playDing();
      reactMascot('happy');
      setTimeout(() => {
        a.classList.add('matched');
        b.classList.add('matched');
        memory.matched++;
        memory.flipped = [];
        memory.lock = false;
        document.getElementById('q-index').textContent = memory.matched;
        document.getElementById('q-score').textContent = memory.matched;
        document.getElementById('progress-fill').style.width = `${(memory.matched / memory.pairs) * 100}%`;
        renderProgressDots(memory.matched, memory.pairs);
        if (memory.matched === memory.pairs) {
          setTimeout(() => finishQuiz(memory.pairs, memory.pairs, memory.mistakes), 500);
        }
      }, 400);
    } else {
      memory.mistakes++;
      playBuzz();
      reactMascot('sad');
      setTimeout(() => {
        a.classList.remove('flipped');
        b.classList.remove('flipped');
        a.querySelector('.memory-face').textContent = '❔';
        b.querySelector('.memory-face').textContent = '❔';
        memory.flipped = [];
        memory.lock = false;
      }, 700);
    }
  }

  // ===== Build-a-sequence minigame (build-a-word / sentence unscramble) =====
  // Each puzzle: { prompt?, instruction, tokens: [...], speak? }. Tokens are
  // tapped in the correct order to fill empty slots. Works for both single
  // Hebrew letters (grade 1, spelling a word) and whole words (grade 5,
  // reordering a sentence) - the engine doesn't care what a token represents.
  const build = { puzzles: [], index: 0, mistakes: 0, slotIndex: 0, tokens: [] };

  function startBuildGame(category) {
    build.puzzles = category.build();
    build.index = 0;
    build.mistakes = 0;
    document.getElementById('q-total').textContent = build.puzzles.length;
    renderBuildPuzzle();
  }

  function renderBuildPuzzle() {
    const puzzle = build.puzzles[build.index];
    build.slotIndex = 0;
    build.tokens = puzzle.tokens;

    document.getElementById('q-index').textContent = build.index;
    document.getElementById('q-score').textContent = build.index;
    document.getElementById('progress-fill').style.width = `${(build.index / build.puzzles.length) * 100}%`;
    if (state.grade === 'grade1') renderProgressDots(build.index, build.puzzles.length);

    const emojiEl = document.getElementById('quiz-emoji');
    const questionEl = document.getElementById('quiz-question');
    const optionsEl = document.getElementById('quiz-options');
    emojiEl.textContent = puzzle.prompt || '';
    questionEl.classList.remove('passage');
    questionEl.textContent = puzzle.instruction;
    optionsEl.innerHTML = '';
    document.querySelectorAll('.replay-btn').forEach(el => el.remove());

    if (puzzle.speak) {
      const replayBtn = document.createElement('button');
      replayBtn.className = 'replay-btn';
      replayBtn.type = 'button';
      replayBtn.setAttribute('aria-label', 'השמיעו שוב');
      replayBtn.textContent = '🔊';
      replayBtn.addEventListener('click', () => speakHebrew(puzzle.speak));
      questionEl.after(replayBtn);
      setTimeout(() => speakHebrew(puzzle.speak), 250);
    }

    const area = document.createElement('div');
    area.className = 'build-area';

    const slotsRow = document.createElement('div');
    slotsRow.className = 'build-slots';
    puzzle.tokens.forEach(() => slotsRow.appendChild(document.createElement('div')).className = 'build-slot');

    const tilesRow = document.createElement('div');
    tilesRow.className = 'build-tiles';
    shuffled(puzzle.tokens.map((value, key) => ({ value, key }))).forEach(tok => {
      const tile = document.createElement('button');
      tile.className = 'build-tile';
      tile.type = 'button';
      tile.textContent = tok.value;
      tile.addEventListener('click', () => handleBuildTileTap(tile, tok.value, puzzle));
      tilesRow.appendChild(tile);
    });

    area.appendChild(slotsRow);
    area.appendChild(tilesRow);
    optionsEl.appendChild(area);
  }

  function handleBuildTileTap(tile, value, puzzle) {
    if (tile.classList.contains('used')) return;
    const expected = build.tokens[build.slotIndex];

    if (value === expected) {
      tile.classList.add('used');
      const slots = document.querySelectorAll('.build-slot');
      slots[build.slotIndex].textContent = value;
      slots[build.slotIndex].classList.add('filled');
      build.slotIndex++;
      vibrate(20);
      if (LETTER_SPEECH_NAME[value]) speakHebrew(LETTER_SPEECH_NAME[value]);

      if (build.slotIndex === build.tokens.length) {
        playDing();
        reactMascot('happy');
        const replay = document.querySelector('.replay-btn');
        if (replay) replay.remove();
        if (puzzle.speak) setTimeout(() => speakHebrew(puzzle.speak), 350);
        setTimeout(nextBuildPuzzle, 1500);
      }
    } else {
      build.mistakes++;
      playBuzz();
      reactMascot('sad');
      vibrate([20, 40, 20]);
      tile.classList.add('wrong');
      setTimeout(() => tile.classList.remove('wrong'), 400);
    }
  }

  function nextBuildPuzzle() {
    build.index++;
    if (build.index >= build.puzzles.length) {
      finishQuiz(build.puzzles.length, build.puzzles.length, build.mistakes);
    } else {
      renderBuildPuzzle();
    }
  }

  // ===== Balloon-pop letter arcade =====
  // Balloons spawn on a timer and float upward; tap the one matching the
  // announced target letter. Runs a real setInterval loop, so every exit path
  // (back, home, starting a different game) must call stopBalloonGame() or the
  // spawner keeps firing into a screen the player has already left.
  const BALLOON_GOAL = 8;
  const BALLOON_COLORS = ['#f472b6', '#8b5cf6', '#38bdf8', '#22c55e', '#facc15', '#fb923c'];
  const balloon = { pool: [], target: null, score: 0, mistakes: 0, spawnInterval: null, timeouts: [], active: false };

  function stopBalloonGame() {
    balloon.active = false;
    if (balloon.spawnInterval) { clearInterval(balloon.spawnInterval); balloon.spawnInterval = null; }
    balloon.timeouts.forEach(t => clearTimeout(t));
    balloon.timeouts = [];
    // A balloon mid-flight when the player leaves never fires 'animationend' (it's
    // now inside a display:none screen), so its own cleanup listener never runs -
    // remove any leftovers immediately instead of leaving them for the next
    // game's innerHTML reset to catch.
    document.querySelectorAll('.balloon').forEach(el => el.remove());
  }

  function startBalloonGame(category) {
    stopBalloonGame();
    balloon.pool = category.build();
    balloon.score = 0;
    balloon.mistakes = 0;
    balloon.active = true;
    document.getElementById('q-total').textContent = BALLOON_GOAL;

    const optionsEl = document.getElementById('quiz-options');
    optionsEl.innerHTML = '';
    const area = document.createElement('div');
    area.className = 'balloon-area';
    area.id = 'balloon-area';
    optionsEl.appendChild(area);

    pickNewBalloonTarget();
    updateBalloonTarget();
    updateBalloonHud();
    balloon.spawnInterval = setInterval(spawnBalloon, 1100);
  }

  function pickNewBalloonTarget() {
    const others = balloon.pool.filter(l => l !== balloon.target);
    balloon.target = pick(others.length ? others : balloon.pool);
  }

  function updateBalloonHud() {
    document.getElementById('q-index').textContent = balloon.score;
    document.getElementById('q-score').textContent = balloon.score;
    document.getElementById('progress-fill').style.width = `${(balloon.score / BALLOON_GOAL) * 100}%`;
    if (state.grade === 'grade1') renderProgressDots(balloon.score, BALLOON_GOAL);
  }

  function updateBalloonTarget() {
    const emojiEl = document.getElementById('quiz-emoji');
    const questionEl = document.getElementById('quiz-question');
    emojiEl.textContent = balloon.target;
    questionEl.classList.remove('passage');
    questionEl.textContent = 'לחצו על הבלון עם האות הזו!';
    document.querySelectorAll('.replay-btn').forEach(el => el.remove());

    const replayBtn = document.createElement('button');
    replayBtn.className = 'replay-btn';
    replayBtn.type = 'button';
    replayBtn.setAttribute('aria-label', 'השמיעו שוב');
    replayBtn.textContent = '🔊';
    replayBtn.addEventListener('click', () => speakHebrew(LETTER_SPEECH_NAME[balloon.target]));
    questionEl.after(replayBtn);
    speakHebrew(LETTER_SPEECH_NAME[balloon.target]);
  }

  function spawnBalloon() {
    if (!balloon.active) return;
    const area = document.getElementById('balloon-area');
    if (!area) { stopBalloonGame(); return; }

    // Weighted toward the target letter so kids aren't waiting too long between chances.
    const letter = Math.random() < 0.4 ? balloon.target : pick(balloon.pool);
    const el = document.createElement('button');
    el.className = 'balloon';
    el.type = 'button';
    el.textContent = letter;
    el.style.left = `${5 + Math.random() * 78}%`;
    el.style.background = pick(BALLOON_COLORS);
    el.style.animationDuration = `${5 + Math.random() * 2.5}s`;
    el.addEventListener('click', () => handleBalloonTap(el, letter));
    el.addEventListener('animationend', () => el.remove());
    area.appendChild(el);
  }

  function handleBalloonTap(el, letter) {
    if (!balloon.active || el.classList.contains('popped')) return;
    el.classList.add('popped');
    balloon.timeouts.push(setTimeout(() => el.remove(), 260));

    if (letter === balloon.target) {
      balloon.score++;
      vibrate(25);
      playDing();
      reactMascot('happy');
      if (balloon.score >= BALLOON_GOAL) {
        stopBalloonGame();
        balloon.timeouts.push(setTimeout(() => finishQuiz(BALLOON_GOAL, BALLOON_GOAL, balloon.mistakes), 500));
      } else {
        pickNewBalloonTarget();
        updateBalloonTarget();
        updateBalloonHud();
      }
    } else {
      balloon.mistakes++;
      vibrate([20, 40, 20]);
      playBuzz();
      reactMascot('sad');
    }
  }

  // ===== Results =====
  function finishQuiz(score, total, mistakes) {
    document.getElementById('progress-fill').style.width = '100%';
    setBest(state.grade, state.category.id, score);
    showResults(score, total, mistakes);
  }

  function showResults(score, total, mistakes) {
    let pct = total ? score / total : 0;
    if (typeof mistakes === 'number') {
      // Memory game: always "completes", so grade by efficiency instead.
      pct = mistakes <= 2 ? 1 : mistakes <= 5 ? 0.75 : mistakes <= 9 ? 0.5 : 0.25;
    }
    state.lastPct = pct;

    document.getElementById('results-score').textContent = `${score} / ${total}`;

    const starCount = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : pct >= 0.3 ? 1 : 0;
    const starsEl = document.getElementById('results-stars');
    starsEl.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const span = document.createElement('span');
      span.className = 'star-slot';
      span.textContent = i < starCount ? '⭐' : '☆';
      starsEl.appendChild(span);
    }
    // Sequential pop-in animation for earned stars.
    const slots = starsEl.querySelectorAll('.star-slot');
    slots.forEach((slot, i) => {
      if (i < starCount) {
        slot.classList.remove('pop');
        void slot.offsetWidth;
        setTimeout(() => slot.classList.add('pop'), i * 220);
      }
    });

    const titleEl = document.getElementById('results-title');
    const emojiEl = document.getElementById('results-emoji');
    const msgEl = document.getElementById('results-msg');

    if (pct >= 0.9) {
      titleEl.textContent = 'מדהים! אלוף/ת עברית! 🏆';
      emojiEl.textContent = '🏆';
      msgEl.textContent = 'הצלחה מרשימה! אתם שולטים בזה נהדר.';
    } else if (pct >= 0.6) {
      titleEl.textContent = 'כל הכבוד!';
      emojiEl.textContent = '🎉';
      msgEl.textContent = 'עבודה טובה! עוד קצת תרגול ותהיו מושלמים.';
    } else if (pct >= 0.3) {
      titleEl.textContent = 'התחלה יפה!';
      emojiEl.textContent = '🙂';
      msgEl.textContent = 'המשיכו לתרגל, אתם משתפרים בכל משחק!';
    } else {
      titleEl.textContent = 'בואו ננסה שוב';
      emojiEl.textContent = '💪';
      msgEl.textContent = 'לא נורא! תרגול עושה מושלם, קדימה עוד סיבוב.';
    }

    // Reward: confetti scaled to performance.
    const intensity = pct >= 0.9 ? 'high' : pct >= 0.6 ? 'mid' : pct > 0 ? 'low' : null;
    if (intensity) setTimeout(() => launchConfetti(intensity), 150);
    if (starCount === 3) setTimeout(playFanfare, 150);

    setupLikeButton();
    showScreen('results');
  }

  function setupLikeButton() {
    const btn = document.getElementById('btn-like');
    const icon = btn.querySelector('.like-icon');
    const liked = isLiked(state.grade, state.category.id);
    btn.classList.toggle('liked', liked);
    icon.textContent = liked ? '❤️' : '🤍';

    btn.onclick = () => {
      const key = likeKey(state.grade, state.category.id);
      const currentlyLiked = localStorage.getItem(key) === '1';
      const total = getTotalLikes();
      if (currentlyLiked) {
        localStorage.setItem(key, '0');
        localStorage.setItem(TOTAL_LIKES_KEY, String(Math.max(0, total - 1)));
        btn.classList.remove('liked');
        icon.textContent = '🤍';
      } else {
        localStorage.setItem(key, '1');
        localStorage.setItem(TOTAL_LIKES_KEY, String(total + 1));
        btn.classList.add('liked');
        icon.textContent = '❤️';
        launchHearts();
      }
      refreshTotalLikesBadge();
    };
  }

  document.getElementById('btn-play-again').addEventListener('click', () => startQuiz(state.grade, state.category));
  document.getElementById('btn-back-menu').addEventListener('click', () => openMenu(state.grade));

  // ===== Offline support: register the service worker (best-effort) =====
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is a bonus */ });
    });
  }
})();
