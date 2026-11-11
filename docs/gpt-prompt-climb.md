# Prompt: ask ChatGPT to draw the battle cat climbing

**Before you paste it,** attach the cat's existing sprite sheet as the reference for his look and
size:
- `grey_cat_development_assets/source_redrawn_sheet.png` for bare paws;
- `cat-v-2-sprite.png` for the version with the minigun.

Use the same ChatGPT chat you drew him in, if you can, so he stays the same cat.

Then paste everything below the line. Make one image per version: first with bare paws, then, in a
second message, with the minigun (the last section).

---

Using the attached sprite sheet as the reference for the character and the art style, draw a new
sprite sheet of **the same grey tabby cat climbing a ladder**, for a 2D platformer game.

**What to draw**
- **The view:** the cat seen **from behind**, climbing up and down a ladder. We see his back, the back
  of his head and ears, and his tail. His paws grip the rungs.
- **No ladder:** don't draw the ladder at all. He climbs an invisible ladder: his paws grip rungs
  that aren't drawn. The game draws its own ladder behind him.
- **Everything else matches the reference exactly:** the same cat, the same size, the same outline
  thickness, the same colours and the same shading.

**The animations, one row each, frames left to right**
1. **CLIMB UP, 6 frames,** looping. He reaches up with one front paw while pushing with the opposite
   back paw, then the other side. Over the 6 frames he climbs exactly two rungs, so the loop repeats
   smoothly.
2. **CLIMB DOWN, 6 frames,** looping. The same, going down: a back paw reaches down first. Not just
   climb up played backwards: his head looks down a little.
3. **HANG, 1 frame.** Holding still on the ladder, all four paws on rungs, looking up.
4. **PULL UP, 4 frames.** At the top of the ladder: he pulls himself up over the edge of a ledge
   (not drawn), and ends standing, seen from the side, facing right, as in the reference's IDLE
   frames.

**The layout**
- **The grid:** 6 columns of **equal square cells**, one animation per row, in the order above. Unused
  cells stay empty.
- **Placing him:** in every cell he's centred left to right, at the same size as in the reference.
- **CLIMB UP, CLIMB DOWN and HANG:** his body is at the same height in every cell, so the game can move
  him up the ladder smoothly. Only his paws and legs move.
- **PULL UP:** his feet end on the same line as the bottom of the cells.
- **Background:** fully transparent: a real transparent background, not a checkerboard pattern drawn
  in, and no grey haze or shadow around him.
- **Nothing else:** no text, no labels, no frame numbers, no ladder, no ground, no ledge, no effects.

**Before you finish, check:**
- every row has the right number of frames;
- the cat is the same size in every frame and matches the reference;
- nothing is drawn but the cat, with no ladder and no labels;
- the background is truly transparent.

---

**For the version with the minigun,** send this as a second message in the same chat, with
`cat-v-2-sprite.png` attached:

> Now draw the same sheet again, with the same layout, rows and frames, of the cat from the attached
> sheet, who carries a minigun. While he climbs, the minigun is **strapped on his back**, so his paws
> are free for the rungs. In the PULL UP frames he takes it in his paws as he stands, ending as in the
> reference's IDLE frames. Everything else as before: a transparent background, no ladder, no labels.

---

## Checking the result

- **The ladder:** none drawn? Do his paws look like they're gripping rungs?
- **The frames:** 6 + 6 + 1 + 4, in the right rows?
- **Size:** is he the same size in every frame, and the same as the reference?
- **The body:** does it stay at the same height in CLIMB UP, CLIMB DOWN and HANG?
- **The background:** real transparency, with no checkerboard and no labels?

**Then put the images in the project and tell the main agent.** It will cut them with the game's
cutter, line them up and show a contact sheet before they go into the game.
