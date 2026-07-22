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
  return ['🐶', '🐱', '🐰', '🦁', '🐼', '🐸', '🦋', '🐢'];
}

function buildCountingGrade1() {
  const items = [
    { emoji: '🍎', count: 3 },
    { emoji: '⚽', count: 5 },
    { emoji: '🎈', count: 2 },
    { emoji: '🐝', count: 4 },
    { emoji: '🌟', count: 6 },
    { emoji: '🐠', count: 3 },
    { emoji: '🍌', count: 7 },
    { emoji: '🌸', count: 5 },
  ];
  return items.map(it => {
    const distractors = new Set();
    while (distractors.size < 3) {
      const d = Math.max(1, it.count + (Math.floor(Math.random() * 5) - 2));
      if (d !== it.count) distractors.add(d);
    }
    return {
      emoji: it.emoji.repeat(it.count),
      question: 'כמה יש כאן?',
      options: [String(it.count), ...[...distractors].map(String)],
      answer: String(it.count),
    };
  });
}

function buildShapesColorsGrade1() {
  const items = [
    { target: '🔴', options: ['🔴', '🔵', '🟢', '🟡'] },
    { target: '🟦', options: ['🟦', '🟥', '🟩', '🟨'] },
    { target: '🔺', options: ['🔺', '🔻', '⭐', '⬛'] },
    { target: '⭐', options: ['⭐', '🌙', '☀️', '❤️'] },
    { target: '❤️', options: ['❤️', '💙', '💚', '💛'] },
    { target: '🟣', options: ['🟣', '🟠', '🔴', '🔵'] },
    { target: '⬛', options: ['⬛', '⬜', '🟥', '🟦'] },
    { target: '🔻', options: ['🔻', '🔺', '🔷', '🔶'] },
  ];
  return items.map(it => ({
    emoji: it.target,
    question: 'מצאו את אותה הצורה',
    options: it.options,
    answer: it.target,
  }));
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

function buildLetterAnimalGrade1() {
  // Each entry: a target letter, the correct animal (whose Hebrew name starts
  // with it), and 3 distractor animals whose names start with other letters.
  // Verified so exactly one option matches the target letter.
  const items = [
    { letter: 'כ', correct: '🐶', options: ['🐶', '🦁', '🐘', '🐍'] }, // כלב
    { letter: 'ח', correct: '🐱', options: ['🐱', '🐴', '🦆', '🦉'] }, // חתול
    { letter: 'פ', correct: '🐘', options: ['🐘', '🐱', '🐭', '🐢'] }, // פיל
    { letter: 'א', correct: '🦁', options: ['🦁', '🐶', '🐟', '🦊'] }, // אריה
    { letter: 'ד', correct: '🐻', options: ['🐻', '🐰', '🐵', '🦓'] }, // דוב
    { letter: 'נ', correct: '🐍', options: ['🐍', '🐘', '🐑', '🦆'] }, // נחש
    { letter: 'ש', correct: '🦊', options: ['🦊', '🐷', '🐢', '🐭'] }, // שועל
    { letter: 'ז', correct: '🦓', options: ['🦓', '🐯', '🦜', '🐴'] }, // זברה
    { letter: 'ת', correct: '🦜', options: ['🦜', '🐘', '🐍', '🐱'] }, // תוכי
    { letter: 'ק', correct: '🐵', options: ['🐵', '🦋', '🐺', '🐑'] }, // קוף
  ];
  return items.map(it => ({
    emoji: it.letter,
    question: 'איזו חיה מתחילה באות הזו?',
    options: it.options,
    answer: it.correct,
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

function buildPatternsGrade1() {
  const items = [
    { seq: '🔴🔵🔴🔵', next: '🔴', options: ['🔴', '🔵', '🟢', '🟡'] },
    { seq: '⭐🌙⭐🌙', next: '⭐', options: ['⭐', '🌙', '☀️', '❤️'] },
    { seq: '🍎🍌🍎🍌', next: '🍎', options: ['🍎', '🍌', '🍇', '🍊'] },
    { seq: '🔺🔺🔻🔺🔺', next: '🔻', options: ['🔻', '🔺', '⭐', '⬛'] },
    { seq: '🐱🐶🐱🐶🐱', next: '🐶', options: ['🐶', '🐱', '🐰', '🐻'] },
    { seq: '🟢🟢🟡🟢🟢', next: '🟡', options: ['🟡', '🟢', '🔵', '🔴'] },
    { seq: '☀️🌙☀️🌙☀️', next: '🌙', options: ['🌙', '☀️', '⭐', '☁️'] },
    { seq: '🐸🐸🦋🐸🐸', next: '🦋', options: ['🦋', '🐸', '🐢', '🐰'] },
  ];
  return items.map(it => ({
    emoji: `${it.seq}❓`,
    question: 'מה מגיע אחר כך ברצף?',
    options: it.options,
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
      { id: 'memoryMatch', title: 'משחק זיכרון', emoji: '🃏', desc: 'מצאו את הזוגות התואמים', type: 'memory', build: buildMemoryMatchGrade1 },
      { id: 'counting', title: 'ספירה כיפית', emoji: '🔢', desc: 'כמה יש בתמונה?', build: buildCountingGrade1 },
      { id: 'shapesColors', title: 'צבעים וצורות', emoji: '🔺', desc: 'מצאו את הצורה הזהה', build: buildShapesColorsGrade1 },
      { id: 'letterSound', title: 'הקשיבו ומצאו אות', emoji: '🔊', desc: 'זהו את האות שנשמעה', build: buildLetterSoundGrade1 },
      { id: 'wordPictureAudio', title: 'הקשיבו ובחרו תמונה', emoji: '🖼️', desc: 'הקשיבו למילה ובחרו תמונה', build: buildWordPictureAudioGrade1 },
      { id: 'letterAnimal', title: 'אות וחיה', emoji: '🦁', desc: 'איזו חיה מתחילה באות?', build: buildLetterAnimalGrade1 },
      { id: 'letterOrder', title: 'סדר האותיות', emoji: '🔡', desc: 'מה האות הבאה באלף-בית?', build: buildLetterOrderGrade1 },
      { id: 'patterns', title: 'מה הבא ברצף?', emoji: '🧩', desc: 'השלימו את הרצף', build: buildPatternsGrade1 },
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
