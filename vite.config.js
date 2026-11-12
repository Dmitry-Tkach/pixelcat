import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative paths, so the build also works from a subfolder (GitHub Pages, itch.io)
  build: {
    chunkSizeWarningLimit: 1600, // Phaser is one large file by design
    // Three pages: the choice of games, and each game's own page, which loads only that game.
    rollupOptions: { input: { main: 'index.html', runner: 'runner.html', adventure: 'adventure.html' } },
  },
});
