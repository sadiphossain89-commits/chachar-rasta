import { AudioSettings } from './types';

export class DhakaAudioEngine {
  private ctx: AudioContext | null = null;
  private motorOsc: OscillatorNode | null = null;
  private motorSubOsc: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;
  private settings: AudioSettings;
  private started = false;

  constructor(settings: AudioSettings) {
    this.settings = { ...settings };
  }

  public updateSettings(next: AudioSettings): void {
    this.settings = { ...next };
    if (this.motorGain && this.ctx) {
      if (this.settings.masterMuted || this.settings.motorMuted) {
        this.motorGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
      }
    }
  }

  public ensureUnlocked(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.started && this.ctx) {
      this.started = true;
      this.initMotorHum();
    }
  }

  private initMotorHum(): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const sub = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = 65;

    sub.type = 'triangle';
    sub.frequency.value = 130;

    filter.type = 'lowpass';
    filter.frequency.value = 340;
    filter.Q.value = 3;

    gain.gain.value = 0;

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    sub.start();

    this.motorOsc = osc;
    this.motorSubOsc = sub;
    this.motorGain = gain;
  }

  public updateMotor(speedRatio: number, isBoosting: boolean, active: boolean): void {
    if (!this.ctx || !this.motorOsc || !this.motorSubOsc || !this.motorGain) return;
    const now = this.ctx.currentTime;
    if (!active || this.settings.masterMuted || this.settings.motorMuted) {
      this.motorGain.gain.setTargetAtTime(0, now, 0.06);
      return;
    }

    const clamped = Math.max(0, Math.min(1.5, speedRatio));
    const baseFreq = 58 + clamped * 155 + (isBoosting ? 95 : 0);
    this.motorOsc.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.motorSubOsc.frequency.setTargetAtTime(baseFreq * 2.02, now, 0.05);

    const vol = 0.015 + Math.min(1, clamped) * 0.045 + (isBoosting ? 0.03 : 0);
    this.motorGain.gain.setTargetAtTime(vol, now, 0.06);
  }

  public playHorn(): void {
    if (this.settings.masterMuted || this.settings.hornMuted) return;
    this.ensureUnlocked();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Authentic Bangladeshi dual-tone peep-peep electric auto horn
    [0, 0.14].forEach((offset) => {
      if (!this.ctx) return;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(520, now + offset);
      osc2.frequency.setValueAtTime(655, now + offset);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1100;
      filter.Q.value = 1.6;

      gain.gain.setValueAtTime(0.001, now + offset);
      gain.gain.linearRampToValueAtTime(0.11, now + offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.11);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now + offset);
      osc2.start(now + offset);
      osc1.stop(now + offset + 0.12);
      osc2.stop(now + offset + 0.12);
    });
  }

  public playSoundBomb(spokenText?: string): void {
    if (this.settings.masterMuted || this.settings.voiceMuted) return;
    this.ensureUnlocked();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Musical truck/rickshaw fanfare riff!
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    const times = [0, 0.08, 0.16, 0.25, 0.37, 0.46];

    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + times[idx]);

      gain.gain.setValueAtTime(0.001, now + times[idx]);
      gain.gain.linearRampToValueAtTime(0.14, now + times[idx] + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + times[idx] + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + times[idx]);
      osc.stop(now + times[idx] + 0.16);
    });

    // Optional browser TTS for funny Bengali line if supported
    if (spokenText && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(spokenText);
        utter.lang = 'bn-BD';
        utter.rate = 1.15;
        utter.pitch = 1.1;
        utter.volume = 0.7;
        window.speechSynthesis.speak(utter);
      } catch {
        // Ignore if TTS unavailable
      }
    }
  }

  public playCrash(intensity = 1.0, isFatal = false): void {
    if (this.settings.masterMuted || this.settings.sfxMuted) return;
    this.ensureUnlocked();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const dur = isFatal ? 0.55 : 0.24;

    // Noise burst for metallic crunch
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isFatal ? 900 : 1400, now);
    filter.frequency.exponentialRampToValueAtTime(180, now + dur);

    const gain = this.ctx.createGain();
    const vol = Math.min(0.32, 0.14 * intensity + (isFatal ? 0.15 : 0));
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);

    // Sub punch
    const thud = this.ctx.createOscillator();
    const thudGain = this.ctx.createGain();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(isFatal ? 110 : 160, now);
    thud.frequency.exponentialRampToValueAtTime(34, now + dur * 0.7);
    thudGain.gain.setValueAtTime(vol * 1.1, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.7);
    thud.connect(thudGain);
    thudGain.connect(this.ctx.destination);
    thud.start(now);
    thud.stop(now + dur * 0.75);
  }

  public playBoost(): void {
    if (this.settings.masterMuted || this.settings.sfxMuted) return;
    this.ensureUnlocked();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.28);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(750, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.31);
  }

  public playChargeTick(): void {
    if (this.settings.masterMuted || this.settings.sfxMuted) return;
    this.ensureUnlocked();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playPoliceWhistle(): void {
    if (this.settings.masterMuted || this.settings.sfxMuted) return;
    this.ensureUnlocked();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2450, now);

    lfo.frequency.setValueAtTime(36, now);
    lfoGain.gain.setValueAtTime(140, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    lfo.start(now);
    osc.stop(now + 0.4);
    lfo.stop(now + 0.4);
  }

  public playPickup(): void {
    if (this.settings.masterMuted || this.settings.sfxMuted) return;
    this.ensureUnlocked();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [880, 1318.5].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.08, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.15);
    });
  }

  public dispose(): void {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
      this.started = false;
    }
  }
}
