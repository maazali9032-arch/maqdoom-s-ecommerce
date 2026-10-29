// Loom-room sounds made live with Web Audio (no audio files): shuttle clack, cloth rustle, scissors.
// Off until the visitor turns sound on.

export class Sound {
  private ctx: AudioContext | null = null;
  private noise: AudioBuffer | null = null;
  private rustleGain: GainNode | null = null;
  private rustleFilter: BiquadFilterNode | null = null;
  enabled = false;

  enable() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // continuous rustle, volume follows how fast the cloth moves
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      this.rustleFilter = this.ctx.createBiquadFilter();
      this.rustleFilter.type = "bandpass";
      this.rustleFilter.frequency.value = 2600;
      this.rustleFilter.Q.value = 0.7;
      this.rustleGain = this.ctx.createGain();
      this.rustleGain.gain.value = 0;
      src.connect(this.rustleFilter).connect(this.rustleGain).connect(this.ctx.destination);
      src.start();
    }
    void this.ctx.resume();
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
    if (this.rustleGain && this.ctx) this.rustleGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
  }

  private burst(freq: number, q: number, gain: number, dur: number, at = 0) {
    if (!this.enabled || !this.ctx || !this.noise) return;
    const t = this.ctx.currentTime + at;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.ctx.destination);
    src.start(t, Math.random() * 0.5, dur + 0.02);
  }

  /** Wooden shuttle hitting the end of the loom. */
  clack() {
    if (!this.enabled || !this.ctx) return;
    this.burst(1700, 3, 0.35, 0.05);
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(190, t);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.06);
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + 0.1);
  }

  /** Cloth moving: speed 0..1; heavy cloth sounds lower. */
  rustle(speed: number, heavy: boolean) {
    if (!this.enabled || !this.ctx || !this.rustleGain || !this.rustleFilter) return;
    const t = this.ctx.currentTime;
    this.rustleFilter.frequency.setTargetAtTime(heavy ? 900 : 3200, t, 0.1);
    this.rustleGain.gain.setTargetAtTime(Math.min(0.12, speed * 0.12), t, 0.06);
  }

  snip() {
    this.burst(5200, 6, 0.4, 0.035);
    this.burst(4300, 6, 0.35, 0.04, 0.09);
  }
}
