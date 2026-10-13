/* ninja-voice-game – config.js
   הגדרות: מילים, רמות קושי, שלבים, וגדלים של כל המכשולים
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

/* ============================================================
   הגדרות
   ============================================================ */
const MODEL_URL = 'https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz';

// כל המילים שהמשחק מכיר
const WORDS = ['jump', 'down', 'kick', 'throw', 'catch', 'fly', 'stop', 'run', 'swim', 'climb', 'push', 'pull', 'hide', 'block', 'leap', 'dive', 'crawl'];
const WORD_ICON = { jump: '⬆️', down: '⬇️', kick: '🦶', throw: '✴️', catch: '🟡', fly: '🪁',
                    stop: '✋', run: '💨', swim: '🌊', climb: '🧗', push: '🪨', pull: '⛓️', hide: '🌿', block: '🛡️', leap: '🤸', dive: '🤿', crawl: '🐛' };

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
  { name: 'JUMP',         words: ['jump'],           count: 8,  hint: 'Say JUMP to jump over boxes' },
  { name: 'DOWN',         words: ['down'],           count: 8,  hint: 'Say DOWN to duck under beams' },
  { name: 'JUMP + DOWN',  words: ['jump', 'down'],   count: 10, hint: 'Read the word!' },
  { name: 'KICK',         words: ['kick'],           count: 8,  hint: 'Say KICK to break walls' },
  { name: 'THROW',        words: ['throw'],          count: 8,  hint: 'Say THROW to stop enemies' },
  { name: 'KICK + THROW', words: ['kick', 'throw'],  count: 10, hint: 'Read the word!' },
  { name: 'CATCH',        words: ['catch'],          count: 8,  hint: 'Say CATCH to grab coins' },
  { name: 'JUMP + FLY',   words: ['fly'],            count: 8,  hint: 'Say JUMP, then FLY over the lava' },
  { name: 'CATCH + FLY',  words: ['catch', 'fly'],   count: 10, hint: 'Read the word!' },
  { name: 'STOP',         words: ['stop'],           count: 8,  hint: 'Say STOP before the rock falls' },
  { name: 'RUN',          words: ['run'],            count: 8,  hint: 'Say RUN to cross the bridge' },
  { name: 'STOP + RUN',   words: ['stop', 'run'],    count: 10, hint: 'Read the word!' },
  { name: 'SWIM',         words: ['swim'],           count: 8,  hint: 'Say SWIM to cross the lake' },
  { name: 'CLIMB',        words: ['climb'],          count: 8,  hint: 'Say CLIMB to go up the cliff' },
  { name: 'SWIM + CLIMB', words: ['swim', 'climb'],  count: 10, hint: 'Read the word!' },
  { name: 'PUSH',         words: ['push'],           count: 8,  hint: 'Say PUSH to move the rock' },
  { name: 'PULL',         words: ['pull'],           count: 8,  hint: 'Say PULL to open the gate' },
  { name: 'PUSH + PULL',  words: ['push', 'pull'],   count: 10, hint: 'Read the word!' },
  { name: 'HIDE',         words: ['hide'],           count: 8,  hint: 'Say HIDE when the guards come' },
  { name: 'BLOCK',        words: ['block'],          count: 8,  hint: 'Say BLOCK to stop the arrows' },
  { name: 'HIDE + BLOCK', words: ['hide', 'block'],  count: 10, hint: 'Read the word!' },
  { name: 'LEAP',         words: ['leap'],           count: 8,  hint: 'Say LEAP to fly through the window' },
  { name: 'DIVE',         words: ['dive'],           count: 8,  hint: 'Say DIVE to swim under the net' },
  { name: 'LEAP + DIVE',  words: ['leap', 'dive'],   count: 10, hint: 'Read the word!' },
  { name: 'CRAWL',        words: ['crawl'],          count: 8,  hint: 'Say CRAWL to go under the thorns' }
];
// איזה עולם לכל זוג מילים (0 במבוק, 1 כפר בלילה, 2 שלג, 3 קניון, 4 מקדש)
const PAIR_WORLD = [0, 1, 2, 3, 0, 4, 1, 2, 3];

// איזה מכשול מתאים לכל מילה
const WORD_OBSTACLE = { jump: 'box', down: 'beam', kick: 'wall', throw: 'enemy', catch: 'coin', fly: 'river',
                        stop: 'rock', run: 'bridge', swim: 'lake', climb: 'cliff', push: 'boulder', pull: 'gate', hide: 'guard', block: 'arrows',
                        leap: 'window', dive: 'pond', crawl: 'bramble' };
const HIT_WORD = { box: 'JUMP!', beam: 'DOWN!', wall: 'KICK!', enemy: 'THROW!', river: 'JUMP + FLY!',
                   rock: 'STOP!', bridge: 'RUN!', lake: 'SWIM!', cliff: 'CLIMB!', boulder: 'PUSH!', gate: 'PULL!', guard: 'HIDE!', arrows: 'BLOCK!',
                   window: 'LEAP!', pond: 'DIVE!', coin: 'CATCH!', bramble: 'CRAWL!' };

// "העולם" של המשחק: 160 על 100 יחידות, מוגדל לגודל המסך
const W = 160, H = 100, GROUND = 85;
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
const BRIDGE = { factor: 2.2, collapse: 1.15 };                      // גשר ארוך שמתמוטט אחרי 1.15 שניות – בהליכה לוקח 2.2
const LAKE = { factor: 2.2 }, SWIM_TIME = 1.2;                       // SWIM – אגם ארוך. שוחים עד הסוף
const DROWN = { easy: 1.1, other: 0.8 };                              // כמה זמן שוקעים במים לפני שנכשלים – אפשר עוד להציל עם SWIM
const CLIFF = { w: 14, h: 40, range: 2.5, time: 1.3, ladder: 12 };  // CLIMB – צוק גבוה עם סולם נשען. מטפסים כשמגיעים לסולם
const BOULDER = { r: 10, range: 25 };                                // PUSH – סלע עגול גדול, אפשר לדחוף מרחוק
const GATE = { w: 5, rope: 4, lift: 38, time: 1.4, want: 0.9 };     // PULL – עוצרים ליד החבל ומושכים עד שהסורג עולה למעלה
const GUARD = { w: 9, h: 18, walk: 14, gap: 5 }, HIDE_TIME = 1.8;    // HIDE – שני שומרים עם פנסים
GUARD.span = GUARD.w * 2 + GUARD.gap;                                 // רוחב הזוג
const ARROWS = { w: 7, speed: 30 }, BLOCK_TIME = 0.8;                 // BLOCK – מטח חיצים בכל הגבהים
const WINDOW = { w: 10, top: GROUND - 15, bot: GROUND - 3, range: 4 }; // LEAP – קיר עבה עם מעבר צר באמצע הגובה
const LEAP = { y: 4.5, h: 5, w: 12, want: 0.9, free: 0.45 };           // זינוק אופקי דרך החלון
const POND = { factor: 1.6, net: 3 }, DIVE_TIME = 1.2;                  // DIVE – מים עם רשת עד פני המים, צוללים מתחת
const BRAMBLE = { factor: 1.3, gap: 6.5, want: 1.0, slow: 0.6, ramp: 28, exit: 7, mouth: 30 };   // CRAWL – מערה שהתקרה שלה יורדת בהדרגה עד שחייבים לזחוליה
const ARROW_HEIGHTS = [GROUND - 3, GROUND - 8, GROUND - 13, GROUND - 18, GROUND - 22];   // גבוה מדי לקפוץ מעליו, נמוך מדי להתכופף

