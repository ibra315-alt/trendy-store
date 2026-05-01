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
      // ─── Navigation tap — clean double-tick
      case "tap":
        haptic(8);
        playTone(900, 600, 0.07, 0.18, "sine");
        playTone(1100, 700, 0.05, 0.12, "sine", 0.04);
        break;

      // ─── Success — bright rising chime
      case "success":
        haptic(10);
        playTone(520, 780, 0.09, 0.18, "sine");
        playTone(660, 1040, 0.11, 0.14, "sine", 0.07);
        break;

      // ─── Error — low descending thud
      case "error":
        haptic(15);
        playTone(380, 200, 0.13, 0.22, "sine");
        break;

      // ─── Open modal — quick ascending pop
      case "open":
        haptic(6);
        playTone(420, 720, 0.09, 0.2, "sine");
        break;

      // ─── Close modal — quick descending pop
      case "close":
        haptic(6);
        playTone(720, 420, 0.08, 0.18, "sine");
        break;
    }
  } catch {
    // ignore — sound not critical
  }
}
