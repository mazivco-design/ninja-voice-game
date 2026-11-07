/* ============================================================
   village/2d/chars.js – דמויות מצוירות בקוד (אין דמויות בחבילות של Kenney):
   נינג'ה וכלב בפיקסל־ארט 16×16, בארבעה כיוונים ושני צעדים.
   משותף לשתי הדוגמאות (מבט מלמעלה ואיזומטרי).
   ============================================================ */

// כל ציור הוא רשימת שורות; כל תו הוא צבע לפי המקרא. '.' = שקוף.
const PAL = {
  k: '#1e293b', K: '#0f172a', s: '#fcd9b6', e: '#000000', r: '#dc2626', R: '#991b1b',
  o: '#d9822b', O: '#a35d17', w: '#f5ecdc', n: '#111111'
};
const NINJA = {
  down: [
    '................',
    '.....kkkkkk.....',
    '....kkkkkkkk....',
    '....rrrrrrrr....',
    '....kssssssk....',
    '....kseksesk....',
    '....kkkkkkkk....',
    '.....kkkkkk.....',
    '...rkkkkkkkkr...',
    '...kkkkkkkkkk...',
    '...kkrrrrrrkk...',
    '....kkkkkkkk....',
    '....kkk..kkk....',
    '....kkk..kkk....',
    '....KKK..KKK....',
    '................'],
  up: [
    '................',
    '.....kkkkkk.....',
    '....kkkkkkkk....',
    '....rrrrrrrr....',
    '....kkkrrkkk....',
    '....kkkrrkkk....',
    '....kkrkkrkk....',
    '.....kkkkkk.....',
    '...rkkkkkkkkr...',
    '...kkkkkkkkkk...',
    '...kkrrrrrrkk...',
    '....kkkkkkkk....',
    '....kkk..kkk....',
    '....kkk..kkk....',
    '....KKK..KKK....',
    '................'],
  side: [
    '................',
    '.....kkkkkk.....',
    '....kkkkkkkk....',
    '..rrrrrrrrrr....',
    '.r..kkkssssk....',
    '....kkksseek....',
    '....kkkkkkkk....',
    '.....kkkkkk.....',
    '.....kkkkkkr....',
    '.....kkkkkk.....',
    '.....rrrrrr.....',
    '.....kkkkkk.....',
    '.....kk.kkk.....',
    '.....kk.kkk.....',
    '.....KK.KKK.....',
    '................']
};
const DOG = {
  side: [
    '................',
    '................',
    '................',
    '................',
    '..........o.o...',
    '..........oooo..',
    '...o......oeoww.',
    '...oo.....ooown.',
    '....oooooooooo..',
    '....ooooooooo...',
    '....owwwwwwoo...',
    '....oo.oo.oo....',
    '....oo.oo.oo....',
    '....OO.OO.OO....',
    '................',
    '................']
};

// מייצר טקסטורה מציור; walkFrame=1 מזיז רגל אחת למעלה (צעד)
function pixTexture(scene, key, rows, step, scale) {
  scale = scale || 1;
  const c = document.createElement('canvas'); c.width = 16 * scale; c.height = 16 * scale;
  const g = c.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < 16; x++) {
      const ch = row[x]; if (ch === '.') continue;
      let yy = y;
      // צעד: הרגל השמאלית/הקדמית עולה פיקסל אחד בשורות הרגליים
      if (step && y >= 12 && x < 8) yy = y - 1;
      g.fillStyle = PAL[ch]; g.fillRect(x * scale, yy * scale, scale, scale);
    }
  });
  scene.textures.addCanvas(key, c);
}
function makeCharTextures(scene, scale) {
  ['down', 'up', 'side'].forEach(d => { pixTexture(scene, 'ninja_' + d + '0', NINJA[d], false, scale); pixTexture(scene, 'ninja_' + d + '1', NINJA[d], true, scale); });
  pixTexture(scene, 'dog0', DOG.side, false, scale); pixTexture(scene, 'dog1', DOG.side, true, scale);
}
// מחליף תמונה לפי כיוון ושלב צעד
function setCharFrame(sprite, dir, moving, t) {
  const step = moving ? (Math.floor(t / 140) % 2) : 0;
  const d = dir === 'left' || dir === 'right' ? 'side' : dir;
  sprite.setTexture('ninja_' + d + step);
  sprite.setFlipX(dir === 'left');
}
