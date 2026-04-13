#!/usr/bin/env node
/**
 * Generates subtle notification WAV sounds for call state changes.
 * Run: node scripts/generate-sounds.js
 */

const fs = require('fs')
const path = require('path')

const SAMPLE_RATE = 44100
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'sounds')

function writeWav(filePath, samples) {
  const numSamples = samples.length
  const byteRate = SAMPLE_RATE * 2 // 16-bit mono
  const dataSize = numSamples * 2
  const buffer = Buffer.alloc(44 + dataSize)

  // RIFF header
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)

  // fmt chunk
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16) // chunk size
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(1, 22) // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(byteRate, 28)
  buffer.writeUInt16LE(2, 32) // block align
  buffer.writeUInt16LE(16, 34) // bits per sample

  // data chunk
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  for (let i = 0; i < numSamples; i++) {
    const val = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE(Math.round(val * 32767), 44 + i * 2)
  }

  fs.writeFileSync(filePath, buffer)
  console.log(`Written: ${filePath} (${(dataSize / 1024).toFixed(1)} KB, ${(numSamples / SAMPLE_RATE).toFixed(2)}s)`)
}

function fadeEnvelope(t, duration, fadeIn, fadeOut) {
  if (t < fadeIn) return t / fadeIn
  if (t > duration - fadeOut) return (duration - t) / fadeOut
  return 1
}

// --- Call Join: two-tone ascending chime (C5 -> E5), ~0.3s, gentle ---
function generateJoinSound() {
  const duration = 0.3
  const numSamples = Math.floor(SAMPLE_RATE * duration)
  const samples = new Float64Array(numSamples)
  const volume = 0.25

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE
    const env = fadeEnvelope(t, duration, 0.01, 0.08)

    // First tone: C5 (523 Hz) for first half
    // Second tone: E5 (659 Hz) for second half
    // With slight overlap
    let sample = 0
    if (t < 0.17) {
      const localEnv = fadeEnvelope(t, 0.17, 0.01, 0.04)
      sample += Math.sin(2 * Math.PI * 523 * t) * localEnv * 0.7
      // Add subtle harmonic
      sample += Math.sin(2 * Math.PI * 1046 * t) * localEnv * 0.15
    }
    if (t > 0.12) {
      const lt = t - 0.12
      const localEnv = fadeEnvelope(lt, 0.18, 0.01, 0.06)
      sample += Math.sin(2 * Math.PI * 659 * t) * localEnv * 0.8
      sample += Math.sin(2 * Math.PI * 1318 * t) * localEnv * 0.15
    }

    samples[i] = sample * volume * env
  }

  writeWav(path.join(OUTPUT_DIR, 'call-join.wav'), samples)
}

// --- Call End: descending two-tone (E5 -> C5), ~0.3s ---
function generateEndSound() {
  const duration = 0.35
  const numSamples = Math.floor(SAMPLE_RATE * duration)
  const samples = new Float64Array(numSamples)
  const volume = 0.2

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE
    const env = fadeEnvelope(t, duration, 0.01, 0.1)

    let sample = 0
    // First tone: E5 (659 Hz)
    if (t < 0.19) {
      const localEnv = fadeEnvelope(t, 0.19, 0.01, 0.04)
      sample += Math.sin(2 * Math.PI * 659 * t) * localEnv * 0.7
      sample += Math.sin(2 * Math.PI * 1318 * t) * localEnv * 0.1
    }
    // Second tone: C5 (523 Hz)
    if (t > 0.14) {
      const lt = t - 0.14
      const localEnv = fadeEnvelope(lt, 0.21, 0.01, 0.08)
      sample += Math.sin(2 * Math.PI * 523 * t) * localEnv * 0.6
      sample += Math.sin(2 * Math.PI * 1046 * t) * localEnv * 0.1
    }

    samples[i] = sample * volume * env
  }

  writeWav(path.join(OUTPUT_DIR, 'call-end.wav'), samples)
}

// --- Thinking pulse: soft, low hum/pulse ~0.6s that loops smoothly ---
function generateThinkingSound() {
  const duration = 0.8
  const numSamples = Math.floor(SAMPLE_RATE * duration)
  const samples = new Float64Array(numSamples)
  const volume = 0.12

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE

    // Smooth fade for seamless looping
    const loopEnv = Math.sin(Math.PI * t / duration)

    // Soft, warm tone — A4 (440 Hz) with gentle modulation
    const modFreq = 2.5 // slow pulse
    const mod = 0.5 + 0.5 * Math.sin(2 * Math.PI * modFreq * t)

    let sample = 0
    sample += Math.sin(2 * Math.PI * 440 * t) * 0.5
    sample += Math.sin(2 * Math.PI * 880 * t) * 0.15
    sample += Math.sin(2 * Math.PI * 330 * t) * 0.2 // warm sub

    samples[i] = sample * volume * loopEnv * mod
  }

  writeWav(path.join(OUTPUT_DIR, 'thinking.wav'), samples)
}

// Generate all sounds
generateJoinSound()
generateEndSound()
generateThinkingSound()
console.log('\nAll sounds generated!')
