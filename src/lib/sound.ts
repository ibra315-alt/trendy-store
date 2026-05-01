type SoundType = "tap" | "success" | "error" | "open" | "close";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx || ctx.state === "closed") {
      ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return ctx;
  } catch {
    return null;
  }
}

function playTone(
  freq: number,
  endFreq: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine",
  delay = 0,
) {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.01);
}

function haptic(ms = 6) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch { /* ignore */ }
}

export function playSound(type: SoundType = "tap") {
  try {
    switch (type) {
      // ─── Navigation tap — crisp double-click feel
      case "tap":
        haptic(6);
        playTone(680, 420, 0.055, 0.07, "sine");
        playTone(820, 520, 0.035, 0.04, "sine", 0.01);
        break;

      // ─── Success (save / create) — rising soft chime
      case "success":
        haptic(8);
        playTone(440, 660, 0.07, 0.06, "sine");
        playTone(550, 880, 0.09, 0.045, "sine", 0.06);
        break;

      // ─── Error — soft descending thud
      case "error":
        haptic(12);
        playTone(320, 180, 0.1, 0.08, "sine");
        break;

      // ─── Open modal / sheet — subtle whoosh up
      case "open":
        haptic(5);
        playTone(300, 520, 0.08, 0.05, "sine");
        break;

      // ─── Close modal / sheet — subtle whoosh down
      case "close":
        haptic(5);
        playTone(520, 300, 0.07, 0.05, "sine");
        break;
    }
  } catch {
    // ignore — sound not critical
  }
}
