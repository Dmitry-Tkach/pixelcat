const UPDATE_MS = 500;
const WINDOW_MS = 5000;
const STYLE = 'position:fixed;left:8px;bottom:8px;z-index:50;padding:4px 8px;border-radius:6px;background:rgba(0,0,0,.7);color:#fff;font:600 14px monospace;pointer-events:none';

// A development aid: F shows or hides it, and ?fps starts with it showing. It shows the frame rate
// now, and the worst single frame in the last few seconds, because one slow frame can make a jump
// feel late without moving the average.
export function setUpFpsCounter(game, { shown = false } = {}) {
  const label = document.createElement('div');
  label.style.cssText = STYLE;
  label.hidden = !shown;
  label.textContent = 'FPS …';
  document.body.append(label);
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyF' && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey) label.hidden = !label.hidden;
  });
  let last = performance.now();
  let frames = [];
  let shownAt = last;
  const onFrame = () => {
    const now = performance.now();
    frames.push({ at: now, ms: now - last });
    last = now;
    frames = frames.filter((frame) => now - frame.at <= WINDOW_MS);
    if (label.hidden || now - shownAt < UPDATE_MS) return;
    shownAt = now;
    const recent = frames.filter((frame) => now - frame.at <= UPDATE_MS);
    const worst = Math.max(...frames.map((frame) => frame.ms));
    label.textContent = `${Math.round((recent.length * 1000) / UPDATE_MS)} FPS, slowest frame ${Math.round(worst)} ms`;
  };
  game.events.on('poststep', onFrame);
}
