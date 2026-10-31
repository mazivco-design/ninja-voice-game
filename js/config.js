/* ninja-voice-game – config.js
   הגדרות: מילים, רמות קושי, שלבים, וגדלים של כל המכשולים
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

/* ============================================================
   הגדרות
   ============================================================ */
const MODEL_URL = 'https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz';

// כל המילים שהמשחק מכיר
const WORDS = ['jump', 'down', 'kick', 'throw', 'catch', 'fly', 'stop', 'run', 'swim', 'climb', 'push', 'pull', 'hide', 'block', 'leap', 'dive', 'crawl', 'fire', 'want', 'let go', 'ride', 'fight', 'hold', 'pick up'];
// סדר התחנות במסע – אפשר לשנות בעורך (tester → 🧭). נשמר ב-ninjaVoice_wordOrder (ומסתנכרן בין מכשירים)
const WORDS_DEFAULT = WORDS.slice();
(function applyWordOrder() {
  try {
    const ord = JSON.parse(localStorage.getItem('ninjaVoice_wordOrder') || 'null');
    if (!Array.isArray(ord)) return;
    const known = ord.filter((w, i) => WORDS_DEFAULT.includes(w) && ord.indexOf(w) === i);
    const rest = WORDS_DEFAULT.filter(w => !known.includes(w));                  // מילים חדשות שנוספו מאז – בסוף
    if (known[0] !== 'jump') return;                                            // JUMP תמיד ראשונה (התחנה של כולם)
    WORDS.splice(0, WORDS.length, ...known, ...rest);
  } catch (e) {}
})();
const WORD_ICON = { jump: '⬆️', down: '⬇️', kick: '🦶', throw: '✴️', catch: '🟡', fly: '🪁',
                    stop: '✋', run: '💨', swim: '🌊', climb: '🧗', push: '🪨', pull: '⛓️', hide: '🌿', block: '🛡️', leap: '🤸', dive: '🤿', crawl: '🐛', fire: '🔥', want: '🙋', 'let go': '🪢', ride: '🐉', fight: '⚔️', hold: '🎋', 'pick up': '🏋️', 'put down': '🫳' };

// רמות קושי – קובעות מהירות, לבבות וקפיצה.
// gapT = הזמן (בשניות) בין מכשול למכשול. מוגדר בזמן ולא במרחק,
// כדי שתמיד יהיה מספיק זמן להגיב – גם כשהמהירות עולה.
// gravity / jumpV = הקפיצה. ברמה הקלה היא "מרחפת" יותר.
const LEVELS = {
  easy:   { speed: 35, accel: 0,   maxSpeed: 35, gapT: [2.6, 3.6], lives: 5,        penalty: 1, gravity: 100, jumpV: 63, forgive: 1.5 },
  medium: { speed: 50, accel: 0,   maxSpeed: 50, gapT: [1.8, 2.6], lives: 3,        penalty: 0, gravity: 160, jumpV: 80, forgive: 0 },
  hard:   { speed: 55, accel: 0.5, maxSpeed: 70, gapT: [1.5, 2.2], lives: 2,        penalty: 0, gravity: 160, jumpV: 80, forgive: 0 }
};

// שלבים. כל זוג מילים מקבל 3 שלבים: מילה אחת, מילה שנייה, ומעורבב.
// מילים חדשות בעתיד = מוסיפים כאן שלבים.
const STAGES = [
  { name: 'JUMP',         words: ['jump'],           count: 4,  hint: 'Say JUMP to jump over boxes' },
  { name: 'DOWN',         words: ['down'],           count: 4,  hint: 'Say DOWN to duck under beams' },
  { name: 'JUMP + DOWN',  words: ['jump', 'down'],   count: 10, hint: 'Read the word!' },
  { name: 'KICK',         words: ['kick'],           count: 4,  hint: 'Say KICK to break walls' },
  { name: 'THROW',        words: ['throw'],          count: 4,  hint: 'Say THROW to stop enemies' },
  { name: 'KICK + THROW', words: ['kick', 'throw'],  count: 10, hint: 'Read the word!' },
  { name: 'CATCH',        words: ['catch'],          count: 4,  hint: 'Say CATCH to grab coins' },
  { name: 'JUMP + FLY',   words: ['fly'],            count: 4,  hint: 'Say JUMP, then FLY over the lava' },
  { name: 'CATCH + FLY',  words: ['catch', 'fly'],   count: 10, hint: 'Read the word!' },
  { name: 'STOP',         words: ['stop'],           count: 4,  hint: 'Say STOP before the rock falls' },
  { name: 'RUN',          words: ['run'],            count: 4,  hint: 'Say RUN to cross the fire field' },
  { name: 'STOP + RUN',   words: ['stop', 'run'],    count: 10, hint: 'Read the word!' },
  { name: 'SWIM',         words: ['swim'],           count: 4,  hint: 'Say SWIM to cross the lake' },
  { name: 'CLIMB',        words: ['climb'],          count: 4,  hint: 'Say CLIMB to go up the cliff' },
  { name: 'SWIM + CLIMB', words: ['swim', 'climb'],  count: 10, hint: 'Read the word!' },
  { name: 'PUSH',         words: ['push'],           count: 4,  hint: 'Say PUSH to move the rock' },
  { name: 'PULL',         words: ['pull'],           count: 4,  hint: 'Say PULL to open the gate' },
  { name: 'PUSH + PULL',  words: ['push', 'pull'],   count: 10, hint: 'Read the word!' },
  { name: 'HIDE',         words: ['hide'],           count: 4,  hint: 'Say HIDE when the guards come' },
  { name: 'BLOCK',        words: ['block'],          count: 4,  hint: 'Say BLOCK to stop the arrows' },
  { name: 'HIDE + BLOCK', words: ['hide', 'block'],  count: 10, hint: 'Read the word!' },
  { name: 'LEAP',         words: ['leap'],           count: 4,  hint: 'Say LEAP to fly through the window' },
  { name: 'DIVE',         words: ['dive'],           count: 4,  hint: 'Say DIVE to swim under the net' },
  { name: 'LEAP + DIVE',  words: ['leap', 'dive'],   count: 10, hint: 'Read the word!' },
  { name: 'CRAWL',        words: ['crawl'],          count: 4,  hint: 'Say CRAWL to go under the big rock' },
  { name: 'FIRE',         words: ['fire'],           count: 4,  hint: 'Say FIRE to smash the ice wall' },
  { name: 'CRAWL + FIRE', words: ['crawl', 'fire'],  count: 10, hint: 'Read the word!' },
  { name: 'I WANT',       words: ['want'],           count: 4,  hint: 'Say I WANT, then the thing you need' },
  { name: 'LET GO',       words: ['let go'],         count: 4,  hint: 'Say CATCH to grab the rope, then LET GO', world: 5 },
  { name: 'RIDE',         words: ['ride'],           count: 8,  hint: 'RIDE the dragon · UP / DOWN past rocks · FIRE at storms', world: 2 },
  { name: 'FIGHT',        words: ['fight'],          count: 4,  hint: 'Say FIGHT, FIGHT, FIGHT to win the duel', world: 4 },
  { name: 'HOLD',         words: ['hold'],           count: 4,  hint: 'Say HOLD to grab the bamboo before the wind', world: 0 },
  { name: 'PICK UP',      words: ['pick up'],        count: 4,  hint: 'PICK UP the rock · PUT DOWN · JUMP', world: 3 }
];
// איזה עולם לכל זוג מילים (0 במבוק, 1 כפר בלילה, 2 שלג, 3 קניון, 4 מקדש)
const PAIR_WORLD = [0, 1, 2, 3, 0, 4, 1, 2, 3, 0, 3];

// איזה מכשול מתאים לכל מילה
const WORD_OBSTACLE = { jump: 'box', down: 'beam', kick: 'wall', throw: 'enemy', catch: 'coin', fly: 'river',
                        stop: 'rock', run: 'bridge', swim: 'lake', climb: 'cliff', push: 'boulder', pull: 'gate', hide: 'guard', block: 'arrows',
                        leap: 'window', dive: 'pond', crawl: 'bramble', fire: 'ice', want: 'door', 'let go': 'chasm', ride: 'dragon', fight: 'duel', hold: 'gust', 'pick up': 'lift' };
// זיהוי קולי: מילה שמתאימה למכשול שעל המסך מופעלת מיד. מילה אחרת מחכה לתוצאה הסופית, ומופעלת רק בביטחון גבוה
const VOICE = { confMin: 0.8, waitMs: 350, logMax: 200 };   // waitMs: מילה שלא מתאימה למכשול הקרוב מחכה לכל היותר כך לציון, ואז מופעלת בכל מקרה
// אילו מילים "מצופות" ליד כל מכשול (ההפך של WORD_OBSTACLE, ועוד מילים שעובדות יחד)
const OBSTACLE_WORDS = Object.fromEntries(Object.entries(WORD_OBSTACLE).map(([w, t]) => [t, [w]]));
OBSTACLE_WORDS.river = ['jump', 'fly'];
OBSTACLE_WORDS.chasm = ['catch', 'let go'];
OBSTACLE_WORDS.skyrock = ['up', 'down'];
OBSTACLE_WORDS.storm = ['fire'];
OBSTACLE_WORDS.lift = ['pick up', 'put down', 'jump'];
const HIT_WORD = { box: 'JUMP!', beam: 'DOWN!', wall: 'KICK!', enemy: 'THROW!', river: 'JUMP + FLY!',
                   rock: 'STOP!', bridge: 'RUN!', lake: 'SWIM!', cliff: 'CLIMB!', boulder: 'PUSH!', gate: 'PULL!', guard: 'HIDE!', arrows: 'BLOCK!',
                   window: 'LEAP!', pond: 'DIVE!', coin: 'CATCH!', bramble: 'CRAWL!', ice: 'FIRE!', door: 'I WANT A KEY!', chasm: 'CATCH… LET GO!', dragon: 'RIDE!', duel: 'FIGHT!', gust: 'HOLD!', lift: 'PICK UP!', skyrock: 'UP or DOWN!', storm: 'FIRE!' };

// "העולם" של המשחק: 160 על 100 יחידות, מוגדל לגודל המסך
const W = 160, H = 100, GROUND = 72;   // קרקע גבוהה יותר – מקום לעומק מתחתיה (בורות, צלילה, נתיב קדמי)
const PLAYER = { x: 25, w: 8, h: 14, duckW: 10, duckH: 8 };
const DUCK_TIME = 1.0;                 // כמה זמן הנינג'ה נשאר כפוף אחרי כל "down"
const INVULN_TIME = 1.2;               // זמן חסינות אחרי פגיעה
const BOX = { w: 6, h: 9 };            // JUMP – קופצים מעליו
const BEAM = { w: 8, clear: 11, thick: 5 }; // DOWN – מתכופפים מתחתיו
const WALL = { w: 5, h: 30 };          // KICK – גבוה מדי לקפיצה
const KICK = { time: 0.5, range: 14 }; // בעיטה פעילה חצי שנייה, מגיעה 14 יחידות קדימה
const ENEMY = { w: 9, h: 22, extra: 0.3 }; // THROW – אויב גבוה, רץ מהר יותר מהמסך
const SHURIKEN = { speed: 110, cooldown: 0.35 };
const COIN = { y: GROUND - 24, reachBack: 4, reachFwd: 34 }; // CATCH – מטבע זהב באוויר
const FLY = { time: 2.5, sink: 3 };    // FLY – גלישה 2.5 שניות, יורד לאט
const RIVER_FACTOR = 1.5;              // הנהר רחב פי 1.5 ממה שקפיצה רגילה עוברת
// מילים חדשות
const ROCK = { size: 8, hangY: GROUND - 40, fall: 0.9, warn: 0.75 };   // STOP – סלע נופל כשמגיעים אליו
const STOP_TIME = 1.6;                                               // העולם עוצר לשנייה וחצי
const RUN_BOOST = { mult: 2.2, time: 2.0 };                          // RUN – מהירות כפולה לשתי שניות
const BRIDGE = { factor: 4.0, delay: 0.3, chase: 1.7 };            // שדה אש ארוך: האש מתחילה בכניסה ורודפת – מהירה מהליכה (1), איטית מריצה (2.2)
const LAKE = { factor: 3.0 }, SWIM_TIME = 1.2;                       // SWIM – אגם ארוך. שוחים עד הסוף
const DROWN = { easy: 1.1, other: 0.8 };                              // כמה זמן שוקעים במים לפני שנכשלים – אפשר עוד להציל עם SWIM
const CLIFF = { w: 14, h: 40, range: 2.5, time: 1.3, ladder: 12 };  // CLIMB – צוק גבוה עם סולם נשען. מטפסים כשמגיעים לסולם
const BOULDER = { r: 10, range: 25 };                                // PUSH – סלע עגול גדול, אפשר לדחוף מרחוק
const GATE = { w: 5, rope: 4, lift: 38, time: 1.4, want: 0.9 };     // PULL – עוצרים ליד החבל ומושכים עד שהסורג עולה למעלה
const GUARD = { w: 9, h: 18, walk: 14, gap: 5 }, HIDE_TIME = 1.8;    // HIDE – שני שומרים עם פנסים
GUARD.span = GUARD.w * 2 + GUARD.gap;                                 // רוחב הזוג
const HIDE_ROCK = { w: 34, h: 12, lead: 25 };                          // HIDE – ערימת סלעים: הנינג'ה מתכופף לפניה, השומרים עוברים מאחוריה (רואים אותם מעליה)
const ARROWS = { w: 7, speed: 30 }, BLOCK_TIME = 0.8;                 // BLOCK – מטח חיצים בכל הגבהים
const WINDOW = { w: 10, top: GROUND - 18, bot: GROUND - 5, range: 4 }; // LEAP – קיר עבה עם מעבר צר באמצע הגובה
const LEAP = { y: 6.5, h: 5, w: 12, want: 0.9, free: 0.45, arc: 3, roll: 0.5 };   // אחרי הזינוק – גלגול על הקרקע   // זינוק בקשת קלה דרך טבעת האש
const POND = { factor: 2.2, net: 3, deep: 8 }, DIVE_TIME = 1.2;        // DIVE – רשת שיורדת עמוק לתוך המים, צוללים מתחתיה
let CAVE_STYLE = 'cave';       // מראה המערה: 'cave' = גוש סלע אחד עם קיר פנימי כהה, 'boulders' = סלעים גדולים, 'chunks' = הגושים הישנים
const BRAMBLE = { factor: 1.3, gap: 6.5, want: 1.0, slow: 0.6, ramp: 46, exit: 14, mouth: 34 };   // CRAWL – מערה שהתקרה שלה יורדת בהדרגה עד שחייבים לזחוליה
// ניקוד במסע: ערך בסיס לפי קושי הפעולה, ועוד נקודה כל 3 תחנות. המספר מופיע על המכשול
const WORD_POINTS = { 'pick up': 4, 'let go': 4, ride: 4, fight: 3, hold: 3, jump: 1, down: 1, catch: 1, kick: 2, throw: 2, stop: 2, push: 2, hide: 2,
                      fly: 3, run: 3, swim: 3, climb: 3, pull: 3, block: 3, crawl: 3, fire: 3, leap: 4, dive: 4, want: 4 };
// I WANT: סוחר עם עגלה לפני דלת נעולה. אומרים I WANT ואז את שם החפץ
const ITEMS = { key: { icon: '🔑', say: 'a key' }, rope: { icon: '🪢', say: 'a rope' }, torch: { icon: '🔦', say: 'a torch' } };
const ITEM_WORDS = Object.keys(ITEMS);
const DOOR = { w: 15, h: 30, stopAt: 40, needs: 'key' };
const ICE = { w: 13, h: 42 };                                          // FIRE – קיר קרח עבה. רק כדור אש שובר אותו (בעיטה לא)
const FIREBALL = { speed: 95, cooldown: 0.5 };
const ARROW_HEIGHTS = [GROUND - 3, GROUND - 8, GROUND - 13, GROUND - 18, GROUND - 22];   // גבוה מדי לקפוץ מעליו, נמוך מדי להתכופף

