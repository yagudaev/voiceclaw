#!/usr/bin/env node
/**
 * Generates VoiceClaw app icon programmatically using the canvas package.
 *
 * Design: five vertical waveform bars whose tops curve inward like claw tips,
 * merging the "voice waveform" and "claw" concepts into a single mark.
 * Rendered on a deep purple radial gradient background with a subtle glow.
 *
 * Run:  node scripts/generate-icon.js
 *
 * Outputs:
 *   assets/images/icon.png          — 1024x1024 (App Store / iOS)
 *   assets/images/adaptive-icon.png — 1024x1024 (Android adaptive foreground)
 *   assets/images/favicon.png       — 48x48     (web)
 *   assets/images/splash.png        — 1284x2778 (splash screen)
 *   assets/images/ios/              — All iOS icon sizes + Contents.json
 */

const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

// --- Brand colours (keep in sync with lib/brand.ts) ---
const GRADIENT_START = '#6C3CE0'
const GRADIENT_MID = '#7C3AED'
const GRADIENT_END = '#22D3EE'
const BG_DARK = '#0F0B1E'

const SIZE = 1024
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'images')
const IOS_OUTPUT_DIR = path.join(OUTPUT_DIR, 'ios')

// iOS icon sizes required for App Store and devices
const IOS_ICON_SIZES = [1024, 180, 167, 152, 120, 87, 80, 76, 60, 58, 40, 29, 20]

// -------------------------------------------------------
// Entry points
// -------------------------------------------------------
function generateMainIcon() {
  const canvas = createCanvas(SIZE, SIZE)
  const ctx = canvas.getContext('2d')

  drawBackground(ctx, SIZE)
  drawClawWaveform(ctx, SIZE)
  drawCenterGlow(ctx, SIZE)

  const buf = canvas.toBuffer('image/png')
  const out = path.join(OUTPUT_DIR, 'icon.png')
  fs.writeFileSync(out, buf)
  console.log(`Written: ${out} (${(buf.length / 1024).toFixed(1)} KB)`)
}

function generateAdaptiveIcon() {
  const canvas = createCanvas(SIZE, SIZE)
  const ctx = canvas.getContext('2d')

  drawBackground(ctx, SIZE)
  drawClawWaveform(ctx, SIZE)
  drawCenterGlow(ctx, SIZE)

  const buf = canvas.toBuffer('image/png')
  const out = path.join(OUTPUT_DIR, 'adaptive-icon.png')
  fs.writeFileSync(out, buf)
  console.log(`Written: ${out} (${(buf.length / 1024).toFixed(1)} KB)`)
}

function generateFavicon() {
  const favSize = 48
  const canvas = createCanvas(favSize, favSize)
  const ctx = canvas.getContext('2d')

  drawBackground(ctx, favSize)
  drawClawWaveform(ctx, favSize)

  const buf = canvas.toBuffer('image/png')
  const out = path.join(OUTPUT_DIR, 'favicon.png')
  fs.writeFileSync(out, buf)
  console.log(`Written: ${out} (${(buf.length / 1024).toFixed(1)} KB)`)
}

// -------------------------------------------------------
// Drawing helpers
// -------------------------------------------------------

function drawBackground(ctx, size) {
  const cx = size / 2
  const cy = size / 2

  // Solid dark base
  ctx.fillStyle = BG_DARK
  ctx.fillRect(0, 0, size, size)

  // Radial gradient — purple core fading to dark
  const grad = ctx.createRadialGradient(cx, cy, size * 0.02, cx, cy, size * 0.7)
  grad.addColorStop(0, '#2D1B69')
  grad.addColorStop(0.4, '#1A0F40')
  grad.addColorStop(1, BG_DARK)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
}

function drawClawWaveform(ctx, size) {
  const cx = size / 2
  const cy = size / 2

  // Five bars: the three inner bars curve at the top like claw prongs
  // The outer two are shorter and straight — classic waveform shape
  const barCount = 5
  const barWidth = size * 0.065
  const barGap = size * 0.095

  // Relative heights: edges shorter, centre tallest
  const relHeights = [0.40, 0.70, 1.0, 0.70, 0.40]
  const maxHeight = size * 0.38

  // Claw curl: which bars have curved tips, and curl direction
  // Positive = curl right, negative = curl left, 0 = no curl
  const curlDirections = [0.6, 0.3, 0, -0.3, -0.6]

  ctx.save()

  for (let i = 0; i < barCount; i++) {
    const h = maxHeight * relHeights[i]
    const bx = cx + (i - (barCount - 1) / 2) * barGap
    const topY = cy - h / 2
    const botY = cy + h / 2
    const curl = curlDirections[i]
    const r = barWidth / 2

    // Per-bar gradient: cyan at top -> light purple mid -> deep purple at bottom
    const barGrad = ctx.createLinearGradient(bx, topY, bx, botY)
    barGrad.addColorStop(0, GRADIENT_END)
    barGrad.addColorStop(0.35, '#A78BFA')
    barGrad.addColorStop(0.7, GRADIENT_START)
    barGrad.addColorStop(1, '#4C1D95')

    ctx.fillStyle = barGrad

    if (Math.abs(curl) < 0.01) {
      // Straight bar (centre bar) — simple rounded rect
      drawRoundedRect(ctx, bx - barWidth / 2, topY, barWidth, h, r)
      ctx.fill()
    } else {
      // Curved-top bar: the top portion curves inward (claw tip)
      drawClawBar(ctx, bx, topY, botY, barWidth, r, curl, size)
    }
  }

  ctx.restore()
}

function drawClawBar(ctx, cx, topY, botY, width, radius, curl, size) {
  const h = botY - topY
  const halfW = width / 2
  const r = radius

  // The bar is mostly straight, but the top ~25% curves
  const curveHeight = h * 0.25
  const curveMag = curl * size * 0.06 // horizontal offset for the claw hook
  const straightTop = topY + curveHeight

  ctx.beginPath()

  // Start bottom-left, go clockwise
  // Bottom-left corner (rounded)
  ctx.moveTo(cx - halfW, botY - r)
  ctx.arcTo(cx - halfW, botY, cx - halfW + r, botY, r)
  // Bottom edge
  ctx.lineTo(cx + halfW - r, botY)
  // Bottom-right corner (rounded)
  ctx.arcTo(cx + halfW, botY, cx + halfW, botY - r, r)
  // Right edge — straight up to where curve begins
  ctx.lineTo(cx + halfW, straightTop)
  // Curve the top rightward or leftward
  // Control point is offset horizontally by curveMag
  const tipX = cx + curveMag
  const tipY = topY
  ctx.quadraticCurveTo(cx + halfW + curveMag * 0.4, straightTop - curveHeight * 0.3, tipX + halfW * 0.3, tipY)
  // Across the tip (rounded)
  ctx.quadraticCurveTo(tipX, tipY - r * 0.8, tipX - halfW * 0.3, tipY)
  // Back down the left side of the curve
  ctx.quadraticCurveTo(cx - halfW + curveMag * 0.4, straightTop - curveHeight * 0.3, cx - halfW, straightTop)
  // Left edge back down
  ctx.closePath()
  ctx.fill()
}

function drawCenterGlow(ctx, size) {
  const cx = size / 2
  const cy = size / 2

  // Soft purple-cyan glow behind the bars
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.3)
  grad.addColorStop(0, 'rgba(124, 58, 237, 0.20)')
  grad.addColorStop(0.4, 'rgba(34, 211, 238, 0.06)')
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)')

  ctx.globalCompositeOperation = 'screen'
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  ctx.globalCompositeOperation = 'source-over'
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function generateSplash() {
  const width = 1284
  const height = 2778
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  // Dark background matching brand
  ctx.fillStyle = BG_DARK
  ctx.fillRect(0, 0, width, height)

  // Subtle radial gradient behind the icon
  const cx = width / 2
  const cy = height / 2
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, width * 0.6)
  grad.addColorStop(0, '#2D1B69')
  grad.addColorStop(0.4, '#1A0F40')
  grad.addColorStop(1, BG_DARK)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)

  // Draw the icon in the centre at ~400px
  const iconSize = 400
  ctx.save()
  ctx.translate(cx - iconSize / 2, cy - iconSize / 2)
  ctx.scale(iconSize / SIZE, iconSize / SIZE)
  drawClawWaveform(ctx, SIZE)
  drawCenterGlow(ctx, SIZE)
  ctx.restore()

  const buf = canvas.toBuffer('image/png')
  const out = path.join(OUTPUT_DIR, 'splash.png')
  fs.writeFileSync(out, buf)
  console.log(`Written: ${out} (${(buf.length / 1024).toFixed(1)} KB)`)
}

function generateIOSIcons() {
  if (!fs.existsSync(IOS_OUTPUT_DIR)) {
    fs.mkdirSync(IOS_OUTPUT_DIR, { recursive: true })
  }

  for (const size of IOS_ICON_SIZES) {
    const canvas = createCanvas(size, size)
    const ctx = canvas.getContext('2d')

    drawBackground(ctx, size)
    drawClawWaveform(ctx, size)
    if (size >= 80) drawCenterGlow(ctx, size)

    const buf = canvas.toBuffer('image/png')
    const out = path.join(IOS_OUTPUT_DIR, `icon-${size}x${size}.png`)
    fs.writeFileSync(out, buf)
    console.log(`Written: ${out} (${(buf.length / 1024).toFixed(1)} KB)`)
  }

  // Write Contents.json for Xcode asset catalog
  const contents = {
    images: [
      { filename: 'icon-40x40.png', idiom: 'iphone', scale: '2x', size: '20x20' },
      { filename: 'icon-60x60.png', idiom: 'iphone', scale: '3x', size: '20x20' },
      { filename: 'icon-29x29.png', idiom: 'iphone', scale: '1x', size: '29x29' },
      { filename: 'icon-58x58.png', idiom: 'iphone', scale: '2x', size: '29x29' },
      { filename: 'icon-87x87.png', idiom: 'iphone', scale: '3x', size: '29x29' },
      { filename: 'icon-80x80.png', idiom: 'iphone', scale: '2x', size: '40x40' },
      { filename: 'icon-120x120.png', idiom: 'iphone', scale: '3x', size: '40x40' },
      { filename: 'icon-120x120.png', idiom: 'iphone', scale: '2x', size: '60x60' },
      { filename: 'icon-180x180.png', idiom: 'iphone', scale: '3x', size: '60x60' },
      { filename: 'icon-20x20.png', idiom: 'ipad', scale: '1x', size: '20x20' },
      { filename: 'icon-40x40.png', idiom: 'ipad', scale: '2x', size: '20x20' },
      { filename: 'icon-29x29.png', idiom: 'ipad', scale: '1x', size: '29x29' },
      { filename: 'icon-58x58.png', idiom: 'ipad', scale: '2x', size: '29x29' },
      { filename: 'icon-40x40.png', idiom: 'ipad', scale: '1x', size: '40x40' },
      { filename: 'icon-80x80.png', idiom: 'ipad', scale: '2x', size: '40x40' },
      { filename: 'icon-76x76.png', idiom: 'ipad', scale: '1x', size: '76x76' },
      { filename: 'icon-152x152.png', idiom: 'ipad', scale: '2x', size: '76x76' },
      { filename: 'icon-167x167.png', idiom: 'ipad', scale: '2x', size: '83.5x83.5' },
      { filename: 'icon-1024x1024.png', idiom: 'ios-marketing', scale: '1x', size: '1024x1024' },
    ],
    info: { author: 'xcode', version: 1 },
  }

  const contentsOut = path.join(IOS_OUTPUT_DIR, 'Contents.json')
  fs.writeFileSync(contentsOut, JSON.stringify(contents, null, 2) + '\n')
  console.log(`Written: ${contentsOut}`)
}

// --- Run ---
generateMainIcon()
generateAdaptiveIcon()
generateFavicon()
generateSplash()
generateIOSIcons()
console.log('\nAll icons generated!')
