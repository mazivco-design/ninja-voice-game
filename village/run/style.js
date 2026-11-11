/* ============================================================
   village/run/style.js – "שכבת צביעה": אותו עולם תלת־ממדי, מראה מצויר.

   איך זה עובד (בכל פריים):
     1. מציירים את הסצנה לתמונה, עם חומרי "טוּן" (אור וצל במדרגות, לא מעבר רך).
     2. מציירים אותה שוב כמפת כיוונים (normals) + עומק – מזה מוצאים את קווי המתאר.
     3. שיידר אחד מחבר: צבע + קווים + נייר, לפי הסגנון.

   סגנונות:  toon  – מצויר עם קווי מתאר
             ink   – דיו יפני על נייר
             water – צבעי מים
             paper – משולב: נייר + צבעי מים בשכבות של דיו + קו דיו דק ועדין   (הבחירה של זיו: דיו + צבעי מים, קו עדין)
             wash  – כמו paper אבל כמעט בלי קו; הקו מופיע רק סביב חפצים "מודגשים" (focus): הנינג'ה והמכשולים
   שימוש: const st = makeStyle(renderer, scene, camera, 'ink'); st.toonify(object3d); st.focus(object3d); בלולאה: st.render();
   ============================================================ */
import * as THREE from 'three';

export const STYLES = { toon: 0, ink: 1, water: 2, paper: 3, wash: 4 };

export function makeStyle(renderer, scene, camera, name) {
  const mode = STYLES[name];
  // מדרגות אור: 3 גוונים
  const steps = new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
  const grad = new THREE.DataTexture(steps, 3, 1, THREE.RGBAFormat); grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;

  function toonify(root) {
    const cache = new Map();
    root.traverse(o => {
      if (!o.isMesh) return; const m = o.material;
      if (!cache.has(m)) cache.set(m, new THREE.MeshToonMaterial({ color: m.color, map: m.map || null, vertexColors: m.vertexColors, gradientMap: grad }));
      o.material = cache.get(m);
    });
  }

  const size = new THREE.Vector2();
  const rtColor = new THREE.WebGLRenderTarget(4, 4, { samples: 4 });
  const rtNorm = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  rtNorm.depthTexture = new THREE.DepthTexture(4, 4); rtNorm.depthTexture.type = THREE.UnsignedIntType;
  const normalMat = new THREE.MeshNormalMaterial();
  // מסכה של החפצים המודגשים (שכבה 1): מציירים רק אותם בלבן, ברזולוציה חצויה
  const rtMask = new THREE.WebGLRenderTarget(4, 4); const maskMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  function focus(root) { root.traverse(o => o.layers.enable(1)); }

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { tColor: { value: rtColor.texture }, tNormal: { value: rtNorm.texture }, tDepth: { value: rtNorm.depthTexture }, tMask: { value: rtMask.texture },
                res: { value: new THREE.Vector2() }, near: { value: camera.near }, far: { value: camera.far }, mode: { value: mode } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: /* glsl */`
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D tColor, tNormal, tDepth, tMask; uniform vec2 res; uniform float near, far; uniform int mode;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
      float lin(vec2 uv){ float z = texture2D(tDepth, uv).x * 2.0 - 1.0; return 2.0 * near * far / (far + near - z * (far - near)); }
      vec3 nrm(vec2 uv){ return texture2D(tNormal, uv).xyz * 2.0 - 1.0; }
      vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }

      // קו מתאר: איפה שהכיוון או העומק משתנים בחדות
      float edgeAt(vec2 uv, float th){
        vec2 px = th / res;
        vec3 n = nrm(uv); float d = lin(uv);
        vec3 nl = nrm(uv - vec2(px.x, 0)), nr = nrm(uv + vec2(px.x, 0)), nu = nrm(uv + vec2(0, px.y)), nd = nrm(uv - vec2(0, px.y));
        float en = (4.0 - dot(n, nl) - dot(n, nr) - dot(n, nu) - dot(n, nd));
        float dl = lin(uv - vec2(px.x, 0)), dr = lin(uv + vec2(px.x, 0)), du = lin(uv + vec2(0, px.y)), dd = lin(uv - vec2(0, px.y));
        float ed = (abs(dl + dr - 2.0 * d) + abs(du + dd - 2.0 * d)) / d;        // "קפיצה" בעומק (לא שיפוע רגיל)
        float fade = 1.0 - smoothstep(60.0, 130.0, d);                           // רחוק מאוד – בלי קווים
        return clamp(max(smoothstep(0.35, 0.9, en), smoothstep(0.03, 0.09, ed)), 0.0, 1.0) * fade;
      }

      void main(){
        vec2 p = vUv * res;                                                      // פיקסלים – כדי שהמרקם לא יימתח
        float grain = fbm(p / 2.5), cloud = fbm(p / 170.0), cloud2 = fbm(p / 60.0 + 9.0);
        vec3 col; float e;

        if (mode == 0) {                                   // ----- מצויר -----
          col = toSRGB(texture2D(tColor, vUv).rgb);
          float l = dot(col, vec3(0.299, 0.587, 0.114)); col = mix(vec3(l), col, 1.18);        // קצת יותר צבע
          e = edgeAt(vUv, 1.6);
          col = mix(col, vec3(0.09, 0.08, 0.12), e * 0.92);
        } else if (mode == 1) {                            // ----- דיו יפני -----
          vec2 wob = (vec2(fbm(p / 40.0), fbm(p / 40.0 + 5.0)) - 0.5) * 3.0 / res;             // יד רועדת מעט
          col = toSRGB(texture2D(tColor, vUv + wob).rgb);
          float l = dot(col, vec3(0.299, 0.587, 0.114));
          float sat = max(col.r, max(col.g, col.b)) - min(col.r, min(col.g, col.b));
          float red = smoothstep(0.15, 0.4, col.r - max(col.g, col.b));                        // אדום (שער הטורי) נשאר כתם צבע
          vec3 paper = vec3(0.955, 0.925, 0.85) * (0.94 + 0.09 * grain) * (0.97 + 0.05 * cloud);
          float v = mix(0.30, 1.0, smoothstep(0.05, 0.72, l));                                 // גווני אפור של דיו מדולל
          v = floor(v * 5.0 + 0.5 + (cloud2 - 0.5) * 0.9) / 5.0;                               // שכבות־שכבות, עם שוליים לא אחידים
          vec3 wash = mix(vec3(v), col * 1.25, 0.22 + 0.6 * red + 0.15 * sat);
          col = paper * mix(wash, vec3(1.0), 0.12 * cloud);
          float th = 1.2 + 2.6 * fbm(p / 120.0 + 3.0);                                         // קו מכחול: עבה ודק
          e = edgeAt(vUv + wob, th) * (0.75 + 0.35 * fbm(p / 9.0));
          col = mix(col, vec3(0.07, 0.06, 0.07), clamp(e, 0.0, 1.0) * 0.95);
        } else if (mode >= 3) {                            // ----- משולב: צבעי מים + שכבות דיו + קו דק -----
          float k = res.y / 900.0;                                                             // אותו עובי קו בכל גודל מסך
          vec2 wob = (vec2(fbm(p / 55.0), fbm(p / 55.0 + 5.0)) - 0.5) * 6.0 * k / res;
          vec3 s = vec3(0.0);
          for (int i = 0; i < 6; i++){ float a = float(i) * 1.047; s += texture2D(tColor, vUv + wob + vec2(cos(a), sin(a)) * 2.0 * k / res).rgb; }
          col = toSRGB(s / 6.0);
          // מסכת ההדגשה, מורחבת מעט כדי לכלול גם את הקו שמסביב לצללית
          float m = 0.0; for (int i = 0; i < 8; i++){ float a = float(i) * 0.785; m = max(m, texture2D(tMask, vUv + vec2(cos(a), sin(a)) * 3.0 * k / res).r); }
          float m0 = texture2D(tMask, vUv).r; m = max(m, m0);                                  // m0 – בדיוק על החפץ; m – כולל שוליים לקו
          float l = dot(col, vec3(0.299, 0.587, 0.114));
          float red = smoothstep(0.12, 0.35, col.r - max(col.g, col.b));                       // אדום/ורוד נשארים חזקים
          col = mix(vec3(l), col, clamp(0.84 + 0.3 * red + 0.2 * m0, 0.0, 1.15));               // צבעים עמומים, חוץ ממה שחשוב
          float lb = floor(l * 6.0 + 0.5 + (cloud2 - 0.5) * 0.9) / 6.0;                        // שכבות־שכבות עם שוליים לא אחידים
          float dS = lin(vUv);
          col *= mix(1.0, (lb + 0.05) / (l + 0.05), 0.34 * (1.0 - smoothstep(70.0, 130.0, dS)));   // עדין; בשמיים ובעננים – בלי שכבות
          col = mix(col, col * vec3(0.90, 0.95, 1.12), (1.0 - smoothstep(0.15, 0.6, l)) * 0.5);   // גוונים כהים נוטים לכחול – אור חם מול צל קריר
          col = mix(col, vec3(1.0), 0.10);                                                     // רך, אבל לא אפרורי
          col *= 0.93 + 0.14 * cloud2;                                                         // פיגמנט לא אחיד
          col = mix(col, vec3(1.0), smoothstep(0.62, 0.8, cloud) * 0.13);                      // כתמי נייר חשוף
          float d = dS;
          float th = (0.85 + 0.75 * fbm(p / (110.0 * k) + 3.0)) * k;                           // קו דק שמתעבה רק מעט
          e = edgeAt(vUv + wob, th);
          e *= 0.55 + 0.45 * smoothstep(0.30, 0.55, fbm(p / (16.0 * k)));                      // נקטע פה ושם, כמו ביד
          e *= 1.0 - 0.75 * smoothstep(16.0, 55.0, d);                                         // על חפצים רחוקים כמעט נעלם
          if (mode == 4) e *= mix(0.10, 1.0, m);                                               // כמעט בלי קו – חוץ מהמודגשים
          col = mix(col, vec3(0.27, 0.22, 0.20), clamp(e, 0.0, 1.0) * 0.72);                   // אפור־חום, לא שחור
          vec3 paper = vec3(1.0, 0.975, 0.925) * (0.93 + 0.10 * grain) * (0.975 + 0.04 * cloud);
          col *= paper;
        } else {                                           // ----- צבעי מים -----
          vec2 wob = (vec2(fbm(p / 55.0), fbm(p / 55.0 + 5.0)) - 0.5) * 7.0 / res;             // הצבע "נמרח" מעט
          vec3 s = vec3(0.0);
          for (int i = 0; i < 6; i++){ float a = float(i) * 1.047; s += texture2D(tColor, vUv + wob + vec2(cos(a), sin(a)) * 2.2 / res).rgb; }
          col = toSRGB(s / 6.0);
          float l = dot(col, vec3(0.299, 0.587, 0.114));
          col = mix(vec3(l), col, 0.95); col = mix(col, vec3(1.0), 0.20);                      // בהיר ורך
          col *= 0.90 + 0.20 * cloud2;                                                         // פיגמנט לא אחיד
          col = mix(col, vec3(1.0), smoothstep(0.62, 0.8, cloud) * 0.22);                      // כתמי נייר חשוף
          e = edgeAt(vUv + wob, 1.3);
          col = mix(col, col * vec3(0.42, 0.36, 0.34), e * 0.75);                              // קו עיפרון חום־רך, ולא שחור
          vec3 paper = vec3(1.0, 0.985, 0.95) * (0.93 + 0.10 * grain);
          col *= paper;
        }
        gl_FragColor = vec4(col, 1.0);
      }`
  }));
  const quadScene = new THREE.Scene(); quadScene.add(quad);
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  function resize() {
    renderer.getDrawingBufferSize(size);
    rtColor.setSize(size.x, size.y); rtNorm.setSize(size.x, size.y); rtMask.setSize(size.x >> 1, size.y >> 1);
    quad.material.uniforms.res.value.copy(size);
  }
  resize();

  function render() {
    renderer.getDrawingBufferSize(size); if (size.x !== rtColor.width || size.y !== rtColor.height) resize();
    renderer.setRenderTarget(rtColor); renderer.render(scene, camera);
    const bg = scene.background, fog = scene.fog, sh = renderer.shadowMap.autoUpdate;
    scene.overrideMaterial = normalMat; scene.background = null; scene.fog = null; renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(rtNorm); renderer.setClearColor(0x8080ff, 1); renderer.clear(); renderer.render(scene, camera);
    if (mode === 4 || mode === 3) {                                               // מסכת המודגשים
      scene.overrideMaterial = maskMat; camera.layers.set(1);
      renderer.setRenderTarget(rtMask); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, camera);
      camera.layers.set(0);
    }
    scene.overrideMaterial = null; scene.background = bg; scene.fog = fog; renderer.shadowMap.autoUpdate = sh;
    renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
  }
  return { toonify, focus, render, resize };
}
