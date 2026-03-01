// src/audio/AudioManager.ts
type SoundId =
  | "tap"
  | "correct"
  | "incorrect"
  | "streak"
  | "complete"
  | "open";

type AudioSettings = {
  enabled: boolean;   // master on/off
  volume: number;     // 0..1
};

const DEFAULT_SETTINGS: AudioSettings = { enabled: true, volume: 0.7 };

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private settings: AudioSettings = DEFAULT_SETTINGS;

  // Must be called after a user gesture at least once
  async ensureStarted() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.settings.enabled ? this.settings.volume : 0;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  setSettings(next: Partial<AudioSettings>) {
    this.settings = {
      ...this.settings,
      ...next,
      volume: clamp01(next.volume ?? this.settings.volume),
    };
    if (this.master) {
      this.master.gain.value = this.settings.enabled ? this.settings.volume : 0;
    }
  }

  getSettings() {
    return this.settings;
  }

  play(id: SoundId) {
    if (!this.ctx || !this.master) return;
    if (!this.settings.enabled || this.settings.volume <= 0) return;

    const t0 = this.ctx.currentTime;

    switch (id) {
      case "tap":
        this.tone(t0, 880, 0.03, 0.15);
        break;

      case "correct":
        this.tone(t0, 740, 0.05, 0.20);
        this.tone(t0 + 0.05, 988, 0.07, 0.22);
        this.tone(t0 + 0.12, 1175, 0.08, 0.22);
        break;

      case "incorrect":
        this.tone(t0, 196, 0.10, 0.22, "sawtooth");
        this.noise(t0 + 0.02, 0.06, 0.08); // tiny thud
        break;

      case "streak":
        this.tone(t0, 523, 0.06, 0.18);
        this.tone(t0 + 0.06, 659, 0.06, 0.18);
        this.tone(t0 + 0.12, 784, 0.09, 0.18);
        break;

      case "complete":
        this.tone(t0, 659, 0.07, 0.22);
        this.tone(t0 + 0.07, 784, 0.07, 0.22);
        this.tone(t0 + 0.14, 988, 0.14, 0.22);
        break;

      case "open":
        this.tone(t0, 440, 0.05, 0.10, "triangle");
        this.tone(t0 + 0.03, 660, 0.05, 0.10, "triangle");
        break;
    }
  }

  private tone(
    start: number,
    freq: number,
    dur: number,
    gain: number,
    type: OscillatorType = "sine"
  ) {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);

    // quick attack/decay for “app sound” feel
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    osc.connect(g);
    g.connect(this.master);

    osc.start(start);
    osc.stop(start + dur + 0.01);
  }

  private noise(start: number, dur: number, gain: number) {
    if (!this.ctx || !this.master) return;
    const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6;

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    src.connect(g);
    g.connect(this.master);

    src.start(start);
    src.stop(start + dur + 0.01);
  }
}