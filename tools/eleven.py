"""ElevenLabs generator – runs inside GitHub Actions (the API key lives only there, as a secret).
Reads audio/eleven/list.json, makes every file that doesn't exist yet, and saves voices.json.
List entries:
  {"file": "help-liam", "type": "tts", "text": "Help!", "voice": "Liam", "model": "eleven_v3", "settings": {...}}
  {"file": "sfx-mud", "type": "sfx", "text": "soft mud splash", "seconds": 1.2}
  {"file": "design-x", "type": "design", "description": "...", "text": "100+ chars", "count": 3}
An item that fails doesn't stop the others – whatever was made is still saved.
"""
import base64, json, os, sys, urllib.request, urllib.error

KEY = os.environ.get('ELEVENLABS_API_KEY', '').strip()
DIR = 'audio/eleven'
API = 'https://api.elevenlabs.io/v1'
cfg = json.load(open(f'{DIR}/list.json', encoding='utf-8'))
items = cfg['items']
BUDGET_CHARS, MAX_SFX = cfg.get('budget_chars', 2000), cfg.get('max_sfx', 10)
MODEL = cfg.get('model', 'eleven_multilingual_v2')

if not KEY: sys.exit('ELEVENLABS_API_KEY secret is missing')


class ApiError(Exception):
    pass


def call(method, path, body=None):
    req = urllib.request.Request(API + path, method=method, headers={'xi-api-key': KEY, 'Content-Type': 'application/json'},
                                 data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        raise ApiError(f'{method} {path} -> HTTP {e.code}: {e.read()[:400]!r}')


def done(it):
    if it['type'] == 'search': return os.path.exists(f"{DIR}/{it['file']}.json")
    if it['type'] == 'design': return os.path.exists(f"{DIR}/{it['file']}-1.mp3")
    return os.path.exists(f"{DIR}/{it['file']}.mp3")


todo = [it for it in items if not done(it)]
chars = sum(len(it['text']) for it in todo if it['type'] in ('tts', 'design'))
sfx = sum(1 for it in todo if it['type'] == 'sfx')
print(f'to make: {len(todo)} items, {chars} text chars, {sfx} sound effects')
if chars > BUDGET_CHARS or sfx > MAX_SFX:
    sys.exit(f'over budget (chars {chars}/{BUDGET_CHARS}, sfx {sfx}/{MAX_SFX}) – nothing made')

voices = json.loads(call('GET', '/voices'))['voices']
slim = [{'name': v['name'], 'id': v['voice_id'], 'category': v.get('category'), 'labels': v.get('labels'), 'description': v.get('description')} for v in voices]
json.dump(slim, open(f'{DIR}/voices.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
by_name = {v['name'].split(' ')[0].split('-')[0].strip().lower(): v['voice_id'] for v in voices}
by_name.update({v['name'].lower(): v['voice_id'] for v in voices})

failed = 0
for it in todo:
    try:
        if it['type'] == 'search':                                       # חיפוש בספרייה הגדולה – שומרים את התוצאות
            from urllib.parse import urlencode
            res = json.loads(call('GET', '/shared-voices?' + urlencode(it['params'])))
            out = [{'name': v.get('name'), 'voice_id': v.get('voice_id'), 'public_owner_id': v.get('public_owner_id'), 'accent': v.get('accent'),
                    'age': v.get('age'), 'gender': v.get('gender'), 'use_case': v.get('use_case'), 'descriptive': v.get('descriptive'),
                    'description': (v.get('description') or '')[:200], 'cloned_by_count': v.get('cloned_by_count'), 'usage': v.get('usage_character_count_1y')}
                   for v in res.get('voices', [])]
            json.dump(out, open(f"{DIR}/{it['file']}.json", 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
            print('made', it['file'], len(out), 'voices'); continue
        if it['type'] == 'tts':
            vid = it.get('voice_id') or by_name.get(it['voice'].lower())
            if it.get('owner') and vid not in {v['voice_id'] for v in voices}:   # קול מהספרייה – מוסיפים אותו לחשבון לפני השימוש
                call('POST', f"/voices/add/{it['owner']}/{vid}", {'new_name': it.get('voice', vid)})
                voices.append({'voice_id': vid}); print('added library voice', it.get('voice'))
            if not vid:
                print(f"!! voice {it['voice']} not found – skipped {it['file']}"); failed += 1; continue
            body = {'text': it['text'], 'model_id': it.get('model', MODEL)}
            if 'settings' in it: body['voice_settings'] = it['settings']
            if 'seed' in it: body['seed'] = it['seed']
            audio = call('POST', f'/text-to-speech/{vid}?output_format=mp3_44100_128', body)
            open(f"{DIR}/{it['file']}.mp3", 'wb').write(audio)
            print('made', it['file'], len(audio), 'bytes')
        elif it['type'] == 'design':                                   # קול חדש לפי תיאור – כל דוגמה נשמרת כקובץ
            body = {'voice_description': it['description'], 'text': it['text'], 'model_id': it.get('model', 'eleven_ttv_v3')}
            res = json.loads(call('POST', '/text-to-voice/design', body))
            meta = []
            for i, pv in enumerate(res.get('previews', [])[:it.get('count', 3)]):
                open(f"{DIR}/{it['file']}-{i + 1}.mp3", 'wb').write(base64.b64decode(pv['audio_base_64']))
                meta.append({'file': f"{it['file']}-{i + 1}", 'generated_voice_id': pv.get('generated_voice_id')})
                print('made', f"{it['file']}-{i + 1}")
            json.dump(meta, open(f"{DIR}/{it['file']}.json", 'w'), indent=1)
        else:
            body = {'text': it['text'], 'prompt_influence': it.get('influence', 0.5)}
            if 'seconds' in it: body['duration_seconds'] = it['seconds']
            audio = call('POST', '/sound-generation?output_format=mp3_44100_128', body)
            open(f"{DIR}/{it['file']}.mp3", 'wb').write(audio)
            print('made', it['file'], len(audio), 'bytes')
    except ApiError as e:
        failed += 1
        print('!!', it['file'], e)

if failed: print(f'!! {failed} item(s) failed')
