import { HEIGHT, TIP_RADIUS, WIDTH, type Barrier, type Point, type Stage } from './stages';

export interface Result {
  cleared: boolean;
  solved: number;
  total: number;
  seconds: number;
  points: number;
  stars: number;
  perfect: boolean;
}

interface Scratch {
  active: boolean;
  perfect: boolean;
  direction: number;
  armed: boolean;
  armedAt: number;
  count: number;
}

const freshScratch = (): Scratch =>
  ({ active: false, perfect: true, direction: 0, armed: false, armedAt: 0, count: 0 });

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function overlap(p: Point, r: Barrier) {
  const x = p.x - clamp(p.x, r.x, r.x + r.w);
  const y = p.y - clamp(p.y, r.y, r.y + r.h);
  if (x === 0 && y === 0) {
    return TIP_RADIUS + Math.min(p.x - r.x, r.x + r.w - p.x, p.y - r.y, r.y + r.h - p.y);
  }
  return Math.max(0, TIP_RADIUS - Math.hypot(x, y));
}

export class Round {
  time = 0;
  countdown = 3;
  solved = 0;
  score = 0;
  streak = 0;
  perfect = true;
  scratch = freshScratch();
  tip: Point | null = null;
  entry: Point | null = null;
  successAt = -10;
  impactAt = -10;
  impact: Point | null = null;
  waiting = false;
  result: Result | null = null;

  constructor(readonly stage: Stage, readonly timed: boolean, private sound: (event: string) => void) {}

  get target() { return this.stage.targets[this.solved]; }
  get barriers() { return this.stage.obstacles(this.time); }

  tick(delta: number) {
    if (this.result) return;
    if (this.countdown > 0) {
      const number = Math.ceil(this.countdown);
      this.countdown = Math.max(0, this.countdown - delta);
      if (Math.ceil(this.countdown) !== number) this.sound(this.countdown > 0 ? 'tick' : 'go');
      return;
    }
    if (this.waiting) {
      if (this.solved >= this.stage.targets.length) {
        this.successAt -= delta;
        if (this.time - this.successAt >= 1.12) this.finish(true);
        return;
      }
      this.time += delta;
      if (this.time - this.successAt >= 0.88) this.waiting = false;
    } else {
      this.time += delta;
    }
    if (this.timed && this.time >= this.stage.limit) {
      this.time = this.stage.limit;
      this.finish(false);
    }
  }

  place(entry: Point) {
    this.entry = entry;
    this.tip = { ...entry };
  }

  retract() {
    this.tip = null;
    this.entry = null;
    this.resetStroke();
  }

  move(desired: Point) {
    if (!this.tip || this.result || this.countdown > 0 || this.waiting) return;
    const from = this.tip;
    const xDelta = desired.x - from.x;
    const yDelta = desired.y - from.y;
    const distance = Math.hypot(xDelta, yDelta);
    const steps = Math.max(1, Math.ceil(distance / 2));
    const barriers = this.barriers;
    let p = from;
    for (let step = 0; step < steps; step++) {
      const next = {
        x: clamp(p.x + xDelta / steps, 12, WIDTH - 12),
        y: clamp(p.y + yDelta / steps, 35, HEIGHT - 12),
      };
      const pass = (point: Point) => barriers.every(barrier => {
        const depth = overlap(point, barrier);
        // A moving barrier may cover a parked tip. Permit motion out of the overlap.
        return depth === 0 || depth < overlap(p, barrier);
      });
      if (pass(next)) {
        p = next;
      } else {
        if (this.time - this.impactAt >= 0.34) {
          this.impactAt = this.time;
          this.impact = { ...next };
          this.sound('bump');
        }
        const sideways = { x: next.x, y: p.y };
        const along = { x: p.x, y: next.y };
        if (next.x !== p.x && pass(sideways)) p = sideways;
        else if (next.y !== p.y && pass(along)) p = along;
      }
      this.tip = p;
      this.checkScratch();
      if (this.waiting) break;
    }
  }

  private resetStroke() {
    if (this.scratch.active) this.scratch.perfect = false;
    this.scratch.active = false;
    this.scratch.direction = 0;
    this.scratch.armed = false;
  }

  private checkScratch() {
    const spot = this.target;
    const p = this.tip;
    if (!spot || !p) return;
    const dx = p.x - spot.x;
    const dy = p.y - spot.y;
    const s = this.scratch;
    if (s.active && (Math.abs(dx) > 38 || Math.abs(dy) > 30)) {
      this.resetStroke();
    }
    if (!s.active && Math.hypot(dx, dy) <= 12) {
      s.active = true;
      this.sound('found');
    }
    if (!s.active || Math.abs(dy) > 16) return;
    if (!s.armed && Math.abs(dx) >= 18) {
      s.direction = Math.sign(dx);
      s.armed = true;
      s.armedAt = this.time;
    } else if (s.armed && dx * s.direction <= 5 && this.time - s.armedAt >= 0.075) {
      s.count++;
      s.armed = false;
      if (s.count === 2) this.solve();
      else this.sound('stroke');
    }
  }

  private solve() {
    this.solved++;
    this.perfect &&= this.scratch.perfect;
    this.streak = this.scratch.perfect ? this.streak + 1 : 0;
    this.score += 100 + this.streak * 25;
    this.scratch = freshScratch();
    this.successAt = this.time;
    this.waiting = true;
    this.sound('relief');
  }

  private finish(cleared: boolean) {
    const seconds = Math.ceil(this.time);
    const bonus = cleared ? Math.max(0, Math.floor(this.stage.limit - this.time)) * 5 : 0;
    const stars = !cleared ? 0 : this.time > this.stage.silver ? 1 : this.perfect ? 3 : 2;
    this.result = {
      cleared, seconds, stars, total: this.stage.targets.length,
      solved: this.solved, points: this.score + bonus, perfect: this.perfect,
    };
    this.sound(cleared ? 'clear' : 'fail');
  }
}
