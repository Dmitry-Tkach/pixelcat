// The thin dark edge that lifts characters, obstacles and power-ups off the scenery is drawn into
// their art by tools/outline-art.mjs, so it costs nothing while the game runs. An outline effect
// added here cost a drawing pass for every object, every frame, and the frame rate fell.
// Kept as a no-op so the places that mark what gets an outline still read clearly.
export function outline(object) {
  return object;
}
