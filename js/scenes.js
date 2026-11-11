/* ninja-voice-game – scenes.js
   רישום הסצנות (השלבים המיוחדים): כל קובץ סצנה קורא בסופו ל-sceneAdd({...}) פעם אחת, והבסיס (game / state / speech / tester / screens / draw)
   עובר על הרשימה במקום להכיר כל סצנה בשמה. נטען אחרי state.js ולפני קובצי הסצנות.
   בזמן המעבר: סצנות שעוד לא נרשמו ממשיכות לעבוד דרך החיבורים הישנים בבסיס – שתי הדרכים חיות זו לצד זו.

   כל השדות רשות, חוץ מ-type:
     type        סוג המכשול של הסצנה (obstacle.type), למשל 'bikeway'
     word        מילת השלב ב-WORDS / STAGES, למשל 'bike'. כמה שלבים באותה סצנה: words: [...], ואז listen ו-intro הם מפה לפי מילה
     variants    סוגי מכשול נוספים שהם אותה סצנה עם תכונות, למשל { fishboat: { mode: 'fish' } }; variantOf(o) מחזיר את שם הסוג של מכשול קיים
     label       true = מילת השלב היא רק שם, הילד לא אומר אותה (לא מאזינים לה ולא מקריאים אותה בפתיחה)
     listen      מילים נוספות שמאזינים להן כשהשלב פתוח
     active()    האם הסצנה רצה עכשיו
     reset()     איפוס המצב (תחילת משחק / הדגמה)
     setup(o)    בזמן יצירת המכשול – קובע רוחב וכד'
     afterGap    רווח נוסף אחרי הסצנה, בשניות ריצה
     box(o)      תיבת המכשול { l, r, t, b }
     noCollide   true = אין פגיעה רגילה במכשול הזה (הסצנה מטפלת בעצמה)
     stopAt(o)   ה-x שלפניו הנינג'ה מאט ומגיע בהליכה (הקצה הימני שלו)
     update(dt, pb), physics(dt) → true אם טיפלה, speed() → מספר או null, pose(P) → P
     expected() → רשימת מילים או null, auto() – השחקן האוטומטי
     cmd(word)   → true אם המילה שייכת לסצנה. נקרא ראשון: בלי תג "נקלט" ובלי שמירת מילה מוקדמת
     act(word)   → true אם הסצנה ביצעה את המילה. נקרא אחרי תג ה"נקלט" ושמירת מילה מוקדמת, לפני הפעולה הרגילה של המילה
     intro       מסך הפתיחה של השלב: { time, demo() – מציב את הסצנה ליד הנינג'ה, banner – רשות (ברירת מחדל "Say X!"),
                 steps() – רשות: המילים שההדגמה מפעילה לפי זמן [{ at, w, say }] (בלי זה הסצנה מפעילה את עצמה) }
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const SCENES = [];
const SCENE_BY_TYPE = {}, SCENE_BY_WORD = {}, SCENE_VARIANT = {};
function sceneAdd(def) {
  SCENES.push(def);
  if (def.type) SCENE_BY_TYPE[def.type] = def;
  for (const w of def.words || (def.word ? [def.word] : [])) SCENE_BY_WORD[w] = def;
  for (const v in def.variants || {}) SCENE_VARIANT[v] = { type: def.type, props: def.variants[v] };
}

function scenesReset() { for (const s of SCENES) if (s.reset) s.reset(); }
function scenesActive() { for (const s of SCENES) if (s.active && s.active()) return s; return null; }
function scenesUpdate(dt, pb) { for (const s of SCENES) if (s.update) s.update(dt, pb); }
function scenesPhysics(dt) { for (const s of SCENES) if (s.physics && s.physics(dt)) return true; return false; }
function scenesSpeed() { for (const s of SCENES) if (s.speed) { const v = s.speed(); if (v !== null && v !== undefined) return v; } return null; }
function scenesPose(P) { for (const s of SCENES) if (s.pose) P = s.pose(P); return P; }
function scenesExpected() { for (const s of SCENES) if (s.expected) { const e = s.expected(); if (e) return e; } return null; }
function scenesCmd(word) { for (const s of SCENES) if (s.cmd && s.cmd(word)) return true; return false; }
function scenesAct(word) { for (const s of SCENES) if (s.act && s.act(word)) return true; return false; }
function scenesAuto() { for (const s of SCENES) if (s.auto) s.auto(); }
// 👆 במצב בודק: המילה שהסצנה הפעילה מחכה לה. מחזיר true אם יש סצנה רשומה פעילה (גם אם כרגע אין מילה)
function scenesTap() {
  const s = scenesActive(); if (!s) return false;
  const w = ((s.expected && s.expected()) || [])[0]; if (w) command(w, 'tap');
  return true;
}
// המילים שמאזינים להן: מוסיף ל-list את המילים של כל סצנה שהשלב שלה בין words
function scenesListen(words, list) {
  for (const s of SCENES) if (s.listen) for (const sw of s.words || [s.word]) if (words.includes(sw)) for (const w of (Array.isArray(s.listen) ? s.listen : s.listen[sw]) || []) if (!list.includes(w)) list.push(w);
}
function sceneLabel(w) { const s = SCENE_BY_WORD[w]; return !!(s && s.label); }      // מילת שלב שהיא רק שם
function sceneIntro(w) { const s = SCENE_BY_WORD[w]; return (s && (s.words ? s.intro && s.intro[w] : s.intro)) || null; }  // מסך הפתיחה של השלב, אם הסצנה רשומה
// השם שבו מכשול קיים חוזר לחפיסת המסע (סירה במצב דיג חוזרת כ-'fishboat')
function sceneSpawnName(o) { const s = SCENE_BY_TYPE[o.type]; return s && s.variantOf ? s.variantOf(o) : o.type; }
