"""כל השלבים × שלוש רמות, עם השחקן האוטומטי של מצב בודק. הצלחה = כל שלב נגמר ('done!') בלי פגיעות.
הרצה מתיקיית השורש:   python3 tools/tests/all-stages.py            (גרסת הפיתוח)
                        python3 tools/tests/all-stages.py stable     (גרסת הילדים)
דורש playwright. לוקח כמה דקות. קוד יציאה 0 = הכול עבר."""
import sys, os
from playwright.sync_api import sync_playwright
sub = sys.argv[1] + '/' if len(sys.argv) > 1 else ''
url = 'file://' + os.path.abspath(sub + 'ninja-voice-game.html')
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1180, 'height': 820})
    pg.route('**/*', lambda r: r.abort() if r.request.url.startswith('http') else r.continue_())   # בלי רשת: Vosk והסנכרון לא נטענים
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url); pg.wait_for_timeout(800)
    res = pg.evaluate("""() => {
      window.speak = () => {}; model = {};
      isTester = () => true; testerMode = 'auto';
      const out = [];
      for (const d of ['easy','medium','hard']) {
        STAGES.forEach((s, i) => {
          if (s.words[0] === 'want') return;   // I WANT צריך בחירה של חפץ – נבדק ביד
          diffKey = d; startGame('stage', i); try { finishIntro(); } catch(e) {}
          let n = 0; while (state === 'play' && n < 60*400) { update(1/60); n++; }
          out.push([d, s.name, document.getElementById('overTitle')?.textContent || state, hits, (n/60).toFixed(0)]);
        });
      }
      return out;
    }""")
    b.close()
bad = [r for r in res if 'done' not in str(r[2]) or r[3] != 0]
for r in bad: print('FAIL', r)
for e in errs: print('PAGE ERROR', e)
print(f'{len(res) - len(bad)}/{len(res)} passed')
sys.exit(1 if bad or errs else 0)
