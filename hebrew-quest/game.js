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
  };

  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  function shuffled(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function bestKey(grade, categoryId) {
    return `hebrewquest_best_${grade}_${categoryId}`;
  }

  function getBest(grade, categoryId) {
    return Number(localStorage.getItem(bestKey(grade, categoryId)) || 0);
  }

  function setBest(grade, categoryId, score) {
    const cur = getBest(grade, categoryId);
    if (score > cur) localStorage.setItem(bestKey(grade, categoryId), String(score));
  }

  // ===== Home =====
  document.querySelectorAll('.grade-card').forEach(btn => {
    btn.addEventListener('click', () => openMenu(btn.dataset.grade));
  });

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
  document.getElementById('btn-quiz-back').addEventListener('click', () => openMenu(state.grade));

  // ===== Quiz =====
  function startQuiz(grade, category) {
    state.grade = grade;
    state.category = category;
    state.questions = category.build();
    state.scorableTotal = state.questions.filter(q => q.type !== 'intro').length;
    state.index = 0;
    state.score = 0;
    document.getElementById('q-total').textContent = state.scorableTotal;
    showScreen('quiz');
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

    const emojiEl = document.getElementById('quiz-emoji');
    const questionEl = document.getElementById('quiz-question');
    const optionsEl = document.getElementById('quiz-options');
    optionsEl.innerHTML = '';

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
    } else {
      btn.classList.add('wrong');
      feedback.textContent = pick(['כמעט! נסו שוב בפעם הבאה 💪', 'לא נורא, ממשיכים! 🙂', 'התשובה הנכונה מסומנת למעלה 👆']);
      feedback.className = 'quiz-feedback bad';
    }

    document.getElementById('q-score').textContent = state.score;
    setTimeout(nextQuestion, 1100);
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function nextQuestion() {
    state.index++;
    if (state.index >= state.questions.length) {
      finishQuiz();
    } else {
      renderQuestion();
    }
  }

  function finishQuiz() {
    document.getElementById('progress-fill').style.width = '100%';
    setBest(state.grade, state.category.id, state.score);
    showResults();
  }

  // ===== Results =====
  function showResults() {
    const total = state.scorableTotal;
    const score = state.score;
    const pct = total ? score / total : 0;

    document.getElementById('results-score').textContent = `${score} / ${total}`;

    const starsEl = document.getElementById('results-stars');
    const starCount = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : pct >= 0.3 ? 1 : 0;
    starsEl.textContent = '⭐'.repeat(starCount) + '☆'.repeat(3 - starCount);

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

    showScreen('results');
  }

  document.getElementById('btn-play-again').addEventListener('click', () => startQuiz(state.grade, state.category));
  document.getElementById('btn-back-menu').addEventListener('click', () => openMenu(state.grade));
})();
