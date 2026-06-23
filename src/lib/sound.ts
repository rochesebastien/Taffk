// Short chimes synthesized on the fly (Web Audio API) so we ship no audio asset.
import { useSettings } from './settings';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

type Note = { freq: number; at: number; dur: number };

function chime(notes: Note[], volume: number) {
  const ac = audio();
  if (!ac || volume <= 0) return;
  const peak = 0.6 * volume;
  for (const { freq, at, dur } of notes) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const t = ac.currentTime + at;
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur);
  }
}

// Slice ended, more to come: gentle two-note rise.
const SLICE: Note[] = [
  { freq: 660, at: 0, dur: 0.25 },
  { freq: 880, at: 0.16, dur: 0.3 },
];

// Whole session over: brighter three-note flourish.
const SESSION: Note[] = [
  { freq: 660, at: 0, dur: 0.25 },
  { freq: 880, at: 0.16, dur: 0.25 },
  { freq: 1175, at: 0.32, dur: 0.4 },
];

export function playSliceDone() {
  const s = useSettings.getState();
  if (s.pomodoroSound) chime(SLICE, s.pomodoroVolume);
}

export function playSessionDone() {
  const s = useSettings.getState();
  if (s.pomodoroSound) chime(SESSION, s.pomodoroVolume);
}

// Preview from settings — plays regardless of the on/off toggle.
export function playTestSound(volume?: number) {
  chime(SESSION, volume ?? useSettings.getState().pomodoroVolume);
}
