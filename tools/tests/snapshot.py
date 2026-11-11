"""צילום מצב ("טביעת אצבע") של כל שלב – ההוכחה שארגון מחדש של הקוד לא שינה התנהגות.
מריץ כל שלב בכל רמה עם השחקן האוטומטי, בריצה דטרמיניסטית (ראו common.py), ושומר לכל אחד חתימה:
משך, פגיעות, ניקוד, רצף הפאזות של הסצנות, וסיכום (hash) של מהלך הריצה. I WANT לא נכלל (כמו ב-all-stages.py).
  python3 tools/tests/snapshot.py            משווה לחתימות השמורות (tools/tests/snapshot.json). קוד יציאה 0 = זהה.
  python3 tools/tests/snapshot.py --update   שומר חתימות חדשות. רק כשהתנהגות השתנתה בכוונה (שלב חדש, תיקון באג) – ולציין ב-commit.
הקובץ השמור שייך לגרסת הפיתוח; אין מה להשוות מול stable/."""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import open_game
FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'snapshot.json')
update = '--update' in sys.argv
now = {}
with open_game() as (pg, errs):
    stages = pg.evaluate("() => STAGES.map((s, i) => [i, s.name, s.words[0]])")
    for d in ['easy', 'medium', 'hard']:
        for i, name, w0 in stages:
            if w0 == 'want': continue
            pg.fresh()
            r = pg.evaluate("([i, d]) => T.run({ stage: i, diff: d })", [i, d])
            now[f'{d} / {name}'] = { 'end': r['title'], 'sec': r['sec'], 'hits': r['hits'], 'score': r['score'], 'hash': r['hash'], 'phases': ' > '.join(r['phases']) }
for e in errs: print('PAGE ERROR', e)
if update:
    json.dump(now, open(FILE, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    print(f'saved {len(now)} signatures'); sys.exit(1 if errs else 0)
old = json.load(open(FILE, encoding='utf8'))
bad = [k for k in sorted(set(old) | set(now)) if old.get(k) != now.get(k)]
for k in bad:
    print('CHANGED', k)
    a, b = old.get(k) or {}, now.get(k) or {}
    for f in sorted(set(a) | set(b)):
        if a.get(f) != b.get(f): print('   ', f, ':', str(a.get(f))[:200], '→', str(b.get(f))[:200])
print(f'{len(now) - len([k for k in bad if k in now])}/{len(now)} identical' + ('' if not bad else '  – FAIL'))
sys.exit(1 if bad or errs else 0)
