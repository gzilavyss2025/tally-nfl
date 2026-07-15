import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deliberately no PWA plugin yet — add vite-plugin-pwa once the NFL app has
// a real offline shell worth caching (see bbsbh/vite.config.js for the
// NetworkOnly-on-live-data pattern to copy when that day comes: a stale
// cached score would spoil the same way a stale baseball score does).
//
// PORTS: 5174-5178 (dev) and 4174-4178 (preview) are reserved for tally-nfl
// only — bbsbh (the sibling baseball app, run separately) owns 5173/4173 and
// never these. strictPort:true is deliberate: a silent auto-increment would
// let one agent's dev server accidentally reuse/steal the port a DIFFERENT
// concurrent agent (or a bbsbh session) is already bound to, instead of
// failing loudly. With multiple agents working in this repo at once (e.g.
// separate worktrees), each grabs the next free numbered slot via
// package.json's dev/dev:2/dev:3/dev:4/dev:5 (and preview/preview:2../5)
// scripts rather than guessing a port.
export default defineConfig({
  server: {
    port: 5174,
    strictPort: true,
  },
  preview: {
    port: 4174,
    strictPort: true,
  },
  plugins: [react()],
})
