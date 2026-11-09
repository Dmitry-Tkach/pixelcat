# Rat character — development handoff

## Included
- `rat_sprite_atlas_source.png` — generated visual atlas reference (1536 × 1024, RGBA)
- `animations.json` — proposed Phaser 3 animation names and timing

## Animation set
| Key | Suggested frames | FPS | Playback |
|---|---:|---:|---|
| idle | 8 | 6 | loop |
| run | 9 | 12 | loop |
| jump | 8 | 10 | once |
| throw_bomb | 8 | 10 | once |
| lunge | 6 | 14 | once |
| super_power_hit | 8 | 12 | once |
| won | 5 | 8 | once |
| defeated | 9 | 8 | once |

## Important production limitation
This generated sheet is **not yet a production sprite atlas**: the poses are not placed on a perfectly regular grid, and the background is visible. The RGBA file mode does not mean the background pixels are transparent. Exact frame rectangles therefore cannot be safely inferred from a uniform `frameWidth` / `frameHeight` setting.

## Required finishing steps
1. Remove the background while preserving the dark character outlines and attack effects.
2. Crop each pose into its own frame.
3. Normalize every frame to a common canvas size and consistent ground/pivot position.
4. Export one transparent PNG strip per animation (or a packed atlas plus Phaser JSON hash).
5. Update `animations.json` with exact frame indices and verify playback in a Phaser 3 scene.

The frame counts and rates above are starting recommendations, not verified extracted frame counts.
