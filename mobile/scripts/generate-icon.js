#!/usr/bin/env node
/**
 * Generates VoiceClaw app icons and splash artwork from the Editorial Quiet
 * mark. Keep colors in sync with mobile/lib/brand.ts and the website brand
 * guidelines.
 *
 * Run: node scripts/generate-icon.js
 */

const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

const SIZE = 1024
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'images')
const IOS_ICON_SIZES = [1024, 180, 167, 152, 120, 87, 80, 76, 60, 58, 40, 29, 20]

const COLORS = {
  paper: '#F1E8DA',
  panel: '#FDF9F1',
  ink: '#191511',
  muted: '#665F58',
  accent: '#B4492F',
  sage: '#697668',
  darkPaper: '#171310',
  darkPanel: '#211B16',
  darkInk: '#F5EADC',
  line: 'rgba(25, 21, 17, 0.16)',
  darkLine: 'rgba(245, 234, 220, 0.2)',
}

const VARIANT_BADGES = {
  ios: null,
  'ios-dev': { label: 'DEV', color: '#665F58' },
  'ios-staging': { label: 'STG', color: '#697668' },
}

function generateMainIcon() {
  const canvas = createCanvas(SIZE, SIZE)
  const ctx = canvas.getContext('2d')

  drawIcon(ctx, SIZE)
  writePng(canvas, path.join(OUTPUT_DIR, 'icon.png'))
  writePng(canvas, path.join(OUTPUT_DIR, 'adaptive-icon.png'))
}

function generateFavicon() {
  const size = 48
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  drawIcon(ctx, size)
  writePng(canvas, path.join(OUTPUT_DIR, 'favicon.png'))
}

function generateSplash() {
  const width = 1284
  const height = 2778
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  drawPaperField(ctx, width, height, true)

  const markSize = 420
  ctx.save()
  ctx.translate(width / 2 - markSize / 2, height / 2 - markSize / 2)
  drawMarkTile(ctx, markSize, true)
  ctx.restore()

  writePng(canvas, path.join(OUTPUT_DIR, 'splash.png'))
}

function generateIOSIcons() {
  for (const [dir, badge] of Object.entries(VARIANT_BADGES)) {
    const outputDir = path.join(OUTPUT_DIR, dir)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    for (const size of IOS_ICON_SIZES) {
      const canvas = createCanvas(size, size)
      const ctx = canvas.getContext('2d')

      drawIcon(ctx, size)
      if (badge) drawVariantBadge(ctx, size, badge)

      writePng(canvas, path.join(outputDir, `icon-${size}x${size}.png`))
    }

    writeContentsJson(outputDir)
  }
}

function drawIcon(ctx, size) {
  if (size < 80) {
    ctx.fillStyle = COLORS.darkPaper
    ctx.fillRect(0, 0, size, size)
    ctx.save()
    const markSize = size * 0.68
    ctx.translate((size - markSize) / 2, (size - markSize) / 2)
    ctx.scale(markSize / 64, markSize / 64)
    drawVoiceClawMark(ctx, true)
    ctx.restore()
    return
  }

  drawPaperField(ctx, size, size, true)
  drawMarkTile(ctx, size, true)
}

function drawPaperField(ctx, width, height, dark) {
  ctx.fillStyle = dark ? COLORS.darkPaper : COLORS.paper
  ctx.fillRect(0, 0, width, height)

  const line = dark ? COLORS.darkLine : COLORS.line
  const grid = Math.max(28, Math.round(width / 18))
  ctx.strokeStyle = line
  ctx.lineWidth = Math.max(1, width / 1024)

  for (let x = grid; x < width; x += grid) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  for (let y = grid; y < height; y += grid) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
}

function drawMarkTile(ctx, size, dark) {
  const tileSize = size * 0.58
  const tileX = (size - tileSize) / 2
  const tileY = (size - tileSize) / 2
  const radius = tileSize * 0.09

  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
  ctx.shadowBlur = size * 0.035
  ctx.shadowOffsetY = size * 0.018
  roundedRect(ctx, tileX, tileY, tileSize, tileSize, radius)
  ctx.fillStyle = dark ? COLORS.darkPanel : COLORS.panel
  ctx.fill()
  ctx.restore()

  ctx.strokeStyle = dark ? COLORS.darkLine : COLORS.line
  ctx.lineWidth = Math.max(1, size * 0.002)
  roundedRect(ctx, tileX, tileY, tileSize, tileSize, radius)
  ctx.stroke()

  const markSize = tileSize * 0.64
  ctx.save()
  ctx.translate(tileX + (tileSize - markSize) / 2, tileY + (tileSize - markSize) / 2)
  ctx.scale(markSize / 64, markSize / 64)
  drawVoiceClawMark(ctx, dark)
  ctx.restore()
}

function drawVoiceClawMark(ctx, dark) {
  const stroke = dark ? COLORS.darkInk : COLORS.ink
  const accent = dark ? '#D86A4D' : COLORS.accent

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  drawPolyline(ctx, [[20, 10], [14, 10], [14, 54], [20, 54]], stroke, 4)
  drawPolyline(ctx, [[20, 10], [27, 17]], stroke, 4)
  drawPolyline(ctx, [[20, 54], [27, 47]], stroke, 4)
  drawPolyline(ctx, [[44, 10], [50, 10], [50, 54], [44, 54]], stroke, 4)
  drawPolyline(ctx, [[44, 10], [37, 17]], stroke, 4)
  drawPolyline(ctx, [[44, 54], [37, 47]], stroke, 4)
  drawPolyline(ctx, [[29, 40], [29, 24]], accent, 4.5)
  drawPolyline(ctx, [[35, 46], [35, 18]], stroke, 4.5)
  drawPolyline(ctx, [[41, 37], [41, 27]], stroke, 4.5)
}

function drawVariantBadge(ctx, size, badge) {
  const height = size * 0.22
  ctx.fillStyle = badge.color
  ctx.fillRect(0, size - height, size, height)

  ctx.fillStyle = '#FFFFFF'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `bold ${Math.round(size * 0.11)}px Arial`
  ctx.fillText(badge.label, size / 2, size - height / 2 + size * 0.01)
}

function drawPolyline(ctx, points, color, width) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(points[0][0], points[0][1])
  for (const [x, y] of points.slice(1)) {
    ctx.lineTo(x, y)
  }
  ctx.stroke()
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function writePng(canvas, outputPath) {
  const buf = canvas.toBuffer('image/png')
  fs.writeFileSync(outputPath, buf)
  console.log(`Written: ${outputPath} (${(buf.length / 1024).toFixed(1)} KB)`)
}

function writeContentsJson(outputDir) {
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

  fs.writeFileSync(path.join(outputDir, 'Contents.json'), JSON.stringify(contents, null, 2) + '\n')
}

generateMainIcon()
generateFavicon()
generateSplash()
generateIOSIcons()
console.log('\nAll icons generated!')
