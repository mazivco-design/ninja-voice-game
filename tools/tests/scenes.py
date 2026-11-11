"""בדיקות פרטניות לסצנות – מה קורה כשהשחקן טועה, ומסע של כמה תחנות ברצף. בכל הריצות גם מציירים (draw) ותופסים שגיאות ציור.
  חזיר:    שחקן "פזיז" שאומר SNEAK בלי לחכות – השלב נגמר, עם פגיעות (כוכבים יורדים).
  אופניים: בלי BRAKE – התרסקות על הבול, לב אחד יורד, השלב ממשיך ונגמר.
  דיג:     בלי PULL במאבק – נפילה למים, SWIM, חזרה לסירה, והשלב נגמר.
  מסע:     שלוש תחנות ברצף מכמה נקודות התחלה (כל המילים כבר נלמדו), כולל סצנות מיוחדות בדרך.
הרצה מתיקיית השורש:   python3 tools/tests/scenes.py [stable]      קוד יציאה 0 = הכול עבר."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import open_game
sub = sys.argv[1] + '/' if len(sys.argv) > 1 else ''
DIFFS = ['easy', 'medium', 'hard']
fails = []
def check(name, r, ok, why):
    good = ok and not r['drawErr'] and r['drawn'] > 0
    print('ok  ' if good else 'FAIL', name, '|', (r['title'] if r['state'] != 'play' else 'still playing, station ' + str(r['station'])), '|', r['sec'], 's | hits', r['hits'], '| lives', r['lives'], '|', why if not good else '')
    if r['drawErr']: print('   DRAW ERROR', r['drawErr'])
    if not good: fails.append(name); print('   phases:', ' > '.join(r['phases']))
def has(r, *ps): return all(any(p in x.split() for x in r['phases']) for p in ps)

with open_game(sub) as (pg, errs):
    def run(js, arg):
        pg.fresh()                                   # דף נקי לכל ריצה – ריצה אחת לא משפיעה על הבאה
        return pg.evaluate(js, arg)
    for d in DIFFS:
        # חזיר, שחקן ממהר: SNEAK מיד בכל מחסה, אף פעם לא HIDE. (לפעמים עובר בלי שרואים אותו – לכן כאן לא דורשים פגיעה)
        r = run("""d => { const keep = boarAuto; boarAuto = () => { const S = boarS; if (S && (S.np === 'stand' || S.np === 'hidden') && S.nt > 0.3) command('sneak', 'auto'); }; T.swapAuto(keep, boarAuto);
          return T.run({ stage: STAGES.findIndex(s => s.name === 'WILD BOAR'), diff: d, draw: 4 }); }""", d)
        check('boar in a hurry / ' + d, r, 'done' in r['title'] and has(r, 'boar:walk', 'boar:exit'), 'expected: done, walked and left the forest')

        # חזיר, שחקן פזיז: SNEAK דווקא ברגע הלא נכון (כשחזיר עומד להרים את הראש) → רואים אותו, כוכב יורד, והשלב נגמר
        r = run("""d => { const keep = boarAuto; boarAuto = () => { const S = boarS; if (S && (S.np === 'stand' || S.np === 'hidden') && S.nt > 0.3 && !boarSneakGood()) command('sneak', 'auto'); }; T.swapAuto(keep, boarAuto);
          return T.run({ stage: STAGES.findIndex(s => s.name === 'WILD BOAR'), diff: d, draw: 4 }); }""", d)
        check('boar reckless / ' + d, r, 'done' in r['title'] and r['hits'] > 0 and has(r, 'boar:walk', 'boar:exit'), 'expected: done, seen at least once (hits > 0)')

        # אופניים: כל המילים חוץ מ-BRAKE. שלושה לבבות (באימון אין לבבות) כדי לראות שיורד בדיוק אחד
        r = run("""d => { const keep = bkAuto; bkAuto = () => { const S = bikeS; if (!S) return; const w = (bkExpected() || [])[0]; if (w && w !== 'brake' && S.t > 0.5) command(w, 'auto'); }; T.swapAuto(keep, bkAuto);
          return T.run({ stage: STAGES.findIndex(s => s.name === 'BIKE'), diff: d, draw: 4, tick: n => { if (n === 1) lives = 3; } }); }""", d)
        check('bike no brake / ' + d, r, 'done' in r['title'] and r['hits'] == 1 and r['lives'] == 2 and has(r, 'bike:crash', 'bike:up', 'bike:cheer'), 'expected: done, one hit, one life lost, crash then finish')

        # דיג: PULL בנשיכה, אבל בלי PULL במאבק הראשון → נופלים, שוחים וחוזרים. במאבק הבא מושכים כרגיל
        r = run("""d => { const keep = boatAuto; let fell = false;
          boatAuto = () => { if (!boat) return; if (boat.phase === 'fall') fell = true; if (boat.phase === 'fight' && !fell) return; keep(); }; T.swapAuto(keep, boatAuto);
          return T.run({ stage: STAGES.findIndex(s => s.name === 'FISHING'), diff: d, draw: 4 }); }""", d)
        check('fishing no pull / ' + d, r, 'done' in r['title'] and has(r, 'boat:fight', 'boat:fall', 'boat:swimWait', 'boat:swimBack', 'boat:climbIn'), 'expected: done, fall > swim > back in the boat')

    # מסע: כמה תחנות ברצף משלוש נקודות התחלה. כל המילים נלמדו, כך שהמסע ממשיך בלי לעצור לשיעור.
    # פגיעה בודדת של השחקן האוטומטי אפשרית (ברמה הקשה) – הדרישה: מגיעים לתחנות והמשחק לא נגמר.
    last = pg.evaluate("() => WORDS.length - 1")
    for start, n in [(0, 3), (last // 2, 2), (last - 3, 1)]:
        for d in DIFFS:
            r = run("""([st, n, d]) => T.run({ journey: st, diff: d, draw: 6, maxSec: 900,
                 setup: () => { getLearned = () => WORDS.slice(); isLearned = () => true; },
                 tick: () => jStation >= st + n })""", [start, n, d])
            check(f'journey {start}→{start + n} / {d}', r, r['state'] == 'play' and r['station'] == start + n and (r['lives'] or 0) > 0, 'expected: reached the stations, game not over')
            if start == last - 3 and not r['phases']: fails.append('journey without scenes'); print('   no special scene met on the way')

for e in errs: print('PAGE ERROR', e)
print('FAIL: ' + ', '.join(fails) if fails or errs else 'PASS')
sys.exit(1 if fails or errs else 0)
