import { beforeEach, describe, expect, it } from 'vitest';
import { InputController } from '../src/input/InputController.js';

// A minimal stand-in for a Phaser scene: it records handlers and lets tests fire them.
function fakeScene() {
  const handlers = {};
  return {
    time: { now: 0 },
    input: {
      on: (event, handler) => { handlers[event] = handler; },
      keyboard: null,
    },
    fire: (event, ...args) => handlers[event](...args),
  };
}

describe('InputController', () => {
  let scene;
  let controls;
  let actions;
  const pointer = (y, id = 1) => ({ id, y });

  beforeEach(() => {
    scene = fakeScene();
    actions = [];
    controls = new InputController(scene, {
      onJump: () => actions.push('jump'),
      onSlide: () => actions.push('slide'),
      onPause: () => actions.push('pause'),
    });
  });

  it('jumps on a quick tap', () => {
    scene.fire('pointerdown', pointer(100), []);
    scene.fire('pointerup', pointer(100));
    expect(actions).toEqual(['jump']);
  });

  it('jumps during a still hold, without waiting for release', () => {
    scene.fire('pointerdown', pointer(100), []);
    controls.update(100);
    expect(actions).toEqual([]);
    controls.update(140);
    expect(actions).toEqual(['jump']);
    scene.fire('pointerup', pointer(100));
    expect(actions).toEqual(['jump']);
  });

  it('slides on a fast swipe down', () => {
    scene.fire('pointerdown', pointer(100), []);
    scene.fire('pointermove', pointer(140));
    expect(actions).toEqual(['slide']);
  });

  it('treats a slow swipe down as a slide, never a jump', () => {
    scene.fire('pointerdown', pointer(100), []);
    scene.fire('pointermove', pointer(112));
    controls.update(200);
    controls.update(400);
    expect(actions).toEqual([]);
    scene.fire('pointermove', pointer(135));
    expect(actions).toEqual(['slide']);
  });

  it('treats a short downward flick that ends early as a slide', () => {
    scene.fire('pointerdown', pointer(100), []);
    scene.fire('pointermove', pointer(118));
    scene.fire('pointerup', pointer(118));
    expect(actions).toEqual(['slide']);
  });

  it('ignores small finger wobble', () => {
    scene.fire('pointerdown', pointer(100), []);
    scene.fire('pointermove', pointer(105));
    scene.fire('pointerup', pointer(105));
    expect(actions).toEqual(['jump']);
  });

  it('jumps on a swipe up', () => {
    scene.fire('pointerdown', pointer(100), []);
    scene.fire('pointermove', pointer(60));
    expect(actions).toEqual(['jump']);
  });

  it('ignores presses that land on a HUD button', () => {
    scene.fire('pointerdown', pointer(100), [{ name: 'pause button' }]);
    scene.fire('pointerup', pointer(100));
    controls.update(500);
    expect(actions).toEqual([]);
  });

  it('acts only once per press', () => {
    scene.fire('pointerdown', pointer(100), []);
    scene.fire('pointermove', pointer(140));
    scene.fire('pointermove', pointer(180));
    scene.fire('pointerup', pointer(180));
    expect(actions).toEqual(['slide']);
  });
});
