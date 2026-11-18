export class ShopAudio {
  private context: AudioContext | null = null;
  private music: GainNode | null = null;
  private effects: GainNode | null = null;
  private beat = 0;
  private tickAt = 0;
  private musicVolume = 0.42;
  private effectsVolume = 0.68;

  unlock() {
    try {
      if (!this.context) {
        const context = new AudioContext();
        this.context = context;
        this.music = context.createGain();
        this.effects = context.createGain();
        this.music.connect(context.destination);
        this.effects.connect(context.destination);
        this.levels(this.musicVolume * 100, this.effectsVolume * 100);
      }
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    } catch { /* Audio is optional. */ }
  }

  levels(music: number, effects: number) {
    this.musicVolume = music / 100;
    this.effectsVolume = effects / 100;
    if (this.music) this.music.gain.value = this.musicVolume * 0.24;
    if (this.effects) this.effects.gain.value = this.effectsVolume * 0.32;
  }

  private note(bus: GainNode | null, midi: number, at: number, length: number, strength: number, shape: OscillatorType) {
    const ctx = this.context;
    if (!ctx || !bus) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = shape;
    osc.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    env.gain.setValueAtTime(0.001, at);
    env.gain.exponentialRampToValueAtTime(strength, at + 0.009);
    env.gain.exponentialRampToValueAtTime(0.001, at + length);
    osc.connect(env).connect(bus);
    osc.start(at);
    osc.stop(at + length + 0.02);
  }

  pulse(playing: boolean) {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || !playing || !this.musicVolume) return;
    if (ctx.currentTime < this.tickAt) return;
    this.tickAt = ctx.currentTime + 0.245;
    const melody = [72, 76, 79, 76, 74, 77, 81, 79, 76, 72, 69, 72, 74, 71, 67, 71];
    const step = this.beat++ % melody.length;
    this.note(this.music, melody[step], ctx.currentTime, 0.16, 0.27, 'triangle');
    if (step % 4 === 0) this.note(this.music, 43 + (step % 8 ? 2 : 0), ctx.currentTime, 0.13, 0.35, 'sine');
    if (step % 4 === 2) this.note(this.music, 32, ctx.currentTime, 0.07, 0.22, 'triangle');
  }

  play(event: string) {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || !this.effectsVolume) return;
    const phrases: Record<string, number[]> = {
      tap: [74], tick: [69], go: [79, 84], bump: [43], found: [76, 79],
      stroke: [82], relief: [77, 81, 86], clear: [72, 76, 79, 84], fail: [74, 70, 65],
    };
    (phrases[event] ?? []).forEach((note, i) => {
      this.note(this.effects, note, ctx.currentTime + i * 0.075, event === 'bump' ? 0.067 : 0.2,
        0.55, event === 'bump' ? 'square' : 'triangle');
    });
  }
}
