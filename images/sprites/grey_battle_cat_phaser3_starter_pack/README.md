# Grey Battle Cat — Phaser 3 starter asset pack

## Included
- Extracted PNG frame crops in `frames/`
- Horizontal PNG strips in `spritesheets/`
- `animations.json` with detected frame counts and suggested playback settings
- Original generated concept atlas in `reference/`

## Important limitations
This pack is an automated first-pass extraction from a single generated concept atlas, not a professionally authored production sprite sheet. The source atlas has uneven spacing, some effects overlap character art, and some multi-pose sequences are visually merged. Therefore the extracted frame counts are based on separable visible regions and may not match the originally planned counts. Review every frame before shipping.

The extraction normalises each detected region into a 256x256 transparent cell. This can crop a multi-pose merged region as one frame rather than reconstructing its individual poses. In particular, superpower and effect sequences need manual redrawing/splitting. Do not assume the extracted animation timing is final.

## Phaser 3 usage

```js
// Load one strip
this.load.spritesheet('cat_idle', 'assets/cat/spritesheets/cat_idle.png', {
  frameWidth: 256,
  frameHeight: 256
});

// Register from animations.json (or use the equivalent values below)
this.anims.create({
  key: 'cat-idle',
  frames: this.anims.generateFrameNumbers('cat_idle', { start: 0, end: FRAME_COUNT - 1 }),
  frameRate: 6,
  repeat: -1
});
```

Replace `FRAME_COUNT` with the `frameCount` value in `animations.json`. Each animation strip is horizontal, with 256x256 cells.

## Suggested integration
- Use `sprite.setFlipX(true)` to face left.
- Use Phaser physics for actual movement; do not rely on the sprite animation to move the game object.
- Spawn bombs, damage hitboxes and energy effects as separate game objects.
- Keep one-shot animations non-looping and transition back to idle/run from animation completion events.
