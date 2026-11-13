# Adventure — Wide Worlds / Separate Titles Asset Pack

## Requested changes
- World illustrations are cropped in a wider landscape format.
- World title plates are separate PNG files.
- Level buttons 1, 2 and 3 remain separate reusable PNGs.
- No level buttons or title plates are intentionally baked into the world island crops.

## Folder guide
- `01_wide_world_islands_no_text/` — 8 wide world image crops.
- `02_world_title_plates_separate/` — 8 separate title plates.
- `03_world_number_badges/` — 8 separate world-number badges.
- `04_level_buttons/` — 3 reusable level button assets.
- Other folders contain the atlas reference, branding, cat, route pieces and progress/decorative references.

## Phaser layout
For each world, create independent game objects:
1. Wide world island image
2. World title plate image (or live text if preferred)
3. Level button 1
4. Level button 2
5. Level button 3

This allows the island artwork, title and level buttons to be repositioned or animated independently.

## Transparency caveat
The source atlas is a flattened image. Crops are PNGs, but they are not guaranteed to be clean transparent cutouts. They need background removal and edge cleanup before production use.
