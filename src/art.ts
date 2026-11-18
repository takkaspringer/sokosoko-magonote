import { HEIGHT, TIP_RADIUS, WIDTH, strapPhase, tailPhase, type Barrier, type Point } from './stages';
import type { Round } from './engine';

const ink = '#25273f';
const paper = '#fff0ce';
const gold = '#ffbd67';

class Paint {
  constructor(readonly c: CanvasRenderingContext2D) {
    c.lineCap = 'round';
    c.lineJoin = 'round';
  }

  box(x: number, y: number, w: number, h: number, color: string, radius = 0, edge = '', line = 3) {
    this.c.beginPath();
    this.c.roundRect(x, y, w, h, radius);
    this.finish(color, edge, line);
  }

  ellipse(x: number, y: number, rx: number, ry: number, color: string, edge = '', line = 3) {
    this.c.beginPath();
    this.c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    this.finish(color, edge, line);
  }

  shape(path: string, fill: string, edge = '', width = 3) {
    const p = new Path2D(path);
    if (fill) { this.c.fillStyle = fill; this.c.fill(p); }
    if (edge) { this.c.strokeStyle = edge; this.c.lineWidth = width; this.c.stroke(p); }
  }

  line(points: Point[], color: string, width = 3) {
    this.c.beginPath();
    this.c.moveTo(points[0].x, points[0].y);
    for (const p of points.slice(1)) this.c.lineTo(p.x, p.y);
    this.finish('', color, width);
  }

  label(text: string, x: number, y: number, size: number, color = ink, align: CanvasTextAlign = 'center') {
    this.c.font = '900 ' + size + 'px "M PLUS Rounded 1c", "Yu Gothic UI", system-ui, sans-serif';
    this.c.textAlign = align;
    this.c.textBaseline = 'middle';
    this.c.fillStyle = color;
    this.c.fillText(text, x, y);
  }

  private finish(fill: string, edge: string, width: number) {
    if (fill) { this.c.fillStyle = fill; this.c.fill(); }
    if (edge) { this.c.strokeStyle = edge; this.c.lineWidth = width; this.c.stroke(); }
  }
}

export function portrait(canvas: HTMLCanvasElement, stage: number, mood: 'worried' | 'happy' | 'near' = 'worried') {
  const c = canvas.getContext('2d');
  if (!c) return;
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.save();
  c.scale(canvas.width / 100, canvas.height / 100);
  face(new Paint(c), stage, mood);
  c.restore();
}

function face(p: Paint, i: number, mood: 'worried' | 'happy' | 'near') {
  const happy = mood === 'happy';
  const fur = i === 2;
  const skin = ['#edaa70', '#ffca9f', '#c6936f'][i];
  p.ellipse(50, 51, 47, 47, ['#f6c372', '#c3b5e9', '#f0a07f'][i], ink, 3);
  p.shape('M13 94 Q15 76 39 74 H61 Q85 76 87 94 Z', ['#e8ab42', '#a58acf', '#ab475b'][i], ink);
  if (fur) {
    p.ellipse(25, 28, 12, 14, '#8f5b4f', ink);
    p.ellipse(75, 28, 12, 14, '#8f5b4f', ink);
    p.ellipse(25, 28, 5.5, 7, '#eda08a');
    p.ellipse(75, 28, 5.5, 7, '#eda08a');
  }
  p.ellipse(50, 51, 32, 31, skin, ink);
  if (fur) {
    p.ellipse(35, 51, 13, 9, '#785052');
    p.ellipse(65, 51, 13, 9, '#785052');
    p.ellipse(50, 64, 20, 12, '#f3d0a4');
    p.ellipse(50, 59, 5.5, 3.5, ink);
  } else if (i === 0) {
    p.shape('M18 45 Q17 17 50 16 Q81 18 84 41 L57 36 Q51 49 19 46 Z', '#385853', ink);
    p.shape('M29 38 Q55 25 92 39 Q80 53 58 43 Z', '#60806b', ink);
    p.ellipse(21, 55, 6, 8, skin, ink, 2);
  } else {
    p.shape('M17 57 Q9 17 45 14 Q89 13 83 59 L74 72 L75 45 Q63 44 51 28 Q49 39 25 48 L24 64 Z', '#4d3657', ink);
    p.shape('M72 47 L78 43 M73 53 L80 49', '', '#ffd27c', 3);
  }
  p.ellipse(28, 61, 5.4, 2.7, '#df785e');
  p.ellipse(72, 61, 5.4, 2.7, '#df785e');
  if (happy) {
    p.shape('M30 53 Q36 45 42 53 M58 53 Q64 45 70 53', '', ink, 3);
    p.shape('M43 65 Q50 71 57 65 Q54 78 48 75 Z', '#743e48', ink, 2);
  } else {
    const eye = mood === 'near' ? 3.7 : 2.8;
    const eyeColor = fur ? paper : ink;
    p.ellipse(36, 53, eye, 4, eyeColor);
    p.ellipse(64, 53, eye, 4, eyeColor);
    p.shape('M32 45 L41 42 M59 42 L68 45 M45 70 Q50 65 55 70', '', ink, 2.4);
  }
}

function star(p: Paint, x: number, y: number, size: number, color: string) {
  p.shape('M' + x + ' ' + (y - size) + ' q2 ' + (size - 2) + ' ' + size + ' ' + size
    + ' q-' + (size - 2) + ' 2 -' + size + ' ' + size
    + ' q-2 -' + (size - 2) + ' -' + size + ' -' + size
    + ' q' + (size - 2) + ' -2 ' + size + ' -' + size + 'Z', color);
}

export function storefront(canvas: HTMLCanvasElement) {
  const c = canvas.getContext('2d');
  if (!c) return;
  c.scale(canvas.width / 760, canvas.height / 630);
  const p = new Paint(c);
  const sky = c.createLinearGradient(0, 0, 0, 630);
  sky.addColorStop(0, '#201f39');
  sky.addColorStop(1, '#49405b');
  p.box(0, 0, 760, 630, sky as unknown as string);
  p.ellipse(599, 78, 41, 41, '#f6ce8b');
  p.ellipse(583, 65, 35, 35, '#24223d');
  for (let i = 0; i < 32; i++) {
    const x = (i * 101 + 31) % 750;
    const y = (i * 41 + 17) % 294;
    if (i % 7 === 0) star(p, x, y, 4, '#f9d391');
    else p.ellipse(x, y, i % 3 + 0.6, i % 3 + 0.6, '#77708e');
  }
  p.shape('M0 278 L93 237 V93 H137 V259 L205 281 V139 H287 V313 L482 289 V198 H515 V153 H677 V258 L760 223 V510 H0 Z', '#312b46');
  p.shape('M0 280 L126 306 V500 H0 Z M633 286 L760 261 V519 H633 Z', '#3d344b', '#212037', 6);
  for (const [x, y] of [[31, 325], [75, 341], [677, 327], [731, 309], [224, 172]]) {
    p.box(x, y, 21, 35, '#a96e63', 2, '#2a263e', 4);
    p.shape('M' + (x + 10) + ' ' + y + ' v35', '', '#2a263e', 2);
  }
  p.shape('M0 510 Q122 467 402 482 Q638 477 760 519 V630 H0 Z', '#40374c');
  p.ellipse(387, 559, 278, 41, '#70505b');
  p.ellipse(394, 556, 215, 24, '#ad7061');
  for (let i = 0; i < 10; i++) {
    const x = (i * 173 + 29) % 790;
    const y = 548 + (i * 43) % 75;
    p.shape('M' + x + ' ' + y + ' h' + (i % 3 * 13 + 19), '', '#2d283f', 3);
  }

  p.box(150, 290, 465, 248, '#734251', 7, '#232137', 8);
  p.box(176, 313, 416, 213, '#bb6753', 3, ink, 5);
  const glow = c.createRadialGradient(395, 459, 20, 395, 459, 227);
  glow.addColorStop(0, 'rgba(255,196,112,.55)');
  glow.addColorStop(1, 'rgba(255,196,112,0)');
  c.fillStyle = glow;
  c.fillRect(95, 220, 590, 366);

  p.shape('M98 295 Q233 276 246 208 H515 Q540 276 664 295 L650 325 H111 Z', '#3d2e46', '#201d34', 8);
  for (let i = 0; i < 11; i++) {
    p.shape('M' + (246 + i * 26) + ' 224 Q' + (231 + i * 29) + ' 283 ' + (123 + i * 52) + ' 304', '', '#655068', 4);
  }
  p.shape('M112 319 Q368 306 650 319', '', '#c1795d', 4);
  p.box(209, 170, 342, 90, '#56354c', 12, ink, 7);
  p.box(224, 181, 312, 65, '#ed9f5f', 7, '#6f414c', 4);
  p.box(233, 189, 294, 49, '#f9c678', 5);
  p.label('孫の手急便', 380, 212, 37, '#4c3044');
  p.ellipse(247, 214, 4, 4, '#a65d53');
  p.ellipse(515, 214, 4, 4, '#a65d53');

  p.box(277, 333, 210, 200, '#ffca82', 4, '#4b2c40', 7);
  p.box(292, 349, 180, 174, '#ea9d68', 1, '#704356', 3);
  p.shape('M304 350 V527 M461 350 V527', '', '#ffd998', 3);
  for (const x of [187, 514]) {
    p.box(x, 365, 65, 99, '#f1a568', 3, '#4b2c40', 6);
    p.box(x + 8, 373, 49, 82, '#f6be80', 2, '#a0645b', 2);
    p.shape('M' + (x + 32) + ' 372 v84 M' + (x + 9) + ' 417 h47', '', '#93585a', 3);
    p.box(x - 4, 463, 73, 10, '#613d50', 2, ink, 2);
  }
  for (const x of [140, 627]) {
    p.shape('M' + x + ' 309 v39', '', '#221f34', 4);
    p.ellipse(x, 375, 27, 33, '#ef875b', '#352339', 4);
    p.ellipse(x, 375, 16, 30, '#f6a565', '#d66e50', 2);
    p.box(x - 13, 343, 26, 8, '#5c3b51', 2, ink, 3);
    p.box(x - 13, 402, 26, 8, '#5c3b51', 2, ink, 3);
  }
  c.save();
  c.translate(307, 391);
  c.scale(1.48, 1.48);
  face(p, 2, 'happy');
  c.restore();
  c.save();
  c.translate(291, 342);
  p.shape('M0 0 H182 L174 55 Q159 60 126 54 L123 15 L119 55 Q92 62 64 55 L60 15 L56 55 Q22 60 5 55 Z', '#b64751', '#612f49', 4);
  p.shape('M6 9 Q86 18 175 9', '', '#f7ac80', 2);
  p.label('のれん', 90, 36, 15, paper);
  c.restore();
  p.box(263, 527, 232, 16, '#623d50', 3, ink, 4);
  p.box(47, 442, 71, 51, '#bd6c59', 5, ink, 4);
  p.label('営業中', 82, 466, 16, paper);
  p.shape('M64 494 l-9 29 M104 493 l10 30', '', ink, 6);
  p.shape('M560 538 L554 505 H600 L595 538 Z', '#a46155', ink, 4);
  p.shape('M577 506 Q549 490 553 469 Q575 470 578 489 Q577 462 593 454 Q605 481 581 502 Q597 480 611 483 Q606 502 589 507', '#6a806f', ink, 3);
  for (const [x, y, size] of [[117, 178, 12], [579, 153, 9], [673, 431, 9], [89, 413, 6], [490, 123, 6]]) {
    star(p, x, y, size, '#ffca83');
  }
}

function room(p: Paint) {
  p.box(0, 0, WIDTH, HEIGHT, '#352c47');
  p.box(10, 12, 460, 387, '#583c51', 18, '#261f36', 3);
  p.box(19, 21, 442, 369, '#765162', 16, '#aa7374', 2);
  for (let x = 28; x < WIDTH - 15; x += 48) {
    p.shape('M' + x + ' 25 v350', '', '#684558', 2);
    p.shape('M' + (x + 4) + ' 31 v317', '', '#855b68', 1);
  }
  p.box(20, 349, 440, 39, '#684759', 0);
  p.shape('M20 350 H460 M20 371 H460', '', '#56394c', 2);
  p.ellipse(239, 352, 184, 35, '#50374d');
  for (const x of [38, 442]) {
    p.box(x - 11, 52, 22, 56, '#4d344c', 6, ink, 2);
    p.box(x - 7, 59, 14, 40, '#d08469', 6);
    p.shape('M' + x + ' 62 v34', '', '#f1af76', 2);
  }
}

function back(p: Paint, i: number, color: string, accent: string, drop: number, time: number) {
  const c = p.c;
  c.save();
  c.translate(0, 4 * drop);
  if (i === 2) {
    p.ellipse(207, 76 + 4 * drop, 22, 25, '#966052', ink, 5);
    p.ellipse(274, 76 + 4 * drop, 22, 25, '#966052', ink, 5);
    p.ellipse(208, 75, 11, 12, '#e8a288');
    p.ellipse(273, 75, 11, 12, '#e8a288');
  }
  p.ellipse(240, 100, 58, 50, ['#5a584b', '#4d3657', '#bc8c71'][i], ink, 6);
  if (i === 0) {
    p.shape('M181 103 Q168 71 189 57 Q236 31 275 53 Q302 64 299 91 L281 92 Q239 78 181 103 Z', '#456860', ink, 5);
    p.shape('M181 87 Q223 66 275 71', '', '#6f9b83', 3);
    p.box(218, 83, 39, 13, '#dca759', 4, ink, 3);
  } else if (i === 1) {
    for (let k = 0; k < 4; k++) p.shape('M' + (201 + k * 22) + ' 75 q15 -12 25 -6', '', '#70506d', 2);
  } else {
    p.shape('M222 63 L230 52 L236 61 L246 51 L252 62', '', '#a37157', 6);
  }
  p.shape('M109 160 Q130 131 187 120 Q241 132 293 120 Q357 127 372 162 Q407 213 393 304 Q379 356 322 368 Q242 385 155 365 Q97 348 86 312 Q69 238 109 160 Z', color, ink, 6);
  p.shape('M115 171 Q154 156 175 128 M307 127 Q349 144 366 168 M127 187 Q101 230 115 283 Q116 302 128 316 M366 186 Q391 237 372 299', '', ['#b57943', '#7d65ad', '#78364f'][i], 3);
  p.c.setLineDash([3, 6]);
  p.shape('M105 325 Q143 364 239 365 Q335 364 376 326', '', ['#f8ca6b', '#d5bceb', '#dc8491'][i], 3);
  p.c.setLineDash([]);
  if (i === 0) {
    p.shape('M222 139 Q270 125 309 146 Q333 165 337 206 L344 302 Q337 337 306 347 H215 Q193 343 190 312 L195 175 Q198 146 222 139 Z', accent, ink, 5);
    p.shape('M206 171 Q246 184 322 166 M217 195 Q257 188 308 194 M224 317 Q264 328 322 313', '', '#5f9b79', 3);
    p.box(269, 264, 60, 43, '#407b62', 11, '#254b47', 3);
    for (let j = 0; j < 6; j++) p.shape('M' + (278 + j * 7) + ' 272 v4', '', '#edc58b', 1.5);
    p.box(311, 271, 5, 14, '#edc58b', 2, ink, 1.5);
    if (strapPhase(time).open) {
      p.shape('M191 185 Q151 219 191 266', '', '#254537', 9);
      p.shape('M191 185 Q158 219 191 266', '', '#649875', 5);
    }
  } else if (i === 1) {
    p.shape('M142 153 Q166 109 220 119 Q246 96 274 118 Q329 108 351 154 Q338 184 319 208 Q255 250 210 228 Q177 213 142 153 Z', '#73aed1', ink, 4);
    p.shape('M149 152 Q213 164 241 211 Q260 178 343 152 Q314 131 270 135 Q248 123 219 136 Q181 128 149 152 Z', '#a8e0e7', '#4e779f', 3);
    p.shape('M170 169 Q205 185 212 199 M282 205 Q311 189 324 177', '', '#5483b0', 3);
    p.shape('M219 132 Q236 124 249 124 Q268 124 282 133', '', paper, 3);
    p.box(233, 277, 54, 26, '#b8a0de', 5, '#8066a8', 2);
    p.label('MIO', 260, 290, 12, '#645285');
  } else {
    p.shape('M169 126 Q195 150 240 152 Q286 150 313 126 L326 137 Q292 173 240 173 Q184 173 155 140 Z', '#6f334c', ink, 4);
    for (const [x, y] of [[143, 198], [337, 197], [158, 290], [323, 287], [239, 258]]) {
      p.shape('M' + x + ' ' + y + ' q10 -11 20 0 q-10 10 -20 0Z', '#be6877');
    }
    p.shape('M240 175 v80', '', '#903a55', 2);
  }
  c.restore();
}

function barrier(p: Paint, r: Barrier) {
  const { x, y, w, h, kind } = r;
  const c = p.c;
  const colors = {
    strap: ['#315d51', '#81a28a', '#203e3d'],
    hood: ['#89cbe0', '#c5edf1', '#39536d'],
    seam: ['#8268ac', '#c6a8e6', '#55446c'],
    tail: ['#be8a6b', '#dca782', '#68475a'],
  };
  const [fill, stitch, border] = colors[kind];
  const radius = kind === 'tail' ? 18 : Math.min(w, h, 16) / 3;
  p.box(x + 2, y + 4, w, h, '#25273f55', radius);
  p.box(x, y, w, h, fill, radius, border, 3.5);
  c.save();
  c.beginPath();
  c.roundRect(x + 2, y + 2, w - 4, h - 4, radius);
  c.clip();
  if (kind === 'tail') {
    for (let j = 13; j < w; j += 37) {
      p.shape('M' + (x + j) + ' ' + y + ' q20 18 0 ' + h + ' h17 q19 -19 0 -' + h + 'Z', '#89594f');
    }
    p.shape('M' + (x + 6) + ' ' + (y + 8) + ' h' + (w - 12), '', stitch, 2);
  } else {
    c.setLineDash([4, 4]);
    if (h > w) p.shape('M' + (x + 5) + ' ' + (y + 4) + ' v' + (h - 8), '', stitch, 2);
    else p.shape('M' + (x + 4) + ' ' + (y + 5) + ' h' + (w - 8), '', stitch, 2);
    c.setLineDash([]);
    if (kind === 'strap' && y >= 250) {
      p.box(x + 4, y + 16, w - 8, 23, '#cfaf79', 3, '#353445', 2);
      p.box(x + 7, y + 22, w - 14, 11, '#486455', 2);
    }
  }
  c.restore();
}

function tool(p: Paint, tip: Point, entry: Point, touch: boolean) {
  const c = p.c;
  const grip = touch ? { x: tip.x, y: tip.y + 29 } : { x: tip.x, y: tip.y };
  const start = { x: Math.min(448, Math.max(32, entry.x)), y: Math.min(423, entry.y + 87) };
  c.beginPath();
  c.moveTo(start.x, start.y);
  c.quadraticCurveTo((tip.x + entry.x) / 2, grip.y + 41, grip.x, grip.y + 15);
  c.lineTo(grip.x, grip.y);
  c.strokeStyle = '#372b42';
  c.lineWidth = 13;
  c.stroke();
  c.strokeStyle = '#ea604b';
  c.lineWidth = 8;
  c.stroke();
  if (touch) {
    p.line([{ x: grip.x, y: grip.y }, tip], '#ea604b', 6);
    p.ellipse(grip.x, grip.y, 10, 8, '#ea604b', ink, 3);
  }
  p.ellipse(tip.x, tip.y, TIP_RADIUS, TIP_RADIUS, paper, ink, 2.5);
  for (const x of [-3, 0, 3]) {
    p.shape('M' + (tip.x + x) + ' ' + (tip.y - 3) + ' v4', '', '#b96957', 1);
  }
}

export function drawBoard(canvas: HTMLCanvasElement, round: Round, stageIndex: number, touch: boolean, motion: boolean) {
  const c = canvas.getContext('2d');
  if (!c) return;
  c.save();
  c.scale(canvas.width / WIDTH, canvas.height / HEIGHT);
  const p = new Paint(c);
  room(p);
  const since = round.time - round.successAt;
  const dropped = since < 1.18;
  const impactAge = round.time - round.impactAt;
  if (motion && impactAge < 0.11) c.translate(Math.sin(impactAge * 118) * 2, 0);
  back(p, stageIndex, round.stage.color, round.stage.accent, dropped ? 1 : 0, round.time);
  round.barriers.forEach(r => barrier(p, r));

  if (stageIndex === 0) {
    const phase = strapPhase(round.time);
    if (phase.ready || phase.open) {
      const x = 190;
      p.box(x - 30, 193, 60, 20, phase.open ? '#fff0ae' : '#eebc73', 8, ink, 2);
      p.label(phase.open ? 'いま！ ⇢' : 'ぴくっ', x, 203, 12);
      p.shape('M181 251 l9 8 9 -8', '', '#ffe599', 3);
    }
  } else if (stageIndex === 2) {
    const phase = tailPhase(round.time);
    if (phase.ready || phase.lift) {
      p.box(209, 266, 62, 19, '#fff0ae', 8, ink, 2);
      p.label(phase.lift ? '近道 ↑' : 'ぴくっ', 240, 276, 12);
    }
  }

  if (!round.tip) {
    for (const entry of round.stage.entries) {
      p.ellipse(entry.x, entry.y, 25, 25, '#fff0ae26', '#f8cf8e', 2);
      p.ellipse(entry.x, entry.y, 13, 13, '#ea604b', ink, 3);
      p.label(entry.x > 300 ? '←' : entry.y > 300 ? '↑' : entry.y < 100 ? '↓' : '→', entry.x, entry.y, 16, paper);
      const y = entry.y > 346 ? entry.y - 34 : entry.y - 32;
      p.box(entry.x - 36, y - 10, 72, 20, '#fff0ce', 9, ink, 2);
      p.label(entry.label, entry.x, y, 12);
    }
  }

  if (round.tip && round.entry) tool(p, round.tip, round.entry, touch);
  if (round.scratch.active && round.target && !round.waiting) {
    const { x, y } = round.target;
    p.box(x - 60, y - 42, 120, 26, '#fff0ae', 10, ink, 2.5);
    p.label('←  そこそこ！  →', x, y - 29, 13);
    for (let i = 0; i < 2; i++) p.ellipse(x - 8 + i * 16, y + 27, 5.4, 5.4,
      i < round.scratch.count ? '#ffcb61' : '#5a405a', paper, 1.7);
  }

  if (round.impact && impactAge < 0.32 && !dropped) {
    const { x, y } = round.impact;
    star(p, x, y, 11, '#ffe9b4');
    p.box(Math.max(13, Math.min(415, x - 23)), y + 12, 49, 19, paper, 7, ink, 2);
    p.label('コツッ', Math.max(37, Math.min(439, x + 1)), y + 21, 11);
  }
  if (dropped) {
    const origin = round.stage.targets[round.solved - 1];
    c.save();
    c.globalAlpha = 1 - Math.max(0, since - 0.48) / 0.72;
    const radius = motion ? 20 + since * 44 : 35;
    p.ellipse(origin.x, origin.y, radius, radius * 0.78, '', '#fff0ae', 3);
    p.ellipse(origin.x, origin.y, radius + 11, radius * 0.78 + 9, '', '#fff0ae', 1.5);
    star(p, origin.x - 33, origin.y - 39, 10, '#fff0ae');
    star(p, origin.x + 32, origin.y + 22, 7, '#fff0ae');
    p.box(origin.x - 56, origin.y - 49, 112, 23, '#fff0ae', 10, ink, 2.5);
    p.label('すっきり！  ✓ ✓', origin.x, origin.y - 37, 14);
    c.restore();
  }
  c.restore();
}
