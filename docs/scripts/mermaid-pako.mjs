import pako from 'pako'
import fs from 'node:fs'
import path from 'node:path'

const input = process.argv[2]
if (!input) {
  console.error('usage: node mermaid-pako.mjs <path-to-mmd-file>')
  process.exit(1)
}

const source = fs.readFileSync(path.resolve(input), 'utf8')

const state = {
  code: source,
  mermaid: JSON.stringify({ theme: 'dark' }, null, 2),
  autoSync: true,
  updateDiagram: true
}

const json = JSON.stringify(state)
const compressed = pako.deflate(json, { level: 9 })
const b64 = Buffer.from(compressed).toString('base64')
const urlSafe = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

console.log(`https://mermaid.live/edit#pako:${urlSafe}`)
