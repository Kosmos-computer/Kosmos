/**
 * Lightweight piano synth via Web Audio API.
 * Triangle + soft sine partials with a short attack and exponential release.
 */

type ActiveVoice = {
  oscillators: OscillatorNode[];
  gain: GainNode;
};

let sharedContext: AudioContext | null = null;
const activeVoices = new Map<string, ActiveVoice>();

function getContext(): AudioContext {
  if (!sharedContext) {
    sharedContext = new AudioContext();
  }
  return sharedContext;
}

export async function resumeAudio(): Promise<void> {
  const ctx = getContext();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
}

export function noteOn(id: string, frequency: number, velocity = 0.55): void {
  const ctx = getContext();
  void resumeAudio();

  // Retrigger: cut previous voice for this key.
  noteOff(id, 0.02);

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(velocity, now + 0.012);
  master.connect(ctx.destination);

  const oscillators: OscillatorNode[] = [];
  const partials: Array<{ type: OscillatorType; ratio: number; amp: number }> = [
    { type: "triangle", ratio: 1, amp: 0.7 },
    { type: "sine", ratio: 2, amp: 0.18 },
    { type: "sine", ratio: 3, amp: 0.08 },
  ];

  for (const partial of partials) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = partial.type;
    osc.frequency.setValueAtTime(frequency * partial.ratio, now);
    gain.gain.setValueAtTime(partial.amp, now);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    oscillators.push(osc);
  }

  activeVoices.set(id, { oscillators, gain: master });
}

export function noteOff(id: string, release = 0.28): void {
  const voice = activeVoices.get(id);
  if (!voice) return;
  activeVoices.delete(id);

  const ctx = getContext();
  const now = ctx.currentTime;
  const { gain, oscillators } = voice;

  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + release);

  for (const osc of oscillators) {
    try {
      osc.stop(now + release + 0.02);
    } catch {
      /* already stopped */
    }
  }

  window.setTimeout(() => {
    try {
      gain.disconnect();
    } catch {
      /* already disconnected */
    }
  }, (release + 0.05) * 1000);
}

export function releaseAll(): void {
  for (const id of [...activeVoices.keys()]) {
    noteOff(id);
  }
}
