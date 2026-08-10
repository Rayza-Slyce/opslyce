import type { AudioCue } from './audioPolicy';

export type AudioPreferences = Readonly<{
  soundEffects: boolean;
  hqAmbience: boolean;
}>;

export type AudioController = Readonly<{
  unlock: () => void;
  setPreferences: (preferences: AudioPreferences) => void;
  setAmbienceActive: (active: boolean, gainScale?: number) => void;
  playCue: (cue: AudioCue) => void;
  dispose: () => void;
}>;

type ActiveEffect = Readonly<{
  gain: GainNode;
  sources: readonly AudioScheduledSourceNode[];
}>;

type AmbienceGraph = Readonly<{
  gain: GainNode;
  sources: readonly AudioScheduledSourceNode[];
}>;

const DEFAULT_PREFERENCES: AudioPreferences = Object.freeze({
  soundEffects: true,
  hqAmbience: true
});

const MASTER_EFFECT_GAIN = 0.18;
const MASTER_AMBIENCE_GAIN = 0.105;

export function createAudioController(): AudioController {
  let context: AudioContext | null = null;
  let preferences = DEFAULT_PREFERENCES;
  let ambienceRequested = false;
  let ambienceGainScale = 1;
  let ambienceGraph: AmbienceGraph | null = null;
  let activeEffect: ActiveEffect | null = null;
  let disposed = false;

  const ensureContext = () => {
    if (disposed || typeof window === 'undefined' || typeof window.AudioContext !== 'function') {
      return null;
    }

    context ??= new window.AudioContext();
    return context;
  };

  const stopActiveEffect = () => {
    if (activeEffect === null) return;

    const now = context?.currentTime ?? 0;
    activeEffect.gain.gain.cancelScheduledValues(now);
    activeEffect.gain.gain.setValueAtTime(activeEffect.gain.gain.value, now);
    activeEffect.gain.gain.linearRampToValueAtTime(0, now + 0.04);

    for (const source of activeEffect.sources) {
      try {
        source.stop(now + 0.05);
      } catch {
        // A source may already have ended naturally.
      }
    }

    activeEffect = null;
  };

  const stopAmbience = () => {
    if (ambienceGraph === null) return;

    const now = context?.currentTime ?? 0;
    ambienceGraph.gain.gain.cancelScheduledValues(now);
    ambienceGraph.gain.gain.setValueAtTime(ambienceGraph.gain.gain.value, now);
    ambienceGraph.gain.gain.linearRampToValueAtTime(0, now + 0.22);

    for (const source of ambienceGraph.sources) {
      try {
        source.stop(now + 0.24);
      } catch {
        // A source may already have stopped while the document was hidden.
      }
    }

    ambienceGraph = null;
  };

  const startAmbience = () => {
    const audioContext = context;
    if (
      audioContext?.state !== 'running' ||
      !preferences.hqAmbience ||
      !ambienceRequested ||
      ambienceGraph !== null
    ) {
      return;
    }

    const now = audioContext.currentTime;
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(MASTER_AMBIENCE_GAIN * ambienceGainScale, now + 0.9);
    gain.connect(audioContext.destination);

    const sources: AudioScheduledSourceNode[] = [];

    // A quiet room-tone layer survives small tablet speakers better than a low continuous drone.
    const noiseBuffer = audioContext.createBuffer(
      1,
      audioContext.sampleRate * 2,
      audioContext.sampleRate
    );
    const noiseData = noiseBuffer.getChannelData(0);
    let seed = 0x5a17;
    for (let index = 0; index < noiseData.length; index += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      noiseData[index] = ((seed / 0xffffffff) * 2 - 1) * 0.22;
    }
    const noise = audioContext.createBufferSource();
    const noiseFilter = audioContext.createBiquadFilter();
    const noiseGain = audioContext.createGain();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(520, now);
    noiseFilter.Q.setValueAtTime(0.45, now);
    noiseGain.gain.setValueAtTime(0.18, now);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(gain);
    noise.start(now);
    sources.push(noise);

    // Two close carriers create very slow movement without turning the ambience into music.
    for (const [frequency, level] of [
      [188, 0.12],
      [190.4, 0.08],
      [376, 0.035]
    ] as const) {
      const oscillator = audioContext.createOscillator();
      const voiceGain = audioContext.createGain();
      oscillator.type = frequency > 300 ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(frequency, now);
      voiceGain.gain.setValueAtTime(level, now);
      oscillator.connect(voiceGain);
      voiceGain.connect(gain);
      oscillator.start(now);
      sources.push(oscillator);
    }

    const lfo = audioContext.createOscillator();
    const lfoGain = audioContext.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.045, now);
    lfoGain.gain.setValueAtTime(42, now);
    lfo.connect(lfoGain);
    lfoGain.connect(noiseFilter.frequency);
    lfo.start(now);
    sources.push(lfo);

    ambienceGraph = { gain, sources };
  };

  const updateAmbienceGain = () => {
    if (ambienceGraph === null || context === null) return;

    const now = context.currentTime;
    ambienceGraph.gain.gain.cancelScheduledValues(now);
    ambienceGraph.gain.gain.setValueAtTime(ambienceGraph.gain.gain.value, now);
    ambienceGraph.gain.gain.linearRampToValueAtTime(
      MASTER_AMBIENCE_GAIN * ambienceGainScale,
      now + 0.35
    );
  };

  const addTone = (
    audioContext: AudioContext,
    sources: AudioScheduledSourceNode[],
    start: number,
    destination: AudioNode,
    frequency: number,
    duration: number,
    level: number,
    type: OscillatorType = 'sine',
    endFrequency = frequency
  ) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(level, start + Math.min(0.035, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
    sources.push(oscillator);
  };

  const addNoiseBurst = (
    audioContext: AudioContext,
    sources: AudioScheduledSourceNode[],
    start: number,
    destination: AudioNode,
    duration: number,
    level: number,
    startFrequency: number,
    endFrequency: number
  ) => {
    const frameCount = Math.max(1, Math.ceil(audioContext.sampleRate * duration));
    const buffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 0x0f51;
    for (let index = 0; index < frameCount; index += 1) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      data[index] = (seed / 0xffffffff) * 2 - 1;
    }

    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const burstGain = audioContext.createGain();
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(1.2, start);
    filter.frequency.setValueAtTime(startFrequency, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    burstGain.gain.setValueAtTime(0.0001, start);
    burstGain.gain.linearRampToValueAtTime(level, start + Math.min(0.09, duration * 0.25));
    burstGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(burstGain);
    burstGain.connect(destination);
    source.start(start);
    source.stop(start + duration + 0.02);
    sources.push(source);
  };

  const withEffectGraph = (
    duration: number,
    build: (
      audioContext: AudioContext,
      sources: AudioScheduledSourceNode[],
      start: number,
      gain: GainNode
    ) => void
  ) => {
    const audioContext = context;
    if (audioContext?.state !== 'running' || !preferences.soundEffects) {
      return;
    }

    stopActiveEffect();

    const start = audioContext.currentTime + 0.015;
    const gain = audioContext.createGain();
    const sources: AudioScheduledSourceNode[] = [];
    gain.gain.setValueAtTime(MASTER_EFFECT_GAIN, start);
    gain.connect(audioContext.destination);

    build(audioContext, sources, start, gain);
    activeEffect = { gain, sources };

    window.setTimeout(
      () => {
        if (activeEffect?.gain === gain) activeEffect = null;
        gain.disconnect();
      },
      Math.ceil((duration + 0.15) * 1000)
    );
  };

  const playIncomingTransmission = () => {
    withEffectGraph(0.62, (audioContext, sources, start, gain) => {
      addTone(audioContext, sources, start, gain, 540, 0.24, 0.42, 'sine', 650);
      addTone(audioContext, sources, start + 0.24, gain, 690, 0.32, 0.34, 'sine', 820);
      addTone(audioContext, sources, start + 0.08, gain, 1080, 0.16, 0.09, 'triangle', 960);
    });
  };

  const playEvidenceRecorded = () => {
    withEffectGraph(0.48, (audioContext, sources, start, gain) => {
      addTone(audioContext, sources, start, gain, 430, 0.28, 0.32, 'sine', 510);
      addTone(audioContext, sources, start + 0.1, gain, 650, 0.34, 0.24, 'sine', 760);
    });
  };

  const playFlagVerified = () => {
    withEffectGraph(0.92, (audioContext, sources, start, gain) => {
      addTone(audioContext, sources, start, gain, 392, 0.34, 0.28, 'sine', 440);
      addTone(audioContext, sources, start + 0.18, gain, 523.25, 0.42, 0.3, 'sine', 587.33);
      addTone(audioContext, sources, start + 0.36, gain, 659.25, 0.5, 0.32, 'sine', 783.99);
    });
  };

  const playMissionComplete = () => {
    withEffectGraph(1.38, (audioContext, sources, start, gain) => {
      addTone(audioContext, sources, start, gain, 329.63, 0.58, 0.2, 'sine', 392);
      addTone(audioContext, sources, start + 0.17, gain, 493.88, 0.72, 0.24, 'sine', 587.33);
      addTone(audioContext, sources, start + 0.34, gain, 659.25, 0.9, 0.25, 'sine', 783.99);
      addTone(audioContext, sources, start + 0.58, gain, 987.77, 0.7, 0.1, 'triangle', 1174.66);
    });
  };

  const playIntrusionAnomaly = () => {
    withEffectGraph(3.25, (audioContext, sources, start, gain) => {
      // Dark, unresolved signal pressure: low dissonance and interference, never an arcade alarm.
      addNoiseBurst(audioContext, sources, start, gain, 0.78, 0.4, 1450, 210);
      addTone(audioContext, sources, start, gain, 224, 0.9, 0.5, 'sawtooth', 128);
      addTone(audioContext, sources, start + 0.035, gain, 148, 1.32, 0.34, 'triangle', 96);

      // Close carriers beat against each other to keep the captured signal uneasy rather than melodic.
      addTone(audioContext, sources, start + 0.28, gain, 196, 2.42, 0.18, 'triangle', 154);
      addTone(audioContext, sources, start + 0.28, gain, 203.5, 2.4, 0.15, 'sine', 160.5);
      addTone(audioContext, sources, start + 0.4, gain, 293, 2.05, 0.1, 'sawtooth', 239);
      addNoiseBurst(audioContext, sources, start + 0.45, gain, 2.34, 0.2, 680, 190);

      // A second pressure wave lands as the trace fails, then leaves an unresolved low tail.
      addNoiseBurst(audioContext, sources, start + 1.62, gain, 0.7, 0.3, 980, 150);
      addTone(audioContext, sources, start + 1.6, gain, 176, 0.92, 0.34, 'sawtooth', 101);
      addTone(audioContext, sources, start + 2.18, gain, 136, 0.94, 0.22, 'triangle', 101);
      addTone(audioContext, sources, start + 2.18, gain, 143.5, 0.92, 0.17, 'sine', 106.5);
      addNoiseBurst(audioContext, sources, start + 2.58, gain, 0.52, 0.13, 430, 150);
    });
  };

  const playOperationClosed = () => {
    withEffectGraph(1.72, (audioContext, sources, start, gain) => {
      addTone(audioContext, sources, start, gain, 293.66, 0.48, 0.2, 'sine', 329.63);
      addTone(audioContext, sources, start + 0.18, gain, 440, 0.62, 0.25, 'sine', 493.88);
      addTone(audioContext, sources, start + 0.38, gain, 587.33, 0.82, 0.28, 'sine', 659.25);
      addTone(audioContext, sources, start + 0.7, gain, 880, 0.9, 0.12, 'triangle', 987.77);
      addNoiseBurst(audioContext, sources, start + 0.02, gain, 0.34, 0.055, 720, 320);
    });
  };

  const playDeployOperation = () => {
    withEffectGraph(0.58, (audioContext, sources, start, gain) => {
      addNoiseBurst(audioContext, sources, start, gain, 0.24, 0.08, 520, 260);
      addTone(audioContext, sources, start, gain, 246.94, 0.34, 0.2, 'triangle', 329.63);
      addTone(audioContext, sources, start + 0.12, gain, 493.88, 0.38, 0.16, 'sine', 659.25);
    });
  };

  const playUiConfirm = () => {
    withEffectGraph(0.16, (audioContext, sources, start, gain) => {
      addTone(audioContext, sources, start, gain, 760, 0.11, 0.12, 'triangle', 900);
      addTone(audioContext, sources, start + 0.025, gain, 1140, 0.1, 0.045, 'sine', 1020);
    });
  };

  const playBytePing = () => {
    withEffectGraph(0.34, (audioContext, sources, start, gain) => {
      addTone(audioContext, sources, start, gain, 680, 0.18, 0.14, 'sine', 790);
      addTone(audioContext, sources, start + 0.12, gain, 940, 0.2, 0.11, 'sine', 1080);
    });
  };

  const playCue = (cue: AudioCue) => {
    if (disposed || !preferences.soundEffects) return;

    const audioContext = ensureContext();
    if (audioContext === null) return;

    const play = () => {
      switch (cue) {
        case 'incoming-transmission':
          playIncomingTransmission();
          break;
        case 'evidence-recorded':
          playEvidenceRecorded();
          break;
        case 'flag-verified':
          playFlagVerified();
          break;
        case 'mission-complete':
          playMissionComplete();
          break;
        case 'operation-closed':
          playOperationClosed();
          break;
        case 'deploy-operation':
          playDeployOperation();
          break;
        case 'intrusion-anomaly':
          playIntrusionAnomaly();
          break;
        case 'ui-confirm':
          playUiConfirm();
          break;
        case 'byte-ping':
          playBytePing();
          break;
      }
    };

    if (audioContext.state === 'running') {
      play();
      return;
    }

    void audioContext
      .resume()
      .then(play)
      .catch(() => undefined);
  };

  return {
    unlock() {
      const audioContext = ensureContext();
      if (audioContext === null) return;

      void audioContext
        .resume()
        .then(() => startAmbience())
        .catch(() => undefined);
    },
    setPreferences(nextPreferences) {
      preferences = nextPreferences;
      if (!preferences.soundEffects) stopActiveEffect();
      if (!preferences.hqAmbience) {
        stopAmbience();
      } else {
        startAmbience();
      }
    },
    setAmbienceActive(active, gainScale = 1) {
      ambienceRequested = active;
      ambienceGainScale = Math.min(1, Math.max(0, gainScale));
      if (!active) {
        stopAmbience();
      } else if (ambienceGraph === null) {
        startAmbience();
      } else {
        updateAmbienceGain();
      }
    },
    playCue,
    dispose() {
      if (disposed) return;
      disposed = true;
      stopActiveEffect();
      stopAmbience();
      if (context !== null) void context.close().catch(() => undefined);
      context = null;
    }
  };
}
