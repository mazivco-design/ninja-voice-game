/* ninja-voice-game – art.js
   ציורים וקטוריים (SVG) שמחליפים את הציור המובנה של מכשולים.
   כל "משבצת" = מכשול אחד. בלי SVG – המכשול מצויר בקוד כמו תמיד.
   השמירה: באייפד (localStorage), ואפשר לייצא חבילה ולהכניס אותה לפרויקט (art/pack.json) – אז היא עובדת בכל מכשיר.
   כל קבצי js/ נטענים לפי הסדר ב-ninja-voice-game.html וחולקים את אותם משתנים גלובליים. */

// w/h = גודל ברירת המחדל ביחידות של העולם. dx = הזזה ימינה מתחילת המכשול. dy = כמה מעל הקרקע מתחיל הציור (תחתית)
const ART_SLOTS = [
  { id: 'box',     name: 'Box · JUMP',         w: BOX.w,             h: BOX.h,       dx: 0,  dy: 0 },
  { id: 'beam',    name: 'Beam · DOWN',        w: BEAM.w + 8,        h: BEAM.thick,  dx: -4, dy: BEAM.clear },
  { id: 'wall',    name: 'Wall · KICK',        w: WALL.w,            h: WALL.h,      dx: 0,  dy: 0 },
  { id: 'ice',     name: 'Ice · FIRE',         w: ICE.w,             h: ICE.h,       dx: 0,  dy: 0 },
  { id: 'boulder', name: 'Boulder · PUSH',     w: BOULDER.r * 2,     h: BOULDER.r * 2, dx: 0, dy: 0, spin: true },
  { id: 'window',  name: 'Window wall · LEAP', w: WINDOW.w,          h: 48,          dx: 0,  dy: 0 },
  { id: 'hiderock', name: 'Hide rocks · HIDE', w: HIDE_ROCK.w,       h: HIDE_ROCK.h, dx: 0,  dy: 0 },
  { id: 'bramble', name: 'Cave · CRAWL',       w: 0,                 h: 60,          dx: -4, dy: -2, stretch: true }
];
const ART_SLOT = Object.fromEntries(ART_SLOTS.map(s => [s.id, s]));
const TYPE_WORD = Object.fromEntries(Object.entries(WORD_OBSTACLE).map(([w, t]) => [t, w.toUpperCase()]));

let artBase = {};                                   // החבילה שבפרויקט (art/pack.json)
let artLocal = load('art', {});                     // מה שהועלה באייפד הזה
let artOff = false;                                 // בסטודיו: "השווה לציור הרגיל"
function artFor(id) { return artOff ? null : (artLocal[id] || artBase[id] || null); }
function saveArtLocal() { try { store('art', artLocal); } catch (e) { alert('Not enough space on this iPad for the drawings'); } }
try { fetch('art/pack.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : {}).then(j => { artBase = j || {}; artCache.clear(); }).catch(() => {}); } catch (e) {}

// מידות ה-SVG לפי viewBox (או width/height)
function svgSize(svg) {
  const vb = svg.match(/viewBox\s*=\s*["']\s*([-\d.e]+)[\s,]+([-\d.e]+)[\s,]+([-\d.e]+)[\s,]+([-\d.e]+)/i);
  if (vb) return { w: +vb[3], h: +vb[4] };
  const w = svg.match(/<svg[^>]*\swidth\s*=\s*["']([\d.]+)/i), h = svg.match(/<svg[^>]*\sheight\s*=\s*["']([\d.]+)/i);
  return { w: w ? +w[1] : 100, h: h ? +h[1] : 100 };
}

// מציירים את ה-SVG פעם אחת לתמונה בגודל הפיקסלים שצריך – חד, ומהיר בכל פריים
const artCache = new Map();
function artBitmap(a, pw, ph) {
  pw = Math.max(1, Math.round(pw)); ph = Math.max(1, Math.round(ph));
  const key = a.svg.length + ':' + a.svg.slice(-40) + ':' + pw + 'x' + ph + (a.flip ? 'f' : '');
  let c = artCache.get(key);
  if (c) return c.ready ? c.canvas : null;
  c = { ready: false, canvas: document.createElement('canvas') };
  artCache.set(key, c);
  if (artCache.size > 40) artCache.delete(artCache.keys().next().value);
  const sz = svgSize(a.svg);
  let svg = a.svg.replace(/<svg([^>]*)>/i, (m, attrs) => {
    attrs = attrs.replace(/\s(width|height)\s*=\s*["'][^"']*["']/gi, '');
    if (!/viewBox/i.test(attrs)) attrs += ' viewBox="0 0 ' + sz.w + ' ' + sz.h + '"';
    if (!/xmlns=/i.test(attrs)) attrs += ' xmlns="http://www.w3.org/2000/svg"';
    return '<svg' + attrs + ' width="' + pw + '" height="' + ph + '" preserveAspectRatio="none">';
  });
  const img = new Image();
  img.onload = () => {
    c.canvas.width = pw; c.canvas.height = ph;
    const g = c.canvas.getContext('2d');
    if (a.flip) { g.translate(pw, 0); g.scale(-1, 1); }
    g.drawImage(img, 0, 0, pw, ph); c.ready = true;
  };
  img.onerror = () => { c.bad = true; };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  return null;
}

// המלבן שבו הציור נמצא, ביחידות של העולם
function artRect(o, a) {
  const s = ART_SLOT[o.type];
  const w = s.stretch ? o.w + (a.extra || 0) : a.w, h = a.h;
  const l = o.x + a.dx, b = GROUND - a.dy;
  return { l, t: b - h, w, h };
}

// מצייר מכשול מ-SVG. מחזיר true אם צויר (ואז לא מציירים את הציור הרגיל)
function artDraw(o) {
  if (!ART_SLOT[o.type]) return false;
  const a = artFor(o.type); if (!a) return false;
  if ((o.type === 'wall' || o.type === 'ice') && o.broken) return true;
  const R = artRect(o, a), m = ctx.getTransform(), px = Math.hypot(m.a, m.b);
  const bmp = artBitmap(a, R.w * px, R.h * px);
  if (!bmp) return false;                                   // עוד נטען – בינתיים הציור הרגיל
  if (ART_SLOT[o.type].spin && o.rot) {
    ctx.save(); ctx.translate(R.l + R.w / 2, R.t + R.h / 2); ctx.rotate(o.rot); ctx.drawImage(bmp, -R.w / 2, -R.h / 2, R.w, R.h); ctx.restore();
  } else ctx.drawImage(bmp, R.l, R.t, R.w, R.h);
  if (!o.passed && TYPE_WORD[o.type]) label(TYPE_WORD[o.type], o.type === 'bramble' ? o.x + 14 : R.l + R.w / 2, R.t - 6, 4, '#fde047', '#1e293b');
  return true;
}
