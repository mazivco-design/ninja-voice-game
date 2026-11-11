"""כלי עזר משותף לבדיקות: פותח את המשחק בלי רשת ומתקין בדף את T – ריצה דטרמיניסטית של שלב / מסע.
דטרמיניסטי = אותה ריצה נותנת תמיד אותה תוצאה: Math.random מוחלף במחולל עם זרע קבוע, והשעון (performance.now / Date.now)
מוחלף בשעון וירטואלי שמתקדם רק ב-update. בזמן draw() האקראיות עוברת לזרם נפרד, כדי שציור לא ישפיע על מהלך המשחק.
משתמשים:   from common import open_game   →   with open_game(sub) as (pg, errs): pg.evaluate("() => T.run({...})")"""
import os, contextlib
from playwright.sync_api import sync_playwright

HELPER = r"""() => {
  window.speak = () => {}; model = {};
  isTester = () => true; testerMode = 'auto';
  const rng = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let vt = 0, gameRnd = rng(1), drawRnd = rng(2);
  Math.random = () => gameRnd();
  performance.now = () => vt * 1000;
  Date.now = () => 1700000000000 + Math.round(vt * 1000);
  // מצב הסצנה הפעילה כמחרוזת קצרה, למשל "bike:down" – מזה נבנה רצף הפאזות
  const scenes = { lift: () => lift, mud: () => mud, boat: () => boat, cart: () => cart, jet: () => jetS, wolves: () => wolfS, bike: () => bikeS,
                   boar: () => boarS, ride: () => ride, rope: () => rope, duel: () => duel, gust: () => gust, merchant: () => merchant, tunnel: () => tunnelWait };
  const phaseNow = () => { let s = ''; for (const k in scenes) { const v = scenes[k](); if (v) s += k + ':' + (v.phase ?? v.p ?? v.np ?? 'on') + ' '; } return s.trim(); };
  const mix = (h, x) => { h = Math.imul(h ^ (Math.round(x * 100) | 0), 16777619); return h >>> 0; };
  window.T = {
    phaseNow,
    // opts: { stage | journey, diff, seed, draw: כל כמה פריימים לצייר (0 = בלי), maxSec, setup(), tick(n) → true כדי לעצור }
    run(opts) {
      const o = Object.assign({ diff: 'easy', seed: 1, draw: 0, maxSec: 400 }, opts);
      vt = 0; gameRnd = rng(o.seed); drawRnd = rng(o.seed + 1000);
      diffKey = o.diff;
      if (o.setup) o.setup();
      if (o.journey !== undefined) startGame('journey', o.journey);
      else { startGame('stage', o.stage); try { finishIntro(); } catch (e) {} }
      const phases = []; let last = '', n = 0, h = 2166136261, minLives = lives, drawErr = null, drawn = 0;
      while (state === 'play' && n < 60 * o.maxSec) {
        update(1 / 60); vt += 1 / 60; n++;
        const p = phaseNow(); if (p !== last) { if (p) phases.push(p); last = p; }
        if (lives < minLives) minLives = lives;
        if (n % 10 === 0) { h = mix(h, py); h = mix(h, score); h = mix(h, obstacles.length); if (obstacles[0]) h = mix(h, obstacles[0].x); }
        if (o.draw && n % o.draw === 0) { const g = Math.random; Math.random = () => drawRnd(); try { draw(); drawn++; } catch (e) { drawErr = drawErr || String(e.stack || e).slice(0, 300); } Math.random = g; }
        if (o.tick && o.tick(n)) break;
      }
      const title = document.getElementById('overTitle')?.textContent || '';
      return { state, title, sec: +(n / 60).toFixed(2), frames: n, hits, lives: isFinite(lives) ? lives : null, minLives: isFinite(minLives) ? minLives : null,
               score, picked, station: typeof jStation === 'number' ? jStation : null, phases, hash: h, drawn, drawErr };
    }
  };
}"""

@contextlib.contextmanager
def open_game(sub=''):
    """sub: '' לגרסת הפיתוח, 'stable/' לגרסת הילדים. מחזיר (page, errs) – errs מתמלא בשגיאות JS מהדף."""
    url = 'file://' + os.path.abspath(sub + 'ninja-voice-game.html')
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1180, 'height': 820})
        pg.route('**/*', lambda r: r.abort() if r.request.url.startswith('http') else r.continue_())   # בלי רשת: Vosk והסנכרון לא נטענים
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(url); pg.wait_for_timeout(800)
        pg.evaluate(HELPER)
        pg.fresh = lambda: fresh(pg, url)
        try: yield pg, errs
        finally: b.close()

def fresh(pg, url):
    """דף נקי: מוחק את מה שנשמר (localStorage) וטוען מחדש, כדי שריצה אחת לא תשפיע על הבאה."""
    pg.evaluate("() => localStorage.clear()")
    pg.goto(url); pg.wait_for_function("() => typeof startGame === 'function' && typeof draw === 'function'"); pg.wait_for_timeout(150)
    pg.evaluate(HELPER)
