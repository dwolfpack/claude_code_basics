// Content & question banks for "מסע בעברית".
// Every mc question is { emoji, question, options: [correct, ...wrong], answer, speak? }
// game.js shuffles options at render time and compares by value, so order here doesn't matter.
// A question with type:'intro' is a non-scored slide (used to show a reading passage).
// A category with type:'memory' uses a totally different (non multiple-choice) mini-game.
// `speak` (when present) is spoken aloud via text-to-speech instead of shown as text.

const ALPHABET = ['א','ב','ג','ד','ה','ו','ז','ח','ט','י','כ','ל','מ','נ','ס','ע','פ','צ','ק','ר','ש','ת'];

const LETTER_SPEECH_NAME = {
  'א': 'אלף', 'ב': 'בית', 'ג': 'גימל', 'ד': 'דלת', 'ה': 'הא', 'ו': 'וו',
  'ז': 'זין', 'ח': 'חית', 'ט': 'טית', 'י': 'יוד', 'כ': 'כף', 'ל': 'למד',
  'מ': 'מם', 'נ': 'נון', 'ס': 'סמך', 'ע': 'עין', 'פ': 'פה', 'צ': 'צדי',
  'ק': 'קוף', 'ר': 'ריש', 'ש': 'שין', 'ת': 'תו',
};

function pickDistractors(correct, count, pool) {
  const source = (pool || ALPHABET).filter(l => l !== correct);
  const picked = [];
  while (picked.length < count && source.length) {
    const i = Math.floor(Math.random() * source.length);
    picked.push(source.splice(i, 1)[0]);
  }
  return picked;
}

// ===================== GRADE 1 — no reading required ===================== //

function buildMemoryMatchGrade1() {
  // Returns the pool of unique symbols; game.js duplicates + shuffles into a board.
  // Hebrew letters, not generic pictures, so the memory game itself teaches letter shapes.
  return ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח'];
}

function buildLetterCountGrade1() {
  // A row of letters; count how many times the target letter appears in it.
  const items = [
    { row: ['כ', 'ב', 'כ', 'ד'], target: 'כ' },
    { row: ['א', 'ה', 'א', 'ה', 'א'], target: 'א' },
    { row: ['ש', 'ל', 'ש', 'ל', 'ש', 'ל'], target: 'ש' },
    { row: ['מ', 'מ', 'נ', 'מ'], target: 'מ' },
    { row: ['ת', 'ר', 'ת', 'ר', 'ת'], target: 'ת' },
    { row: ['ד', 'ג', 'ד'], target: 'ד' },
    { row: ['ק', 'פ', 'ק', 'פ', 'פ'], target: 'ק' },
    { row: ['ס', 'ס', 'ס', 'ע'], target: 'ס' },
  ];
  return items.map(it => {
    const count = it.row.filter(l => l === it.target).length;
    const distractors = new Set();
    while (distractors.size < 3) {
      const d = Math.max(1, count + (Math.floor(Math.random() * 5) - 2));
      if (d !== count) distractors.add(d);
    }
    return {
      emoji: it.row.join(' '),
      question: `כמה פעמים מופיעה האות "${it.target}"?`,
      options: [String(count), ...[...distractors].map(String)],
      answer: String(count),
    };
  });
}

function buildLetterSoundGrade1() {
  const letters = ['א', 'ב', 'ש', 'מ', 'ל', 'ת', 'ר', 'כ'];
  return letters.map(letter => ({
    emoji: '🔊',
    question: 'הקשיבו ומצאו את האות שנשמעה',
    options: [letter, ...pickDistractors(letter, 3)],
    answer: letter,
    speak: LETTER_SPEECH_NAME[letter],
  }));
}

function buildWordPictureAudioGrade1() {
  const items = [
    { word: 'כלב', answer: '🐶', options: ['🐶', '🐱', '🐰', '🐻'] },
    { word: 'חתול', answer: '🐱', options: ['🐱', '🐶', '🦊', '🐨'] },
    { word: 'שמש', answer: '☀️', options: ['☀️', '🌙', '⭐', '☁️'] },
    { word: 'בית', answer: '🏠', options: ['🏠', '🏫', '🏥', '🚗'] },
    { word: 'תפוח', answer: '🍎', options: ['🍎', '🍌', '🍇', '🍊'] },
    { word: 'פרח', answer: '🌸', options: ['🌸', '🌳', '🍄', '🌵'] },
    { word: 'דג', answer: '🐟', options: ['🐟', '🐬', '🦀', '🐙'] },
    { word: 'ציפור', answer: '🐦', options: ['🐦', '🦆', '🦉', '🐝'] },
  ];
  return items.map(it => ({
    emoji: '🔊',
    question: 'הקשיבו למילה ובחרו את התמונה המתאימה',
    options: it.options,
    answer: it.answer,
    speak: it.word,
  }));
}

function buildLetterPictureGrade1() {
  // See AND hear a letter (speak = its name), then match a picture whose Hebrew
  // word starts with that letter. Distractor pictures all start with other
  // letters - verified so exactly one option matches the target per item.
  const items = [
    { letter: 'א', correct: '🦁', options: ['🦁', '🐶', '📖', '🌸'] },   // אריה
    { letter: 'ב', correct: '🏠', options: ['🏠', '🐱', '🌙', '⭐'] },   // בית
    { letter: 'ד', correct: '🐻', options: ['🐻', '🦜', '🐵', '❤️'] },  // דוב
    { letter: 'ה', correct: '⛰️', options: ['⛰️', '🐍', '🎒', '🐑'] },  // הר
    { letter: 'ח', correct: '🐱', options: ['🐱', '🚪', '⚽', '🌊'] },   // חתול
    { letter: 'י', correct: '🌙', options: ['🌙', '🐻', '⭐', '🏠'] },   // ירח
    { letter: 'כ', correct: '🐶', options: ['🐶', '🦊', '📖', '🐍'] },   // כלב
    { letter: 'ל', correct: '❤️', options: ['❤️', '🐷', '🎂', '🦓'] },  // לב
    { letter: 'נ', correct: '🐍', options: ['🐍', '🐘', '🎒', '🐑'] },   // נחש
    { letter: 'פ', correct: '🐘', options: ['🐘', '🐶', '❤️', '📖'] },   // פיל
    { letter: 'צ', correct: '🐦', options: ['🐦', '🐴', '🏠', '🐍'] },   // ציפור
    { letter: 'ש', correct: '☀️', options: ['☀️', '🐻', '📖', '🐵'] },   // שמש
    { letter: 'ת', correct: '🍎', options: ['🍎', '🐴', '🎂', '🐍'] },   // תפוח
  ];
  return items.map(it => ({
    emoji: it.letter,
    question: 'הקשיבו וראו את האות - איזו תמונה מתאימה לה?',
    options: it.options,
    answer: it.correct,
    speak: LETTER_SPEECH_NAME[it.letter],
  }));
}

function buildLetterOrderGrade1() {
  const items = [
    { seq: 'א ב ג', next: 'ד' },
    { seq: 'ב ג ד', next: 'ה' },
    { seq: 'ד ה ו', next: 'ז' },
    { seq: 'ו ז ח', next: 'ט' },
    { seq: 'ח ט י', next: 'כ' },
    { seq: 'י כ ל', next: 'מ' },
    { seq: 'ל מ נ', next: 'ס' },
    { seq: 'נ ס ע', next: 'פ' },
    { seq: 'ע פ צ', next: 'ק' },
    { seq: 'צ ק ר', next: 'ש' },
  ];
  return items.map(it => ({
    emoji: `${it.seq} ❓`,
    question: 'איזו אות מגיעה אחר כך באלף-בית?',
    options: [it.next, ...pickDistractors(it.next, 3)],
    answer: it.next,
  }));
}

function buildLetterPatternGrade1() {
  // Same pattern-completion idea as before, but with Hebrew letters instead of
  // generic shapes, so it reinforces letter recognition rather than just logic.
  const items = [
    { seq: ['א', 'ב', 'א', 'ב'], next: 'א' },
    { seq: ['ג', 'ד', 'ג', 'ד'], next: 'ג' },
    { seq: ['ה', 'ו', 'ה', 'ו'], next: 'ה' },
    { seq: ['כ', 'ל', 'כ', 'ל'], next: 'כ' },
    { seq: ['מ', 'מ', 'נ', 'מ', 'מ'], next: 'נ' },
    { seq: ['ע', 'פ', 'ע', 'פ', 'ע'], next: 'פ' },
    { seq: ['ק', 'ק', 'ר', 'ק', 'ק'], next: 'ר' },
    { seq: ['ש', 'ת', 'ש', 'ת'], next: 'ש' },
  ];
  return items.map(it => ({
    emoji: `${it.seq.join(' ')} ❓`,
    question: 'איזו אות מגיעה אחר כך ברצף?',
    options: [it.next, ...pickDistractors(it.next, 3)],
    answer: it.next,
  }));
}

// ===================== GRADE 5 ===================== //

function buildVocabGrade5() {
  const items = [
    { q: 'מהי המילה הנרדפת ל"שמח"?', answer: 'עליז', options: ['עליז', 'עצוב', 'כועס', 'עייף'] },
    { q: 'מהי המילה המנוגדת ל"גדול"?', answer: 'קטן', options: ['קטן', 'ארוך', 'כבד', 'יפה'] },
    { q: 'מהי המילה הנרדפת ל"יפה"?', answer: 'נאה', options: ['נאה', 'מכוער', 'קטן', 'ישן'] },
    { q: 'מהי המילה המנוגדת ל"מהיר"?', answer: 'אטי', options: ['אטי', 'חזק', 'נמוך', 'חכם'] },
    { q: 'מהי המילה הנרדפת ל"חכם"?', answer: 'נבון', options: ['נבון', 'טיפש', 'עצל', 'גבוה'] },
    { q: 'מהי המילה המנוגדת ל"אור"?', answer: 'חושך', options: ['חושך', 'שמש', 'ירח', 'כוכב'] },
    { q: 'מהי המילה הנרדפת ל"קר"?', answer: 'צונן', options: ['צונן', 'חם', 'יבש', 'רטוב'] },
    { q: 'מהי המילה המנוגדת ל"עשיר"?', answer: 'עני', options: ['עני', 'נדיב', 'חזק', 'גבוה'] },
    { q: 'מהי המילה הנרדפת ל"רץ"?', answer: 'דוהר', options: ['דוהר', 'הולך', 'יושב', 'ישן'] },
    { q: 'מהי המילה המנוגדת ל"פתוח"?', answer: 'סגור', options: ['סגור', 'ריק', 'מלא', 'נקי'] },
  ];
  return items.map(it => ({ emoji: '🧠', question: it.q, options: it.options, answer: it.answer }));
}

function buildRootsGrade5() {
  const items = [
    { word: 'מִכְתָּב', answer: 'כ-ת-ב', options: ['כ-ת-ב', 'מ-כ-ת', 'ת-ב-ם', 'כ-ת-ם'] },
    { word: 'הִתְלַבֵּש', answer: 'ל-ב-ש', options: ['ל-ב-ש', 'ה-ת-ל', 'ל-ב-ן', 'ב-ש-ל'] },
    { word: 'מֵרוֹץ', answer: 'ר-ו-ץ', options: ['ר-ו-ץ', 'מ-ר-ץ', 'ר-ץ-ם', 'ר-א-ץ'] },
    { word: 'מַחְשָבָה', answer: 'ח-ש-ב', options: ['ח-ש-ב', 'מ-ח-ש', 'ש-ב-ה', 'ח-ש-ק'] },
    { word: 'הִתְרַגְשוּת', answer: 'ר-ג-ש', options: ['ר-ג-ש', 'ה-ת-ר', 'ר-ג-ע', 'ג-ש-ם'] },
    { word: 'מִשְׂחָק', answer: 'ש-ח-ק', options: ['ש-ח-ק', 'מ-ש-ח', 'ח-ק-ה', 'ש-ח-ט'] },
    { word: 'לִימוּד', answer: 'ל-מ-ד', options: ['ל-מ-ד', 'ל-י-מ', 'מ-ו-ד', 'ל-מ-ה'] },
    { word: 'הַצְלָחָה', answer: 'צ-ל-ח', options: ['צ-ל-ח', 'ה-צ-ל', 'ל-ח-ה', 'צ-ל-ל'] },
    { word: 'כְּתִיבָה', answer: 'כ-ת-ב', options: ['כ-ת-ב', 'כ-ת-י', 'ת-י-ב', 'כ-ת-ר'] },
    { word: 'שְמִירָה', answer: 'ש-מ-ר', options: ['ש-מ-ר', 'ש-מ-י', 'מ-י-ר', 'ש-מ-ן'] },
  ];
  return items.map(it => ({
    emoji: '🌳',
    question: `מהו השורש של המילה "${it.word}"?`,
    options: it.options,
    answer: it.answer,
  }));
}

function buildIdiomsGrade5() {
  const items = [
    { idiom: 'לשבור את הראש', answer: 'לחשוב קשה כדי לפתור בעיה', options: ['לחשוב קשה כדי לפתור בעיה', 'לפגוע במישהו', 'להיות עצוב מאוד', 'לישון עמוק'] },
    { idiom: 'לתת יד', answer: 'לעזור למישהו', options: ['לעזור למישהו', 'להצביע על מישהו', 'ללחוץ ידיים', 'לקחת משהו'] },
    { idiom: 'לצאת מהכלים', answer: 'לכעוס מאוד', options: ['לכעוס מאוד', 'לצחוק חזק', 'לצאת מהבית', 'להתעייף'] },
    { idiom: 'להיות עם הראש בעננים', answer: 'לחלום בהקיץ ולא להיות מרוכזים', options: ['לחלום בהקיץ ולא להיות מרוכזים', 'להיות גבוה מאוד', 'לטוס במטוס', 'להיות חכם מאוד'] },
    { idiom: 'לעשות אוזניים', answer: 'להתעלם ולא להקשיב', options: ['להתעלם ולא להקשיב', 'להקשיב היטב', 'לצייר אוזניים', 'לדבר בקול רם'] },
    { idiom: 'לשמור על קור רוח', answer: 'להישאר רגועים גם במצב לחוץ', options: ['להישאר רגועים גם במצב לחוץ', 'להתלבש חם', 'לפחד מהקור', 'לרוץ מהר'] },
  ];
  return items.map(it => ({
    emoji: '💬',
    question: `מה פירוש הביטוי "${it.idiom}"?`,
    options: it.options,
    answer: it.answer,
  }));
}

function buildReadingGrade5() {
  const passage = `הַקִּנָּמוֹן: תַּבְלִין עִם הִיסְטוֹרְיָה
לִפְנֵי אַלְפֵי שָׁנִים, סוֹחֲרִים מֵהַמִּזְרָח הָרָחוֹק שָׁטוּ בִּסְפִינוֹת כְּדֵי לְהָבִיא קִנָּמוֹן לְאַרְצוֹת הַיָּם הַתִּיכוֹן. הַקִּנָּמוֹן הוּפַק מִקְּלִפַּת עֵץ מְיֻחָד שֶׁגָּדַל בְּאִיִּים רְחוֹקִים, וְהָיָה יָקָר כָּל כָּךְ עַד שֶׁנֶּחְשַׁב לְמַתָּנָה רְאוּיָה לַמְּלָכִים. הַדֶּרֶךְ הָיְתָה אֲרֻכָּה וּמְסֻכֶּנֶת, וְלָכֵן מְעַט אֲנָשִׁים יָדְעוּ בֶּאֱמֶת מֵאַיִן הוּא מַגִּיעַ. הַיּוֹם, קִנָּמוֹן גָּדֵל בִּמְקוֹמוֹת רַבִּים בָּעוֹלָם, וְאֶפְשָׁר לִמְצֹא אוֹתוֹ כִּמְעַט בְּכָל מִטְבָּח. הוּא מְשַׁמֵּשׁ לְתַבְלוּן עוּגוֹת, מַשְׁקָאוֹת חַמִּים וַאֲפִלּוּ תַּבְשִׁילִים מְלוּחִים.`;

  const questions = [
    { type: 'intro', emoji: '📖', text: passage },
    { q: 'מאיפה הובא הקינמון בעבר?', answer: 'מהמזרח הרחוק', options: ['מהמזרח הרחוק', 'מאירופה', 'מאפריקה', 'מאמריקה'] },
    { q: 'ממה מופק הקינמון?', answer: 'מקליפת עץ מיוחד', options: ['מקליפת עץ מיוחד', 'משורש של צמח', 'מפרי מתוק', 'מעלים ירוקים'] },
    { q: 'למה מעט אנשים ידעו מאין מגיע הקינמון?', answer: 'כי הדרך הייתה ארוכה ומסוכנת', options: ['כי הדרך הייתה ארוכה ומסוכנת', 'כי זה היה סוד משפחתי', 'כי לא היה להם מפות', 'כי הוא גדל רק בלילה'] },
    { q: 'למה משתמשים בקינמון היום?', answer: 'לתבלון עוגות, משקאות ותבשילים', options: ['לתבלון עוגות, משקאות ותבשילים', 'רק לבניית ריהוט', 'רק לצביעת בגדים', 'רק לתרופות'] },
  ];

  return questions.map(item => item.type === 'intro'
    ? item
    : { emoji: '📖', question: item.q, options: item.options, answer: item.answer }
  );
}

function buildGrammarGrade5() {
  const items = [
    { sentence: 'הילד קרא ספר מעניין', ask: 'פועל (מילת פעולה)', answer: 'קרא', options: ['קרא', 'הילד', 'ספר', 'מעניין'] },
    { sentence: 'הכלב הגדול רץ בגן', ask: 'פועל (מילת פעולה)', answer: 'רץ', options: ['רץ', 'הכלב', 'הגדול', 'בגן'] },
    { sentence: 'הילדה ציירה ציור צבעוני', ask: 'שם עצם', answer: 'ציור', options: ['ציור', 'הילדה', 'ציירה', 'צבעוני'] },
    { sentence: 'המורה החכמה הסבירה שיעור', ask: 'שם תואר (מתארת)', answer: 'החכמה', options: ['החכמה', 'המורה', 'הסבירה', 'שיעור'] },
    { sentence: 'השמש הצהובה זרחה בשמיים', ask: 'שם תואר (מתארת)', answer: 'הצהובה', options: ['הצהובה', 'השמש', 'זרחה', 'בשמיים'] },
    { sentence: 'הציפור הקטנה עפה גבוה', ask: 'פועל (מילת פעולה)', answer: 'עפה', options: ['עפה', 'הציפור', 'הקטנה', 'גבוה'] },
    { sentence: 'הילדים שיחקו כדורגל בחצר', ask: 'שם עצם', answer: 'כדורגל', options: ['כדורגל', 'הילדים', 'שיחקו', 'בחצר'] },
    { sentence: 'האוכל הטעים היה על השולחן', ask: 'שם תואר (מתארת)', answer: 'הטעים', options: ['הטעים', 'האוכל', 'היה', 'השולחן'] },
    { sentence: 'התלמיד החרוץ סיים שיעורי בית', ask: 'שם תואר (מתארת)', answer: 'החרוץ', options: ['החרוץ', 'התלמיד', 'סיים', 'בית'] },
    { sentence: 'הדגים השחורים שחו במהירות', ask: 'שם עצם', answer: 'הדגים', options: ['הדגים', 'השחורים', 'שחו', 'במהירות'] },
  ];
  return items.map(it => ({
    emoji: '📝',
    question: `במשפט "${it.sentence}" - איזו מילה היא ${it.ask}?`,
    options: it.options,
    answer: it.answer,
  }));
}

function buildVerbTenseGrade5() {
  const items = [
    { verb: 'הוא אכל', answer: 'עבר' },
    { verb: 'הוא אוכל', answer: 'הווה' },
    { verb: 'הוא יאכל', answer: 'עתיד' },
    { verb: 'היא כתבה', answer: 'עבר' },
    { verb: 'היא כותבת', answer: 'הווה' },
    { verb: 'היא תכתוב', answer: 'עתיד' },
    { verb: 'הם שיחקו', answer: 'עבר' },
    { verb: 'הם משחקים', answer: 'הווה' },
    { verb: 'הם ישחקו', answer: 'עתיד' },
    { verb: 'אני קראתי', answer: 'עבר' },
  ];
  return items.map(it => ({
    emoji: '⏳',
    question: `באיזה זמן נכתב הפועל ב-"${it.verb}"?`,
    options: ['עבר', 'הווה', 'עתיד'],
    answer: it.answer,
  }));
}

const CONTENT = {
  grade1: {
    label: 'כיתה א׳',
    categories: [
      { id: 'memoryMatch', title: 'זיכרון אותיות', emoji: '🃏', desc: 'מצאו את זוגות האותיות', type: 'memory', build: buildMemoryMatchGrade1 },
      { id: 'letterCount', title: 'ספרו אותיות', emoji: '🔢', desc: 'כמה פעמים מופיעה האות?', build: buildLetterCountGrade1 },
      { id: 'letterSound', title: 'הקשיבו ומצאו אות', emoji: '🔊', desc: 'זהו את האות שנשמעה', build: buildLetterSoundGrade1 },
      { id: 'wordPictureAudio', title: 'הקשיבו ובחרו תמונה', emoji: '🖼️', desc: 'הקשיבו למילה ובחרו תמונה', build: buildWordPictureAudioGrade1 },
      { id: 'letterPicture', title: 'אות ותמונה', emoji: '🦁', desc: 'ראו ושמעו אות, מצאו תמונה מתאימה', build: buildLetterPictureGrade1 },
      { id: 'letterOrder', title: 'סדר האותיות', emoji: '🔡', desc: 'מה האות הבאה באלף-בית?', build: buildLetterOrderGrade1 },
      { id: 'letterPattern', title: 'מה הבא ברצף?', emoji: '🧩', desc: 'השלימו את רצף האותיות', build: buildLetterPatternGrade1 },
    ],
  },
  grade5: {
    label: 'כיתה ה׳',
    categories: [
      { id: 'vocab', title: 'אוצר מילים', emoji: '🧠', desc: 'נרדפות וניגודים', build: buildVocabGrade5 },
      { id: 'roots', title: 'שורשי מילים', emoji: '🌳', desc: 'מצאו את השורש הנכון', build: buildRootsGrade5 },
      { id: 'reading', title: 'הבנת הנקרא', emoji: '📖', desc: 'קראו קטע וענו על שאלות', build: buildReadingGrade5 },
      { id: 'idioms', title: 'ניבים וביטויים', emoji: '💬', desc: 'מה פירוש הביטוי?', build: buildIdiomsGrade5 },
      { id: 'grammar', title: 'חלקי דיבור', emoji: '📝', desc: 'פועל, שם עצם או שם תואר?', build: buildGrammarGrade5 },
      { id: 'verbTense', title: 'זמני פועל', emoji: '⏳', desc: 'עבר, הווה או עתיד?', build: buildVerbTenseGrade5 },
    ],
  },
};
