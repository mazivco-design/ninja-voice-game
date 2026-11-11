/* ninja-voice-game – friend.js
   החבר: נינג'ה אחד שמלווה את השחקן בשלבים המשותפים (בוץ, סירה ודיג, חזיר, זאבים, אופניים). כאן המראה שלו – צבע וגודל – במקום אחד.
   התנועה, התנוחות והדיבור של החבר עדיין בכל סצנה בנפרד. הילד עם העגלה (cart.js) הוא דמות אחרת בכוונה.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

const FRIEND = { scale: 0.92,                  // קצת קטן מהשחקן
                 color: '#2563eb', alt: '#f59e0b' };   // כחול; כתום כשהשחקן עצמו כחול – שלא יתבלבלו ביניהם

function friendAccent() { const c = typeof playerColor === 'function' ? playerColor() : '#dc2626'; return c === FRIEND.color ? FRIEND.alt : FRIEND.color; }

// מצייר את החבר. o: { fx, fy, pose, facing (ברירת מחדל 1), scale (ברירת מחדל FRIEND.scale – רק בכדור הפורח הוא קטן יותר) }
function drawFriend(o) {
  drawFigure({ fx: o.fx, fy: o.fy, facing: o.facing || 1, scale: o.scale || FRIEND.scale, kind: 'ninja', accent: friendAccent(), pose: o.pose, suit: null });
}
