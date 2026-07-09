import { defineConfig } from 'vite'

// The app is a Claude Design (dc-runtime) document: index.html contains the
// <x-dc> markup plus the <script data-dc-script> component logic, rendered by
// public/support.js on top of the vendored React 18 UMD globals.
//
// Vite only serves/copies the static assets (support.js, vendor React, images)
// and bundles index.html untouched. `base: './'` keeps every reference relative
// so the build works when hosted at the domain root or under a sub-path.
export default defineConfig({
  base: './',
  server: { port: 5173, open: false },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
})
