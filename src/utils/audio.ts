// Audio synthesizer for Fabulous Fred game using the Web Audio API.
// Implements three custom synthesis engines: Retro 8-bit Synth, Cyberpunk Sine, and Crystalline Echo Chimes.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// Classic low-frequency Simon tones
const CLASSIC_FREQS = [209.3, 252.0, 310.0, 415.3]; // G-sharp, C, E, G standard frequencies

// 8 radial sine frequencies (C major scale)
const RADIAL_FREQS = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];

// Hex crystal high chimes (Pentatonic + High C/D)
const HEX_FREQS = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];

export function playBoardTone(boardId: string, index: number, duration: number = 0.35) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Output node
    const mainGain = ctx.createGain();
    mainGain.connect(ctx.destination);

    if (boardId === "classic") {
      // Retro Arcade 8-bit Synth (Sawtooth or Triangle with low pass filter)
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();

      osc.type = "sawtooth";
      const freq = CLASSIC_FREQS[index % CLASSIC_FREQS.length] || 250;
      osc.frequency.setValueAtTime(freq, now);

      // 8-bit filter decay
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1200, now);
      filter.frequency.exponentialRampToValueAtTime(150, now + duration);
      filter.Q.setValueAtTime(4, now);

      // Volume envelope
      mainGain.gain.setValueAtTime(0.2, now);
      mainGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(filter);
      filter.connect(mainGain);

      osc.start(now);
      osc.stop(now + duration);

    } else if (boardId === "radial") {
      // Cyberpunk / Hi-Tech Clean Sine Waves
      const osc = ctx.createOscillator();
      
      osc.type = "sine";
      const freq = RADIAL_FREQS[index % RADIAL_FREQS.length] || 350;
      osc.frequency.setValueAtTime(freq, now);

      // Volume envelope (smooth fade-in and fade-out)
      mainGain.gain.setValueAtTime(0.001, now);
      mainGain.gain.exponentialRampToValueAtTime(0.25, now + 0.05);
      mainGain.gain.setValueAtTime(0.25, now + duration - 0.05);
      mainGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(mainGain);
      osc.start(now);
      osc.stop(now + duration);

    } else {
      // Hexagonal / Mystic Crystalline Echo Chimes
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator(); // Sub-harmonics for crystal richness
      const delay = ctx.createDelay();
      const delayFeedback = ctx.createGain();

      const freq = HEX_FREQS[index % HEX_FREQS.length] || 523.25;

      // Primary tone
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(freq, now);

      // Shimmering overtone
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(freq * 1.5, now);

      // Direct gain
      const toneGain = ctx.createGain();
      toneGain.gain.setValueAtTime(0.12, now);
      toneGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      // Setup delay feedback loop for echo effect
      delay.delayTime.setValueAtTime(0.18, now); // 180ms delay
      delayFeedback.gain.setValueAtTime(0.4, now); // 40% feedback

      osc1.connect(toneGain);
      osc2.connect(toneGain);

      // Connections
      toneGain.connect(mainGain); // Play direct sound

      // Connect direct sound to delay line
      toneGain.connect(delay);
      delay.connect(delayFeedback);
      delayFeedback.connect(delay); // Feedback loop
      delayFeedback.connect(mainGain); // Output echo to main

      osc1.start(now);
      osc2.start(now);
      
      osc1.stop(now + duration + 1.0); // Keep alive for delay trails
      osc2.stop(now + duration + 1.0);
    }
  } catch (error) {
    console.warn("Audio Context block or unsupported browser audio", error);
  }
}

export function playErrorBuzz() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 0.5;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const mainGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    // Detuned sawtooth waves to create a gritty, low disonant buzzer
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(110, now); // A2

    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(115, now); // detuned by 5Hz

    // Lowpass filter to muffle it and make it heavy
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(300, now);

    mainGain.gain.setValueAtTime(0.3, now);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(mainGain);
    mainGain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);

    osc1.stop(now + duration);
    osc2.stop(now + duration);
  } catch (error) {
    console.warn("Failed to play error buzzer", error);
  }
}

export function playSuccessChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const mainGain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // Slide to G5

    mainGain.gain.setValueAtTime(0.001, now);
    mainGain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(mainGain);
    mainGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch (err) {
    console.warn("Failed to play success chime", err);
  }
}
