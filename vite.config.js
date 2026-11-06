import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative paths, so the build also works from a subfolder (GitHub Pages, itch.io)
  build: { chunkSizeWarningLimit: 1600 }, // Phaser is one large file by design
});
