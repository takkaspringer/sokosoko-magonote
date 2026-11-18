export const WIDTH = 480;
export const HEIGHT = 410;
export const TIP_RADIUS = 7;

export interface Point { x: number; y: number }
export interface Entry extends Point { label: string }
export interface Barrier {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'strap' | 'hood' | 'seam' | 'tail';
}
export interface Target extends Point { clue: string }

export interface Stage {
  name: string;
  customer: string;
  line: string;
  tip: string;
  limit: number;
  silver: number;
  color: string;
  accent: string;
  targets: Target[];
  entries: Entry[];
  obstacles: (time: number) => Barrier[];
}

const rect = (kind: Barrier['kind'], x: number, y: number, w: number, h: number): Barrier =>
  ({ kind, x, y, w, h });

export function strapPhase(time: number) {
  const beat = time % 3.2;
  return { ready: beat >= 1.55 && beat < 2.15, open: beat >= 2.15 && beat < 3.12 };
}

export function tailPhase(time: number) {
  const phase = time % 6;
  const lift = phase >= 4.6 && phase < 5.7;
  const swing = Math.sin(phase * Math.PI / 3);
  const ready = (phase >= 2.6 && phase < 3) || (phase >= 4.2 && phase < 4.6) || phase >= 5.7 || phase < 0.25;
  return { lift, swing, ready };
}

export const stages: Stage[] = [
  {
    name: 'リュックの下に、あとちょっと！', customer: '配達員のゴンさん',
    line: 'かゆいんだけど、肩ひもがじゃまでさ……！',
    tip: '肩ひものはしを 回ろう。ひもが ういたら、すき間から近道！',
    limit: 50, silver: 30, color: '#e8ab42', accent: '#326a59',
    targets: [
      { x: 125, y: 210, clue: 'ひだりの肩が ムズムズ！' },
      { x: 245, y: 229, clue: '今度は 肩ひもの 内がわ！' },
    ],
    entries: [{ x: 48, y: 248, label: 'ここから' }],
    obstacles(time) {
      const { open, ready } = strapPhase(time);
      const x = ready ? 180 + Math.sin(time * 37) * 2 : 180;
      return [
        rect('strap', x, 114, 22, open ? 71 : 221),
        ...(open ? [rect('strap', 180, 266, 22, 69)] : []),
      ];
    },
  },
  {
    name: 'フードの奥まで とどけ！', customer: 'ミオちゃん',
    line: '上のほう！ フードのすぐ下！',
    tip: '入口は 左・右・えり。フードのふちにそって、すき間を見つけよう。',
    limit: 60, silver: 38, color: '#a58acf', accent: '#8ad3e5',
    targets: [
      { x: 137, y: 192, clue: 'ひだりの フードのふち！' },
      { x: 250, y: 143, clue: 'えりの 下あたり！' },
      { x: 343, y: 245, clue: 'つぎは 右の、もう少し下！' },
    ],
    entries: [
      { x: 48, y: 249, label: '左の入口' },
      { x: 432, y: 249, label: '右の入口' },
      { x: 250, y: 87, label: 'えりの入口' },
    ],
    obstacles: () => [
      rect('hood', 90, 222, 133, 18),
      rect('hood', 181, 161, 19, 62),
      rect('hood', 287, 155, 101, 19),
      rect('seam', 291, 250, 18, 87),
      rect('seam', 368, 266, 20, 68),
    ],
  },
  {
    name: '店長、じっとして！', customer: 'タヌキ店長',
    line: 'じっとするぞ……いや、やっぱりかゆい！',
    tip: 'しっぽの根元が ぴくっ！ 空いた側から行こう。高く上がると 真ん中が近道。',
    limit: 65, silver: 42, color: '#ab475b', accent: '#a37157',
    targets: [
      { x: 143, y: 249, clue: 'ひだりの せなかじゃ！' },
      { x: 350, y: 244, clue: '今度は 右じゃ！' },
      { x: 244, y: 215, clue: 'さいごは せなかの まんなか！' },
    ],
    entries: [
      { x: 74, y: 355, label: '左の入口' },
      { x: 240, y: 375, label: '下の入口' },
      { x: 406, y: 355, label: '右の入口' },
    ],
    obstacles(time) {
      const { lift, swing } = tailPhase(time);
      if (lift) return [rect('tail', 261, 266, 116, 40)];
      return [rect('tail', 160 + Math.round(swing * 68), 295, 160, 38)];
    },
  },
];
