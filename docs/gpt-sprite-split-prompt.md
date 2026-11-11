# Prompt: ask ChatGPT to split a sprite sheet into game frames

Attach the sprite sheet (for example `source_sprite_sheet.png`), then paste everything below the
line. It tests whether ChatGPT can split a sheet cleanly enough for the game. Check its result with
the checklist at the end.

---

Split the attached sprite sheet into animation frames for a 2D platformer game. Use Python (Pillow
or NumPy) and work on the real pixels. Don't redraw anything, and don't guess positions: measure
them. Follow every rule below.

**The sheet**
- A grey cat, drawn in rows of animations. Each animation has a dark name label above it (IDLE, RUN,
  JUMP, SLIDE, HIT, SUPER HIT, DEFEATED, DASH, CLIMB, CLIMB UP, CLIMB DOWN, SPECIAL ATTACK, SPECIAL
  END).
- Several animations share a row.
- The background is transparent, with a faint dark haze around the figures.

**1. Remove the labels first.** Find every dark rounded label with white text, and make it fully
transparent before cutting. No piece of any label may appear in any frame.

**2. Find each frame by the gaps between figures, not with a fixed grid.**
- Within each row, a frame boundary is the middle of an empty gap between two cats. Never cut through
  a cat.
- Each frame must contain exactly one cat. No part of a neighbouring cat (an ear, a tail, a paw) may
  appear at its edges.
- If an effect from one frame overlaps the next cat (a flash, a flame), give that effect to the frame
  it belongs to.
- **Frame counts:** IDLE 4, RUN 7, JUMP 4, SLIDE 4, HIT 3, SUPER HIT 4, DEFEATED 3, DASH 4, CLIMB 4,
  CLIMB UP 3, CLIMB DOWN 4, SPECIAL ATTACK 3, SPECIAL END 3. If you find a different number, stop and
  say so.

**3. Keep effects with their frame.**
- Dust, hit stars, the red rage flames, the blue glow and the blue beam all stay in the frame they
  belong to.
- **The beam:** the third SPECIAL ATTACK frame is the cat *with* the beam coming out of him. Keep them
  together in one frame. Don't split the beam into a frame of its own.

**4. Remove the props that aren't the cat.**
- **CLIMB and CLIMB DOWN:** remove the drawn ladder. The game has its own ladders.
  - What to remove: the ladder's wood is a warm brown-grey; the cat's fur is a cool grey.
  - What to keep: his pink nose and mouth.
- **CLIMB UP:** remove the grey block he climbs onto, everything from the block's top edge down.
- **Cleaning up:** after removing them, delete any small loose pieces left behind, but keep the whole
  cat.

**5. Clean the background.** Make the faint haze fully transparent (alpha below about 40), so no
grey cloud or checker pattern is left around the cat. Keep soft edges on the glows and flames.

**6. One size and one place for every frame.**
- **No scaling:** don't scale any frame on its own. The cat must stay exactly the size the sheet
  draws him, in every frame.
- **Feet:** find his feet in each frame: the lowest solid (non-glow) pixel of his body, not dust or a
  shadow.
- **Middle:** find his middle in each frame: the centre of his grey fur, not of the glow, the beam or
  the dust.
- **The canvas:** put every frame on a canvas of the same size, big enough for the largest frame,
  with his feet on the same line and his middle at the same x in every frame. Leave 12 px under his
  feet.
- **The exception:** SPECIAL ATTACK may have a wider canvas of its own for the beam, with the same
  feet line.
- **In the air:** for frames where he's off the ground (JUMP), keep his drawn height in the air.

**7. What to hand back, as one zip:**
- `frames/<animation>/<animation>_00.png ...`: transparent PNGs, all the same canvas size, except
  SPECIAL ATTACK.
- `manifest.json`: for each animation, the frame files, the canvas size, where his feet and middle
  are (the pivot), a suggested fps, and whether it loops.
- `contact_sheet.png`: every frame on a plain green background, one animation per row, with a thin
  red line at the feet and a thin blue line down the middle of each frame.
- A short report: the frame counts you found, and anything you couldn't do cleanly, and where.

**8. Check your own work before handing it back.**
- Look at the contact sheet. In every frame:
  - no label;
  - no piece of another cat;
  - the cat complete;
  - his feet on the red line;
  - his middle on the blue line;
  - no ladder or block;
  - no grey haze.
- If any frame fails, fix it and check again. Say in the report which checks pass.

---

## Checking ChatGPT's result

Open its contact sheet and check each point. Each "no" is a fail:

1. No labels, or pieces of labels, in any frame?
2. One whole cat per frame, with no slice of a neighbour at the edges?
3. The frame counts right (RUN 7, CLIMB UP 3, SPECIAL ATTACK 3 and so on)?
4. The beam in the same frame as the cat firing it?
5. No ladder in CLIMB or CLIMB DOWN, and no block in CLIMB UP? His nose and mouth still there?
6. No grey haze or checkerboard around the cat?
7. His feet on the same line and his middle at the same x in every frame, and the same size
   throughout?

To compare, the main agent can cut the same sheet with the game's own cutter
(`tools/cut-battle-cat.mjs`) and make a contact sheet the same way.
