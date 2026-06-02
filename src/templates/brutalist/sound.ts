"use client";

/*
 * Generative sound module for the brutalist template.
 *
 * Rather than ship MP3s for click/thunk SFX, we synthesize them with the
 * Web Audio API. Costs zero bytes, sounds exactly the same in every
 * browser, and gives us per-pitch control.
 *
 * Two sounds:
 *   - click(): short bright tick on hovering interactive elements (200Hz,
 *     30ms). Used sparingly — only on .cardHover entry, not every hover.
 *   - thunk(): low percussive hit on click actions (90Hz, 80ms). The
 *     "physical button being pressed" feedback.
 *
 * AudioContext is created lazily on first user interaction (browser autoplay
 * policies require a user gesture before audio can start). Subsequent calls
 * reuse the same context.
 *
 * The whole module is opt-in via a `enabled` flag passed from the parent.
 * The first click of the page is silent because the AudioContext is being
 * created — that's an acceptable trade for not asking permission.
 */

let ctx: AudioContext | null = null;
let enabled = false;

function ensureCtx(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === "undefined") return null;
  try {
    const Ctor =
      window.AudioContext ||
      (window as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

interface PlayOpts {
  freq: number;
  duration: number; // seconds
  type?: OscillatorType;
  gain?: number;
}

function play({ freq, duration, type = "square", gain = 0.05 }: PlayOpts) {
  if (!enabled) return;
  const c = ensureCtx();
  if (!c) return;

  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);

  // Quick attack, exponential decay — feels like a real click.
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);

  osc.connect(g);
  g.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

export const sfx = {
  setEnabled(value: boolean) {
    enabled = value;
  },
  enabled() {
    return enabled;
  },
  /** Short bright tick. Use on hover-enter for interactive elements. */
  click() {
    play({ freq: 1800, duration: 0.03, type: "square", gain: 0.025 });
  },
  /** Low percussive hit. Use on click of buttons / nav items. */
  thunk() {
    play({ freq: 90, duration: 0.08, type: "sine", gain: 0.08 });
  },
};