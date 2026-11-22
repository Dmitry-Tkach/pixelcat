// A development aid for finding what makes the adventure heavy: P shows or hides it, and ?perf
// starts with it showing. Once a second it shows:
//   the frame rate, and the slowest frame in that second;
//   how long a frame takes, on average: the game's thinking (moves, physics, enemies) and its
//   drawing (the browser's work of sending it to the video card, not the card's own time);
//   draw calls: how many times a frame the game asks the video card to draw, and textures: how
//   many pictures it holds;
//   the level: its objects, how many are in the camera's view, the tweens and animations running,
//   and the physics bodies;
//   the canvas: the size it's drawn at, and the size it's shown at on screen.
// It's only built in development, and leaves the game alone while hidden, except for counting.

const UPDATE_MS = 1000;
const STYLE = 'position:fixed;left:8px;top:8px;z-index:50;padding:6px 10px;border-radius:6px;background:rgba(0,0,0,.75);color:#fff;font:600 13px/1.45 monospace;pointer-events:none;white-space:pre';

export function setUpAdventurePerfPanel(game, { shown = false } = {}) {
  const label = document.createElement('div');
  label.style.cssText = STYLE;
  label.hidden = !shown;
  label.textContent = 'Measuring…';
  document.body.append(label);
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyP' && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey) label.hidden = !label.hidden;
  });

  // Every draw call, counted by wrapping WebGL's two drawing functions.
  let drawCalls = 0;
  const countDraws = () => {
    const gl = game.renderer?.gl;
    if (!gl || gl.countedByPerfPanel) return;
    for (const name of ['drawArrays', 'drawElements']) {
      const draw = gl[name].bind(gl);
      gl[name] = (...args) => { drawCalls += 1; return draw(...args); };
    }
    gl.countedByPerfPanel = true;
  };

  // The time spent thinking (from the first step event to the last) and drawing, each frame.
  const sums = { frames: 0, thinkMs: 0, drawMs: 0, slowestMs: 0 };
  let frameStart = 0, stepStart = 0, renderStart = 0, lastFrame = performance.now();
  game.events.on('prestep', () => { stepStart = performance.now(); });
  game.events.on('poststep', () => { sums.thinkMs += performance.now() - stepStart; });
  game.events.on('prerender', () => { renderStart = performance.now(); });
  game.events.on('postrender', () => {
    const now = performance.now();
    sums.drawMs += now - renderStart;
    sums.frames += 1;
    sums.slowestMs = Math.max(sums.slowestMs, now - lastFrame);
    lastFrame = now;
  });

  let shownAt = performance.now(), drawCallsAt = 0;
  game.events.on('postrender', () => {
    countDraws();
    const now = performance.now();
    if (now - shownAt < UPDATE_MS) return;
    const seconds = (now - shownAt) / 1000;
    const { frames, thinkMs, drawMs, slowestMs } = sums;
    const lines = [
      `${Math.round(frames / seconds)} FPS, slowest frame ${Math.round(slowestMs)} ms`,
      `a frame: thinking ${(thinkMs / frames).toFixed(1)} ms, drawing ${(drawMs / frames).toFixed(1)} ms`,
      `draw calls ${Math.round((drawCalls - drawCallsAt) / frames)} a frame, textures ${game.textures.getTextureKeys().length}`,
      ...levelLines(game),
      canvasLine(game),
    ];
    if (!label.hidden) label.textContent = lines.join('\n');
    Object.assign(sums, { frames: 0, thinkMs: 0, drawMs: 0, slowestMs: 0 });
    shownAt = now;
    drawCallsAt = drawCalls;
  });
}

// The running adventure level's objects, tweens, animations and bodies.
function levelLines(game) {
  const scene = game.scene.getScenes(true).find((s) => s.sys.settings.key === 'Adventure');
  if (!scene) return ['(no level running)'];
  const view = scene.cameras.main.worldView;
  let total = 0, inView = 0, animating = 0;
  for (const object of scene.children.list) {
    total += 1;
    if (object.anims?.isPlaying) animating += 1;
    if (object.scrollFactorX === 0 || isInView(object, view)) inView += 1;
  }
  const { world } = scene.physics;
  return [
    `objects ${total}, in view ${inView}, animating ${animating}`,
    `tweens ${scene.tweens.getTweens().length}, bodies ${world.bodies.size} moving + ${world.staticBodies.size} still`,
  ];
}

// Roughly: whether an object's box overlaps the camera's view. Tilemap layers and objects without a
// size count as in view.
function isInView(object, view) {
  const w = object.displayWidth, h = object.displayHeight;
  if (!w || !h || object.type === 'TilemapLayer') return true;
  const left = object.x - w * (object.originX ?? 0.5), top = object.y - h * (object.originY ?? 0.5);
  return left < view.right && left + w > view.x && top < view.bottom && top + h > view.y;
}

function canvasLine(game) {
  const { canvas } = game;
  const shown = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio;
  return `canvas ${canvas.width}x${canvas.height}, shown ${Math.round(shown.width * ratio)}x${Math.round(shown.height * ratio)} screen pixels`;
}
