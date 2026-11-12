import { CHARACTERS, animKey, frameKey } from '../data/characters.js';

// Loading characters' frames and making their animations, from data/characters.js. Each game's boot
// scene asks only for its own: the runner for all of them, the adventure for its two battle cats.

export function loadCharacters(scene, names) {
  for (const name of names) {
    const character = CHARACTERS[name];
    for (const { file, frames } of Object.values(character.anims)) {
      for (let i = 1; i <= frames; i++) {
        scene.load.image(frameKey(name, file, i), `assets/sprites/${character.folder}/${file}-${i}.png`);
      }
    }
  }
}

export function makeCharacterAnims(scene, names) {
  for (const name of names) {
    for (const [role, { file, frames, frameList, fps, repeat }] of Object.entries(CHARACTERS[name].anims)) {
      const numbers = frameList ?? Array.from({ length: frames }, (_, i) => i + 1);
      scene.anims.create({
        key: animKey(name, role),
        frames: numbers.map((n) => ({ key: frameKey(name, file, n) })),
        frameRate: fps,
        repeat,
      });
    }
  }
}
