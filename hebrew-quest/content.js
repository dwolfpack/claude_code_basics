// Content & question banks for "מסע בעברית".
// Every question is { emoji, question, options: [correct, ...wrong], answer }
// game.js shuffles options at render time and compares by value, so order here doesn't matter.
// A question with type:'intro' is a non-scored slide (used to show a reading passage).

const ALPHABET = ['א','ב','ג','ד','ה','ו','ז','ח','ט','י','כ','ל','מ','נ','ס','ע','פ','צ','ק','ר','ש','ת'];

function pickDistractors(correct, count) {
  const pool = ALPHABET.filter(l => l !== correct);
  const picked = [];
  while (picked.length < count && pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(i, 1)[0]);
  }
  return picked;
}

function buildFirstLetterGrade1() {
  const words = [
    { emoji: '🐟', word: 'דג', letter: 'ד' },
    { emoji: '🐶', word: 'כלב', letter: 'כ' },
    { emoji: '🐱', word: 'חתול', letter: 'ח' },
    { emoji: '☀️', word: 'שמש', letter: 'ש' },
    { emoji: '🏠', word: 'בית', letter: 'ב' },
    { emoji: '📖', word: 'ספר', letter: 'ס' },
    { emoji: '🧒', word: 'ילד', letter: 'י' },
    { emoji: '🌸', word: 'פרח', letter: 'פ' },
    { emoji: '🍎', word: 'תפוח', letter: 'ת' },
    { emoji: '🐯', word: 'נמר', letter: 'נ' },
  ];
  return words.map(w => ({
    emoji: w.emoji,
    question: `באיזו אות מתחילה המילה "${w.word}"?`,
    options: [w.letter, ...pickDistractors(w.letter, 3)],
    answer: w.letter,
  }));
}

function buildFillWordGrade1() {
  const items = [
    { emoji: '🐱', display: '_תוֹל', word: 'חתול', answer: 'ח', options: ['ח', 'כ', 'ה', 'ע'] },
    { emoji: '🐶', display: 'כ_ב', word: 'כלב', answer: 'ל', options: ['ל', 'ר', 'ד', 'נ'] },
    { emoji: '🍎', display: '_פּוּחַ', word: 'תפוח', answer: 'ת', options: ['ת', 'ט', 'ד', 'ס'] },
    { emoji: '📖', display: '_פֶר', word: 'ספר', answer: 'ס', options: ['ס', 'ש', 'ז', 'צ'] },
    { emoji: '🏠', display: '_יִת', word: 'בית', answer: 'ב', options: ['ב', 'כ', 'פ', 'נ'] },
    { emoji: '☀️', display: '_מֶש', word: 'שמש', answer: 'ש', options: ['ש', 'ס', 'ע', 'צ'] },
    { emoji: '🧒', display: '_לֶד', word: 'ילד', answer: 'י', options: ['י', 'ו', 'ה', 'א'] },
    { emoji: '🐯', display: '_מֵר', word: 'נמר', answer: 'נ', options: ['נ', 'מ', 'ל', 'ר'] },
  ];
  return items.map(it => ({
    emoji: it.emoji,
    question: `איזו אות חסרה במילה: ${it.display}?`,
    options: it.options,
    answer: it.answer,
  }));
}

function buildWordPictureGrade1() {
  const items = [
    { emoji: '🐶', answer: 'כלב', options: ['כלב', 'כתוב', 'כדור', 'כתם'] },
    { emoji: '🐱', answer: 'חתול', options: ['חתול', 'חלון', 'חושך', 'חג'] },
    { emoji: '☀️', answer: 'שמש', options: ['שמש', 'שמן', 'שיר', 'שק'] },
    { emoji: '🏠', answer: 'בית', options: ['בית', 'ביצה', 'בד', 'בור'] },
    { emoji: '📖', answer: 'ספר', options: ['ספר', 'סכין', 'סוס', 'סבון'] },
    { emoji: '🌸', answer: 'פרח', options: ['פרח', 'פיל', 'פה', 'פחד'] },
    { emoji: '🍎', answer: 'תפוח', options: ['תפוח', 'תיק', 'תור', 'תא'] },
    { emoji: '🐯', answer: 'נמר', options: ['נמר', 'נחש', 'נר', 'נמלה'] },
    { emoji: '⭐', answer: 'כוכב', options: ['כוכב', 'כלב', 'כתר', 'כף'] },
    { emoji: '🌙', answer: 'ירח', options: ['ירח', 'ים', 'יד', 'ילד'] },
  ];
  return items.map(it => ({
    emoji: it.emoji,
    question: 'איזו מילה מתאימה לתמונה?',
    options: it.options,
    answer: it.answer,
  }));
}

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

const CONTENT = {
  grade1: {
    label: 'כיתה א׳',
    categories: [
      { id: 'firstLetter', title: 'איזו אות זאת?', emoji: '🔤', desc: 'מצאו את האות הראשונה במילה', build: buildFirstLetterGrade1 },
      { id: 'fillWord', title: 'השלימו את המילה', emoji: '✏️', desc: 'בחרו את האות החסרה', build: buildFillWordGrade1 },
      { id: 'wordPicture', title: 'איזו מילה מתאימה?', emoji: '🖼️', desc: 'התאימו מילה לתמונה', build: buildWordPictureGrade1 },
    ],
  },
  grade5: {
    label: 'כיתה ה׳',
    categories: [
      { id: 'vocab', title: 'אוצר מילים', emoji: '🧠', desc: 'נרדפות וניגודים', build: buildVocabGrade5 },
      { id: 'roots', title: 'שורשי מילים', emoji: '🌳', desc: 'מצאו את השורש הנכון', build: buildRootsGrade5 },
      { id: 'reading', title: 'הבנת הנקרא', emoji: '📖', desc: 'קראו קטע וענו על שאלות', build: buildReadingGrade5 },
      { id: 'idioms', title: 'ניבים וביטויים', emoji: '💬', desc: 'מה פירוש הביטוי?', build: buildIdiomsGrade5 },
    ],
  },
};
