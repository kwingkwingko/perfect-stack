#!/usr/bin/env node
/**
 * generate-music.js
 * Procedurally generates two small WAV loops for Stack Dash:
 *   assets/menu-music.wav  — calm ambient arpeggio (~10 s, 80 BPM)
 *   assets/game-music.wav  — energetic rhythmic loop (~8 s, 140 BPM)
 *
 * Run once:  node scripts/generate-music.js
 */

const fs = require("fs");
const path = require("path");

// ── Audio params ──────────────────────────────────────────────────────────────
const SAMPLE_RATE = 22050; // lower rate = smaller files, fine for simple synth
const BITS = 16;
const NUM_CH = 1;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Concert-pitch frequency for a MIDI note number. */
const midiFreq = (n) => 440 * Math.pow(2, (n - 69) / 12);

/** Clamp a float sample to [-1, 1]. */
const clamp = (v) => Math.max(-1, Math.min(1, v));

/** Simple ADSR envelope (returns multiplier 0–1). */
function adsr(t, dur, a, d, s, r) {
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < dur - r) return s;
  if (t < dur) return s * (1 - (t - (dur - r)) / r);
  return 0;
}

/** Sine oscillator. */
const sine = (phase) => Math.sin(2 * Math.PI * phase);

/** Square wave. */
const square = (phase) => (phase % 1 < 0.5 ? 0.4 : -0.4);

/** Simple noise burst for percussion. */
const noise = () => Math.random() * 2 - 1;

/** Write a complete WAV buffer from float samples in [-1,1]. */
function buildWav(samples) {
  const numSamples = samples.length;
  const byteRate = SAMPLE_RATE * NUM_CH * (BITS / 8);
  const blockAlign = NUM_CH * (BITS / 8);
  const dataSize = numSamples * blockAlign;
  const buf = Buffer.alloc(44 + dataSize);

  // RIFF header
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);

  // fmt chunk
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(NUM_CH, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(BITS, 34);

  // data chunk
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const s = clamp(samples[i]);
    const val = Math.round(s * 32767);
    buf.writeInt16LE(val, 44 + i * 2);
  }
  return buf;
}

/** Apply a short crossfade at loop boundaries so it loops seamlessly. */
function crossfade(samples, fadeSamples) {
  const n = samples.length;
  for (let i = 0; i < fadeSamples; i++) {
    const t = i / fadeSamples;
    // Blend tail into head
    samples[i] = samples[i] * t + samples[n - fadeSamples + i] * (1 - t);
  }
  // Trim the tail fade region
  return samples.slice(0, n - fadeSamples);
}

// ── Menu Music ────────────────────────────────────────────────────────────────
// Calm, dreamy arpeggio: C4-E4-G4-C5 cycling slowly with reverb-like echoes.

function generateMenuMusic() {
  const bpm = 76;
  const beatSec = 60 / bpm;
  const noteDur = beatSec * 0.9;
  // C major arpeggio pattern (MIDI notes), 2 octaves
  const pattern = [60, 64, 67, 72, 67, 64, 60, 55, 59, 55];
  const totalBeats = pattern.length * 3; // repeat pattern 3 times
  const duration = totalBeats * beatSec;
  const numSamples = Math.ceil(duration * SAMPLE_RATE);
  const samples = new Float64Array(numSamples);

  for (let rep = 0; rep < 3; rep++) {
    for (let n = 0; n < pattern.length; n++) {
      const beatIdx = rep * pattern.length + n;
      const startSec = beatIdx * beatSec;
      const freq = midiFreq(pattern[n]);
      const startSamp = Math.floor(startSec * SAMPLE_RATE);

      for (let i = 0; i < Math.floor(noteDur * SAMPLE_RATE); i++) {
        const idx = startSamp + i;
        if (idx >= numSamples) break;
        const t = i / SAMPLE_RATE;
        const env = adsr(t, noteDur, 0.08, 0.15, 0.35, 0.3);
        // Layered sines for richness (fundamental + soft octave + fifth)
        const phase = freq * t;
        const s =
          sine(phase) * 0.45 +
          sine(phase * 2) * 0.15 +
          sine(phase * 1.498) * 0.1; // slightly detuned fifth
        samples[idx] += s * env * 0.35;
      }
    }
  }

  // Simple echo (delay ~200ms)
  const delaySamples = Math.floor(0.2 * SAMPLE_RATE);
  for (let i = delaySamples; i < numSamples; i++) {
    samples[i] += samples[i - delaySamples] * 0.25;
  }

  // Crossfade for seamless loop
  const result = crossfade(Array.from(samples), Math.floor(0.3 * SAMPLE_RATE));
  return buildWav(result);
}

// ── Game Music ────────────────────────────────────────────────────────────────
// Energetic: kick + hi-hat rhythm with a simple pentatonic melody.

function generateGameMusic() {
  const bpm = 138;
  const beatSec = 60 / bpm;
  const eighthSec = beatSec / 2;
  const bars = 4;
  const beatsPerBar = 4;
  const totalEighths = bars * beatsPerBar * 2;
  const duration = totalEighths * eighthSec;
  const numSamples = Math.ceil(duration * SAMPLE_RATE);
  const samples = new Float64Array(numSamples);

  // ---- Drums ----
  for (let e = 0; e < totalEighths; e++) {
    const startSec = e * eighthSec;
    const startSamp = Math.floor(startSec * SAMPLE_RATE);
    const isDownbeat = e % 4 === 0; // kick on beats 1 & 3
    const isSnare = e % 8 === 4; // snare on beat 2 & 4

    // Hi-hat on every eighth note
    const hhDur = 0.05;
    for (let i = 0; i < Math.floor(hhDur * SAMPLE_RATE); i++) {
      const idx = startSamp + i;
      if (idx >= numSamples) break;
      const t = i / SAMPLE_RATE;
      const env = Math.exp(-t * 60);
      samples[idx] += noise() * env * 0.12;
    }

    // Kick
    if (isDownbeat) {
      const kickDur = 0.15;
      for (let i = 0; i < Math.floor(kickDur * SAMPLE_RATE); i++) {
        const idx = startSamp + i;
        if (idx >= numSamples) break;
        const t = i / SAMPLE_RATE;
        const env = Math.exp(-t * 20);
        // Pitch-dropping sine for punchy kick
        const freq = 150 * Math.exp(-t * 15) + 40;
        samples[idx] += sine(freq * t) * env * 0.5;
      }
    }

    // Snare (noise + tone)
    if (isSnare) {
      const snareDur = 0.1;
      for (let i = 0; i < Math.floor(snareDur * SAMPLE_RATE); i++) {
        const idx = startSamp + i;
        if (idx >= numSamples) break;
        const t = i / SAMPLE_RATE;
        const env = Math.exp(-t * 30);
        samples[idx] += (noise() * 0.6 + sine(200 * t) * 0.3) * env * 0.3;
      }
    }
  }

  // ---- Bass line (every beat) ----
  // Simple pattern: C2, C2, Eb2, F2 (repeated per bar)
  const bassNotes = [36, 36, 39, 41]; // MIDI
  for (let bar = 0; bar < bars; bar++) {
    for (let beat = 0; beat < beatsPerBar; beat++) {
      const startSec = (bar * beatsPerBar + beat) * beatSec;
      const startSamp = Math.floor(startSec * SAMPLE_RATE);
      const freq = midiFreq(bassNotes[beat % bassNotes.length]);
      const noteDur = beatSec * 0.8;
      for (let i = 0; i < Math.floor(noteDur * SAMPLE_RATE); i++) {
        const idx = startSamp + i;
        if (idx >= numSamples) break;
        const t = i / SAMPLE_RATE;
        const env = adsr(t, noteDur, 0.01, 0.05, 0.6, 0.1);
        samples[idx] += sine(freq * t) * env * 0.3;
      }
    }
  }

  // ---- Melody (pentatonic, every eighth note, some rests) ----
  // C minor pentatonic: C4, Eb4, F4, G4, Bb4
  const melodyMidi = [60, 63, 65, 67, 70];
  // Simple pattern index sequence (some -1 for rests)
  const melodySeq = [0, -1, 2, 1, 3, -1, 4, 3, 2, -1, 1, 0, 3, 4, -1, 2,
                     0, 2, -1, 3, 4, -1, 2, 1, 0, -1, 3, 4, 2, 1, -1, 0];
  for (let e = 0; e < totalEighths; e++) {
    const noteIdx = melodySeq[e % melodySeq.length];
    if (noteIdx < 0) continue;
    const freq = midiFreq(melodyMidi[noteIdx]);
    const startSec = e * eighthSec;
    const startSamp = Math.floor(startSec * SAMPLE_RATE);
    const noteDur = eighthSec * 0.75;
    for (let i = 0; i < Math.floor(noteDur * SAMPLE_RATE); i++) {
      const idx = startSamp + i;
      if (idx >= numSamples) break;
      const t = i / SAMPLE_RATE;
      const env = adsr(t, noteDur, 0.01, 0.04, 0.5, 0.05);
      samples[idx] += square(freq * t) * env * 0.18;
    }
  }

  // Light delay
  const delaySamples = Math.floor(eighthSec * 0.75 * SAMPLE_RATE);
  for (let i = delaySamples; i < numSamples; i++) {
    samples[i] += samples[i - delaySamples] * 0.15;
  }

  const result = crossfade(Array.from(samples), Math.floor(0.15 * SAMPLE_RATE));
  return buildWav(result);
}

// ── Game Over Music ──────────────────────────────────────────────────────────
// Short Mario-style game-over jingle (~2.5 seconds).

function generateGameOverMusic() {
  const duration = 2.5;
  const numSamples = Math.ceil(duration * SAMPLE_RATE);
  const samples = new Float64Array(numSamples);

  // Fast descending staccato notes: B4, Bb4, A4, Ab4
  const fastNotes = [71, 70, 69, 68];
  const fastNoteDur = 0.12;
  const fastGap = 0.15;

  for (let n = 0; n < fastNotes.length; n++) {
    const freq = midiFreq(fastNotes[n]);
    const startSec = n * fastGap;
    const startSamp = Math.floor(startSec * SAMPLE_RATE);
    for (let i = 0; i < Math.floor(fastNoteDur * SAMPLE_RATE); i++) {
      const idx = startSamp + i;
      if (idx >= numSamples) break;
      const t = i / SAMPLE_RATE;
      const env = adsr(t, fastNoteDur, 0.005, 0.02, 0.6, 0.04);
      samples[idx] += square(freq * t) * env * 0.35;
      samples[idx] += sine(freq * 0.5 * t) * env * 0.2;
    }
  }

  // Pause, then two low resolve notes: D3 (short) then C3 (long fade)
  const resolveNotes = [
    { midi: 50, start: 0.75, dur: 0.3 },
    { midi: 48, start: 1.1,  dur: 1.2 },
  ];

  for (const note of resolveNotes) {
    const freq = midiFreq(note.midi);
    const startSamp = Math.floor(note.start * SAMPLE_RATE);
    for (let i = 0; i < Math.floor(note.dur * SAMPLE_RATE); i++) {
      const idx = startSamp + i;
      if (idx >= numSamples) break;
      const t = i / SAMPLE_RATE;
      const env = adsr(t, note.dur, 0.01, 0.1, 0.4, note.dur * 0.6);
      samples[idx] += sine(freq * t) * env * 0.25;
      samples[idx] += sine(freq * 1.005 * t) * env * 0.25;
      samples[idx] += square(freq * t) * env * 0.1;
    }
  }

  // Light reverb (~150ms)
  const delaySamples = Math.floor(0.15 * SAMPLE_RATE);
  for (let i = delaySamples; i < numSamples; i++) {
    samples[i] += samples[i - delaySamples] * 0.2;
  }

  return buildWav(Array.from(samples));
}

// ── Stack Sound Effect ───────────────────────────────────────────────────────
// Short thud/click for normal block placement (~0.1s).

function generateStackSound() {
  const duration = 0.12;
  const numSamples = Math.ceil(duration * SAMPLE_RATE);
  const samples = new Float64Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    // Body: low sine thud, pitch drops from 180 Hz to 80 Hz
    const freq = 180 * Math.exp(-t * 8) + 80;
    const body = sine(freq * t) * Math.exp(-t * 35) * 0.6;
    // Click: short noise transient in first 5 ms
    const click = t < 0.005 ? noise() * (1 - t / 0.005) * 0.3 : 0;
    samples[i] = clamp(body + click);
  }

  return buildWav(Array.from(samples));
}

// ── Perfect Sound Effect ─────────────────────────────────────────────────────
// Crunchy impact + shimmer for perfect placement (~0.35s).

function generatePerfectSound() {
  const duration = 0.35;
  const numSamples = Math.ceil(duration * SAMPLE_RATE);
  const samples = new Float64Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    // Layer 1: noise crunch burst
    const crunch = noise() * Math.exp(-t * 25) * 0.4;
    // Layer 2: tonal sweep 800→200 Hz
    const sweepFreq = 800 * Math.exp(-t * 5) + 200;
    const sweep = sine(sweepFreq * t) * Math.exp(-t * 12) * 0.35;
    // Layer 3: high shimmer at ~2 kHz
    const shimmer = sine(2000 * t) * Math.exp(-t * 8) * 0.15;
    // Layer 4: sub-bass thump for weight
    const sub = sine(60 * t) * Math.exp(-t * 20) * 0.25;
    samples[i] = clamp(crunch + sweep + shimmer + sub);
  }

  return buildWav(Array.from(samples));
}

// ── Write files ───────────────────────────────────────────────────────────────

const assetsDir = path.join(__dirname, "..", "assets");
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

const menuBuf = generateMenuMusic();
const menuPath = path.join(assetsDir, "menu-music.wav");
fs.writeFileSync(menuPath, menuBuf);
console.log(`Wrote ${menuPath} (${menuBuf.length} bytes)`);

const gameBuf = generateGameMusic();
const gamePath = path.join(assetsDir, "game-music.wav");
fs.writeFileSync(gamePath, gameBuf);
console.log(`Wrote ${gamePath} (${gameBuf.length} bytes)`);

const gameOverBuf = generateGameOverMusic();
const gameOverPath = path.join(assetsDir, "gameover-music.wav");
fs.writeFileSync(gameOverPath, gameOverBuf);
console.log(`Wrote ${gameOverPath} (${gameOverBuf.length} bytes)`);

const stackBuf = generateStackSound();
const stackPath = path.join(assetsDir, "stack-sound.wav");
fs.writeFileSync(stackPath, stackBuf);
console.log(`Wrote ${stackPath} (${stackBuf.length} bytes)`);

const perfectBuf = generatePerfectSound();
const perfectPath = path.join(assetsDir, "perfect-sound.wav");
fs.writeFileSync(perfectPath, perfectBuf);
console.log(`Wrote ${perfectPath} (${perfectBuf.length} bytes)`);

console.log("Done! All music & sound files generated in assets/");
