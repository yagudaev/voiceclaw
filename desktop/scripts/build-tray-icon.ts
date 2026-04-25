// Generates the macOS menu bar (tray) icon assets.
//
// Why this exists: an 18 px monochrome glyph in the menu bar is its own
// design problem — the full VoiceClaw Mark has 8 strokes (two bracketed
// "speaker cones" plus three vertical sound-wave bars) and turns into
// mud at that size. This script renders a *simplified* Mark — just the
// two opposing brackets with a single short pip between them — which
// keeps the bracket silhouette (the most identifiable part of the brand)
// readable at menu-bar density.
//
// Output:
//   desktop/build/trayTemplate.png       (18×18, used at 1x)
//   desktop/build/trayTemplate@2x.png    (36×36, used at 2x retina)
//
// Both are template images (black on transparent). Electron's
// nativeImage.setTemplateImage(true) tells macOS to invert them for
// dark menu bars automatically — so we don't need a separate dark
// variant.

import sharp from "sharp"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { mkdir } from "node:fs/promises"

const __dirname = dirname(fileURLToPath(import.meta.url))
const TRAY_DIR = resolve(__dirname, "..", "resources", "tray")

const SIZES = [
  { name: "trayTemplate.png", size: 18 },
  { name: "trayTemplate@2x.png", size: 36 },
]

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

// Helpers --------------------------------------------------------------

async function main() {
  await mkdir(TRAY_DIR, { recursive: true })
  for (const { name, size } of SIZES) {
    const svg = trayGlyphSvg(size)
    await sharp(Buffer.from(svg)).png().toFile(resolve(TRAY_DIR, name))
    console.log(`wrote resources/tray/${name} (${size}×${size})`)
  }
}

function trayGlyphSvg(size: number): string {
  // 22×22 design canvas — render larger and let sharp downsample for
  // anti-aliasing at the actual output size. Pure black + transparent
  // so setTemplateImage handles all theme inversion.
  //
  // The bracket spines lean inward at the top/bottom corners, mirroring
  // the Mark's "facing speaker cones" silhouette. The center pip
  // anchors the eye and ties the two brackets together.
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 22 22" fill="none">
  <!-- Left bracket: vertical spine with inward-leaning corners -->
  <path
    d="M5 4 L3 6 L3 16 L5 18"
    stroke="black"
    stroke-width="2.4"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <!-- Right bracket -->
  <path
    d="M17 4 L19 6 L19 16 L17 18"
    stroke="black"
    stroke-width="2.4"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  <!-- Center pip — short vertical pill, the rust-accent bar in monochrome -->
  <path
    d="M11 8 L11 14"
    stroke="black"
    stroke-width="3"
    stroke-linecap="round"
  />
</svg>`
}
