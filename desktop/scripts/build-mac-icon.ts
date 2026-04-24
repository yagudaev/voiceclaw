#!/usr/bin/env tsx
// Generates a macOS-correct icon from a square source PNG.
//
// Apple's macOS icon template (Big Sur+) is NOT a full-bleed square:
//   - 1024x1024 canvas
//   - 824x824 artwork centered (100px transparent margin on each side)
//   - Artwork clipped to a superellipse ("squircle"), not a circular arc
//
// Shipping the raw square (as icon-1024x1024.png does for iOS) makes the
// .app look like a tile-inside-a-tile because macOS draws its own shadow
// around the full opaque rectangle. This script bakes in the squircle
// with transparent corners so the OS shadow + hover + dock highlight all
// hug the intended shape.

import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'

// Apple's squircle is closer to a superellipse with n≈5; larger n = flatter
// sides, sharper corners. 5.0 matches Sketch/Figma's "Apple squircle" preset.
const SQUIRCLE_N = 5.0

// Inner artwork bounds within 1024 canvas. 824 matches Apple's macOS icon
// template; tweak MARGIN to change breathing room.
const CANVAS = 1024
const MARGIN = 100
const INNER = CANVAS - 2 * MARGIN // 824

// Apple's macOS .iconset layout — iconutil expects these exact filenames.
const ICONSET_SIZES: ReadonlyArray<readonly [number, string]> = [
  [16, 'icon_16x16.png'],
  [32, 'icon_16x16@2x.png'],
  [32, 'icon_32x32.png'],
  [64, 'icon_32x32@2x.png'],
  [128, 'icon_128x128.png'],
  [256, 'icon_128x128@2x.png'],
  [256, 'icon_256x256.png'],
  [512, 'icon_256x256@2x.png'],
  [512, 'icon_512x512.png'],
  [1024, 'icon_512x512@2x.png'],
]

async function main(): Promise<void> {
  const [, , srcArg, masterArg, iconsetArg] = process.argv
  if (!srcArg || !masterArg || !iconsetArg) {
    console.error('usage: build-mac-icon.ts <source.png> <master.png> <iconset-dir>')
    process.exit(1)
  }

  const src = resolve(srcArg)
  const masterOut = resolve(masterArg)
  const iconsetOut = resolve(iconsetArg)

  await buildMaster(src, masterOut)
  await buildIconset(masterOut, iconsetOut)
  console.log(`wrote ${masterOut} and populated ${iconsetOut}`)
}

async function buildMaster(src: string, out: string): Promise<void> {
  const tile = await cropInnerTile(src)
  // Resize the carbon tile to the inner bounds with Lanczos (matches PIL's
  // Image.LANCZOS).
  const inner = await sharp(tile.data, {
    raw: { width: tile.width, height: tile.height, channels: 4 },
  })
    .resize(INNER, INNER, { kernel: 'lanczos3' })
    .raw()
    .toBuffer()

  const mask = await makeSquircleMask(INNER, SQUIRCLE_N)

  // Punch the squircle mask into the artwork's alpha channel, matching the
  // Python version's putalpha(). inner is RGBA raw; replace the A byte.
  const clipped = Buffer.alloc(inner.length)
  inner.copy(clipped)
  for (let i = 0; i < mask.length; i++) {
    clipped[i * 4 + 3] = mask[i]
  }

  // Paste the clipped inner artwork onto a transparent 1024 canvas at the
  // 100px margin offset.
  const innerPng = await sharp(clipped, {
    raw: { width: INNER, height: INNER, channels: 4 },
  })
    .png()
    .toBuffer()

  const canvas = await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: innerPng, top: MARGIN, left: MARGIN }])
    .png()
    .toBuffer()

  await writeFile(out, canvas)
}

async function buildIconset(master: string, iconset: string): Promise<void> {
  await mkdir(iconset, { recursive: true })
  const source = await sharp(master).ensureAlpha().png().toBuffer()
  for (const [size, name] of ICONSET_SIZES) {
    const resized = await sharp(source)
      .resize(size, size, { kernel: 'lanczos3' })
      .png()
      .toBuffer()
    await writeFile(resolve(iconset, name), resized)
  }
}

// --- Helpers --------------------------------------------------------------

type RawImage = { data: Buffer; width: number; height: number }

async function cropInnerTile(src: string): Promise<RawImage> {
  // Crop the carbon tile out of the iOS master (which has a grid-paper
  // outer background meant to be masked away by the iOS squircle).
  //
  // Scans for the inner-tile color (#211b16) to find its bounds rather than
  // hardcoding, so a re-exported source with slightly different dimensions
  // still works.
  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info

  // Probe a known-tile-background pixel at ~30% in from top-left. The iOS
  // master places the inner tile ~20% inset, so 30% is safely inside it
  // and avoids the cream Mark in the center.
  const px = (x: number, y: number): [number, number, number] => {
    const idx = (y * w + x) * 4
    return [data[idx], data[idx + 1], data[idx + 2]]
  }

  const tile = px(Math.floor(w * 0.3), Math.floor(h * 0.3))
  const tol = 4
  const isTile = (p: [number, number, number]): boolean =>
    Math.abs(p[0] - tile[0]) <= tol &&
    Math.abs(p[1] - tile[1]) <= tol &&
    Math.abs(p[2] - tile[2]) <= tol

  const yProbe = Math.floor(h * 0.3)
  const xProbe = Math.floor(w * 0.3)
  let left = 0
  for (let x = 0; x < w; x++) {
    if (isTile(px(x, yProbe))) {
      left = x
      break
    }
  }
  let right = w - 1
  for (let x = w - 1; x >= 0; x--) {
    if (isTile(px(x, yProbe))) {
      right = x
      break
    }
  }
  let top = 0
  for (let y = 0; y < h; y++) {
    if (isTile(px(xProbe, y))) {
      top = y
      break
    }
  }
  let bot = h - 1
  for (let y = h - 1; y >= 0; y--) {
    if (isTile(px(xProbe, y))) {
      bot = y
      break
    }
  }

  const cropW = right + 1 - left
  const cropH = bot + 1 - top
  const cropBuf = Buffer.alloc(cropW * cropH * 4)
  for (let y = 0; y < cropH; y++) {
    const srcStart = ((top + y) * w + left) * 4
    const dstStart = y * cropW * 4
    data.copy(cropBuf, dstStart, srcStart, srcStart + cropW * 4)
  }
  return { data: cropBuf, width: cropW, height: cropH }
}

async function makeSquircleMask(size: number, n: number): Promise<Buffer> {
  // 8-bit alpha mask of a centered superellipse filling `size` x `size`.
  //
  // Rasterize at 4x with a per-pixel inside-test, then downsample with
  // Lanczos — matches the Python version's 4x render + Lanczos downsample
  // for anti-aliasing. A per-pixel interior test produces a binary 4x mask
  // that differs from a polygon fill only along the boundary (a single
  // row of pixels), which the Lanczos downsample smooths out.
  const scale = 4
  const big = size * scale
  const big1 = Buffer.alloc(big * big)
  const a = big / 2.0
  for (let y = 0; y < big; y++) {
    const dy = Math.abs((y + 0.5 - a) / a)
    const dyn = Math.pow(dy, n)
    for (let x = 0; x < big; x++) {
      const dx = Math.abs((x + 0.5 - a) / a)
      // Superellipse interior: |x/a|^n + |y/a|^n <= 1
      if (Math.pow(dx, n) + dyn <= 1) {
        big1[y * big + x] = 255
      }
    }
  }
  // .toColourspace('b-w') forces the output back to single-channel grayscale —
  // sharp otherwise expands 1-channel raw input to 3-channel RGB on resize.
  return sharp(big1, { raw: { width: big, height: big, channels: 1 } })
    .resize(size, size, { kernel: 'lanczos3' })
    .toColourspace('b-w')
    .raw()
    .toBuffer()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
