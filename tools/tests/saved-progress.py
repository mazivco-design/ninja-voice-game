"""בודק ששחקן קיים לא מאבד התקדמות: יוצרים שחקן עם תחנה ומטבעות, פותחים את גרסת הפיתוח ואת גרסת הילדים,
ומוודאים שכל מה שנשמר באייפד (localStorage, מפתחות ninjaVoice_*) נשאר בדיוק אותו דבר ושהשחקן מופיע במסך.
הרצה מתיקיית השורש:   python3 tools/tests/saved-progress.py      קוד יציאה 0 = עבר."""
import sys, json, threading, http.server, functools
from playwright.sync_api import sync_playwright
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
H = functools.partial(Quiet, directory='.')
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
B = f'http://127.0.0.1:{srv.server_port}/'
SNAP = "() => JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith('ninjaVoice_'))))"
ok = True
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    pg.route('**/*', lambda r: r.continue_() if '127.0.0.1' in r.request.url else r.abort())
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(B + 'ninja-voice-game.html'); pg.wait_for_timeout(800)
    pg.evaluate("""() => { localStorage.setItem('ninjaVoice_players', JSON.stringify([{ id: 'k1', name: 'Kid', color: '#e11' }]));
      localStorage.setItem('ninjaVoice_pk1_station', '17'); localStorage.setItem('ninjaVoice_pk1_coins', '345'); }""")
    before = json.loads(pg.evaluate(SNAP))
    for page in ['ninja-voice-game.html', 'stable/ninja-voice-game.html']:
        pg.goto(B + page); pg.wait_for_timeout(1500)
        after = json.loads(pg.evaluate(SNAP))
        changed = [k for k in set(before) | set(after) if before.get(k) != after.get(k)]
        shown = pg.evaluate("() => document.body.innerText.includes('Kid') && document.body.innerText.includes('345')")
        print(page, '| changed keys:', changed, '| player shown:', shown)
        if changed or not shown: ok = False
    b.close()
for e in errs: print('PAGE ERROR', e)
print('PASS' if ok and not errs else 'FAIL')
sys.exit(0 if ok and not errs else 1)
