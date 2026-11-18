export const defaults = {
  music: 42, effects: 68, hints: true, timed: true, shake: true, large: false,
};

export type Settings = typeof defaults;
export interface Records { stars: number; time: number | null; score: number }

function read(key: string): unknown {
  try { return JSON.parse(localStorage.getItem('magonote:' + key) ?? 'null'); }
  catch { return null; }
}

export function save(key: string, value: unknown) {
  try { localStorage.setItem('magonote:' + key, JSON.stringify(value)); }
  catch { /* The current session remains playable when storage is unavailable. */ }
}

export function loadSettings(): Settings {
  const raw = read('settings');
  if (!raw || typeof raw !== 'object') return { ...defaults };
  const data = raw as Partial<Settings>;
  const volume = (n: unknown, fallback: number) =>
    typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : fallback;
  const flag = (n: unknown, fallback: boolean) => typeof n === 'boolean' ? n : fallback;
  return {
    music: volume(data.music, defaults.music), effects: volume(data.effects, defaults.effects),
    hints: flag(data.hints, defaults.hints), timed: flag(data.timed, defaults.timed),
    shake: flag(data.shake, defaults.shake), large: flag(data.large, defaults.large),
  };
}

export function loadRecords(): Records[] {
  const raw = read('records');
  return Array.from({ length: 3 }, (_, i) => {
    const best = Array.isArray(raw) ? raw[i] : null;
    const integer = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
    return {
      stars: integer(best?.stars) && best.stars <= 3 ? best.stars : 0,
      time: integer(best?.time) ? best.time : null,
      score: integer(best?.score) ? best.score : 0,
    };
  });
}
