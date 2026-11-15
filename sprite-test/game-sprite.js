// ניסוי בלבד: נטען רק כשנכנסים למשחק עם ?sprite=1 בכתובת.
// מחליף את ציור הנינג'ה של השחקן בדמות הריצה מהסרטון (שורת תמונות), בכל מצב – גם בקפיצה ובכריעה היא ממשיכה לרוץ.
(() => {
  const sheet = new Image(); sheet.src = 'sprite-test/ninja-run-sheet.png';
  const S = { fw: 236, fh: 300, n: 20, ground: 296, fps: 24 }, H = 14 * 1.35;      // גובה הדמות ביחידות המשחק (הנינג'ה הרגיל ≈ 14)
  const orig = drawFigure;
  drawFigure = function (F) {
    if (!(F && F.kind === 'ninja' && F.accent === playerColor() && sheet.complete && sheet.naturalWidth)) return orig.apply(this, arguments);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 0, 0); ctx.clip();                  // מריצים את הציור המקורי "באוויר" – בשביל הנתונים שהוא מחזיר – בלי לצייר
    let r; try { r = orig.apply(this, arguments); } finally { ctx.restore(); }
    const i = Math.floor(performance.now() / 1000 * S.fps) % S.n, sc = F.scale || 1, h = H * sc * (S.fh / S.ground), w = h * S.fw / S.fh;
    ctx.save(); ctx.translate(F.fx, F.fy); if (F.facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(sheet, i * S.fw, 0, S.fw, S.fh, -w * 0.56, -h * (S.ground / S.fh) + 0.35, w, h);
    ctx.restore(); return r;
  };
})();
