/* ninja-voice-game – tester.js
   מצב בודק (שחקן בשם tester): מעבר מכשולים בלי לדבר.
   🎤 Voice – כמו תמיד · 🤖 Auto – המשחק מפעיל את המילה הנכונה בזמן הנכון · 👆 Tap – כפתור גדול שמפעיל את המילה של המכשול הקרוב.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

let testerMode = 'voice';                      // voice | auto | tap
const TESTER_MODES = [['voice', '🎤 Voice'], ['auto', '🤖 Auto'], ['tap', '👆 Tap']];
const autoSt = { flyAt: null, t: 0 };

function renderTester() {
  const t = isTester();
  $('testerBtn').classList.toggle('hide', !t);
  $('testerBtn').textContent = TESTER_MODES.find(m => m[0] === testerMode)[1];
  $('tapBtn').classList.toggle('hide', !(t && testerMode === 'tap' && (state === 'play' || state === 'paused')));
}
$('testerBtn').onclick = () => { const i = TESTER_MODES.findIndex(m => m[0] === testerMode); testerMode = TESTER_MODES[(i + 1) % TESTER_MODES.length][0]; renderTester(); };
$('tapBtn').addEventListener('pointerdown', e => { e.preventDefault(); testerTap(); });

// 👆 – המילה של המכשול הקרוב ביותר (או של הסוחר)
function testerTap() {
  if (state !== 'play') return;
  if (merchant && merchant.phase === 'ask') return command('want', 'tap');
  if (merchant && merchant.phase === 'choose') return command(DOOR.needs, 'tap');
  if (ride && ride.phase === 'wait') return command('ride', 'tap');
  if (rope && rope.phase === 'wait') return command('catch', 'tap');
  if (rope && rope.phase === 'hang') return command('let go', 'tap');
  const pb = playerBox();
  const o = obstacles.filter(o => !o.passed && !o.hit && !o.caught && o.x + (o.w || 0) >= pb.l).sort((a, b) => a.x - b.x)[0];
  if (!o) return command('jump', 'tap');
  if (o.type === 'river') return command(py > 0 && flyT <= 0 ? 'fly' : 'jump', 'tap');   // לחיצה ראשונה קופצת, שנייה עפה
  if (o.type === 'skyrock') return command(o.lane ? 'down' : 'up', 'tap');
  const w = (OBSTACLE_WORDS[o.type] || ['jump'])[0];
  command(w, 'tap');
}

// 🤖 – אותו שחקן אוטומטי כמו בבדיקות: לכל מכשול יש מרחק שבו מפעילים את המילה שלו
function testerAuto(pb, dt) {
  if (!obstacles.length) { autoSt.flyAt = null; }
  autoSt.t += dt;
  const t = autoSt.t;
  for (const o of obstacles) {
    if (o.passed || o.hit || o._a) continue;
    const dd = o.x - pb.r;
    const fire = {
      box: dd <= speed * 0.2, beam: dd <= speed * 0.3, wall: dd <= KICK.range + speed * 0.2, enemy: dd <= 70, coin: o.x <= PLAYER.x + 25,
      river: dd <= speed * 0.05, rock: dd <= speed * 1.6 && dd > 0, bridge: dd <= speed * 0.35, lake: dd <= speed * 0.4,
      cliff: dd <= CLIFF.ladder + CLIFF.range + speed * 0.3, boulder: dd <= BOULDER.range + speed * 0.2, gate: dd <= GATE.rope + speed * 0.5,
      window: dd <= WINDOW.range + speed * 0.5, tramp: dd <= speed * 0.5, bramble: dd <= speed * 0.3, ice: dd <= 55,
      pond: (netX(o) - pb.r) <= speed * 0.4, guard: dd <= (speed + GUARD.walk) * 0.9, arrows: dd <= (curSpeed() + ARROWS.speed) * 0.35,
      skyrock: dd <= speed * 0.7, storm: dd <= 55
    }[o.type];
    if (!fire) continue;
    o._a = 1;
    if (o.type === 'river') { command('jump', 'auto'); autoSt.flyAt = t + 0.35; }
    else if (o.type === 'skyrock') command(o.lane ? 'down' : 'up', 'auto');
    else if (o.type !== 'door' && o.type !== 'chasm' && o.type !== 'dragon') command((OBSTACLE_WORDS[o.type] || ['jump'])[0], 'auto');
  }
  if (ride && ride.phase === 'wait') command('ride', 'auto');
  if (rope && rope.phase === 'wait') command('catch', 'auto'); else if (rope && rope.phase === 'hang' && rope.theta >= ROPE.amp * ROPE.farAt) command('let go', 'auto');
  if (merchant && merchant.t > 1) { if (merchant.phase === 'ask') command('want', 'auto'); else if (merchant.phase === 'choose') command(DOOR.needs, 'auto'); }
  if (autoSt.flyAt !== null && t >= autoSt.flyAt) { command('fly', 'auto'); autoSt.flyAt = null; }
}
