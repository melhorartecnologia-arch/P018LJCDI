// Copies the pinned React 18 UMD builds from node_modules into public/vendor
// so index.html can load them as plain <script> globals (dc-runtime needs
// window.React / window.ReactDOM). Runs automatically on `npm install`.
import { copyFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'public/vendor')

const files = [
  ['node_modules/react/umd/react.production.min.js', 'react.production.min.js'],
  ['node_modules/react-dom/umd/react-dom.production.min.js', 'react-dom.production.min.js'],
]

await mkdir(outDir, { recursive: true })
for (const [from, name] of files) {
  const src = resolve(root, from)
  if (!existsSync(src)) {
    console.warn(`[sync-vendor] skipped ${name}: ${from} not found (run npm install first)`)
    continue
  }
  await copyFile(src, resolve(outDir, name))
  console.log(`[sync-vendor] ${name}`)
}
