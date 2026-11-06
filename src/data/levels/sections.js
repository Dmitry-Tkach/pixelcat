// Reusable stretches of a level. Times are in seconds at full running speed, so the same section
// scales to any level's speed. `duration` must leave room after the last obstacle.
//
// Room needed after an obstacle (npm test checks this): jump 1.35s, slide or read 1.55s,
// double jump 2.4s. A `combo` entry may follow the one before it after 1.1s.
// A double-jump obstacle also needs 2.2s of room before it, for the run-up.
//
// obstacles: { type, t, combo, position }
// platforms: { t, seconds, height, style }, floating ledges the cat can jump up through
// treats:    { arc: t } follows a jump over that moment, or { line: t, count, height }
// pickups:   { t, type }, attacks: { t }, checkpoint: { t }
// wagons:    { t }, a hay wagon whose rear reaches the cat at this moment
// mouseSpot: { t, height }, where the level's hidden toy mouse sits, if its plan picks this section

const arcs = (...times) => times.map((arc) => ({ arc }));
const lowLine = (line, count = 4) => ({ line, count, height: 30 });

export const SECTIONS = {
  breather: {
    duration: 2,
    treats: [lowLine(0.3, 8)],
  },
  // The relief before the escape point: nothing to dodge, and treats to collect.
  homeStretch: {
    duration: 2,
    treats: [lowLine(0.2, 10)],
  },
  checkpoint: {
    duration: 2,
    checkpoint: { t: 0.3 },
    treats: [lowLine(0.8, 5)],
  },
  hops: {
    duration: 4.05,
    obstacles: [{ type: 'cone', t: 0 }, { type: 'hydrant', t: 1.35 }, { type: 'barrier', t: 2.7 }],
    treats: arcs(0, 1.35, 2.7),
  },
  benches: {
    duration: 4.05,
    obstacles: [{ type: 'bench', t: 0 }, { type: 'boxes', t: 1.35 }, { type: 'manhole', t: 2.7 }],
    treats: arcs(0, 1.35, 2.7),
  },
  duck: {
    duration: 4.65,
    obstacles: [{ type: 'scaffold', t: 0 }, { type: 'washingLine', t: 1.55 }, { type: 'banner', t: 3.1 }],
    treats: [lowLine(-0.15), lowLine(1.4), lowLine(2.95)],
  },
  trip: {
    duration: 4.05,
    obstacles: [{ type: 'manhole', t: 0 }, { type: 'barrel', t: 1.35 }, { type: 'manhole', t: 2.7 }],
    treats: arcs(0, 2.7),
  },
  dogs: {
    duration: 5.8,
    obstacles: [
      { type: 'dog', t: 0 },
      { type: 'cone', t: 1.35 },
      { type: 'leapingDog', t: 2.7 },
      { type: 'flowerPot', t: 4.25 },
    ],
    treats: arcs(1.35),
  },
  // The van sits partway in, because a double jump needs a clear run-up.
  van: {
    duration: 3.3,
    mouseSpot: { t: 0.9, height: 420 },
    obstacles: [{ type: 'van', t: 0.9 }],
    pickups: [{ t: 0.9, type: 'superPaw' }],
    treats: [{ line: 0.95, count: 5, height: 300 }],
  },
  bounce: {
    duration: 2.1,
    mouseSpot: { t: 1, height: 430 },
    obstacles: [{ type: 'bin', t: 0 }],
    pickups: [{ t: 0.75, type: 'superPaw' }],
    treats: [{ line: 0.35, count: 5, height: 300 }],
  },
  flock: {
    duration: 4.45,
    obstacles: [{ type: 'pigeonFlock', t: 0 }, { type: 'highBird', t: 1.55 }, { type: 'bird', t: 2.9 }],
    treats: [lowLine(1.1, 3)],
  },
  crates: {
    duration: 4.65,
    obstacles: [
      { type: 'crate', t: 0, position: 'low' },
      { type: 'crate', t: 1.55, position: 'high' },
      { type: 'crate', t: 3.1, position: 'low' },
    ],
  },
  sprinklers: {
    duration: 4.65,
    obstacles: [
      { type: 'sprinkler', t: 0, position: 'on' },
      { type: 'sprinkler', t: 1.55, position: 'off' },
      { type: 'sprinkler', t: 3.1, position: 'on' },
    ],
    treats: [lowLine(1.45, 3)],
  },
  combos: {
    duration: 5.3,
    obstacles: [
      { type: 'barrier', t: 0 },
      { type: 'banner', t: 1.1, combo: true },
      { type: 'cone', t: 2.65 },
      { type: 'washingLine', t: 3.75, combo: true },
    ],
  },
  // Many different moves in a row, for late levels.
  gauntlet: {
    duration: 6.75,
    obstacles: [
      { type: 'cone', t: 0 },
      { type: 'banner', t: 1.1, combo: true },
      { type: 'dog', t: 2.65 },
      { type: 'crate', t: 4, position: 'high' },
      { type: 'manhole', t: 5.55 },
    ],
    treats: [{ arc: 2.65 }, { arc: 5.55 }],
  },
  // A long chain of ledges over a busy road.
  highRoad: {
    duration: 7.4,
    mouseSpot: { t: 5.4, height: 340 },
    obstacles: [{ type: 'hydrant', t: 1 }, { type: 'barrel', t: 2.4 }, { type: 'bench', t: 3.75 }, { type: 'cone', t: 5.1 }],
    platforms: [
      { t: 0.4, seconds: 1, height: 150, style: 'plank' },
      { t: 1.9, seconds: 1, height: 215, style: 'awning' },
      { t: 3.4, seconds: 1, height: 160, style: 'plank' },
      { t: 4.9, seconds: 1, height: 220, style: 'awning' },
    ],
    treats: [
      { line: 0.5, count: 4, height: 200 },
      { line: 2, count: 4, height: 265 },
      { line: 3.5, count: 4, height: 210 },
      { line: 5, count: 4, height: 270 },
    ],
  },
  lunge: {
    duration: 2.3,
    attacks: [{ t: 0.1 }],
    treats: [lowLine(1.5, 3)],
  },
  // A chain of ledges above ground obstacles: a clean high route, or a busier ground route.
  ledges: {
    duration: 5.4,
    obstacles: [{ type: 'cone', t: 1 }, { type: 'boxes', t: 2.4 }, { type: 'manhole', t: 3.75 }],
    platforms: [
      { t: 0.4, seconds: 1, height: 150, style: 'awning' },
      { t: 1.9, seconds: 1, height: 200, style: 'plank' },
      { t: 3.4, seconds: 1, height: 150, style: 'awning' },
    ],
    treats: [
      { line: 0.5, count: 5, height: 200 },
      { line: 2, count: 5, height: 250 },
      { line: 3.5, count: 5, height: 200 },
    ],
  },
  // Two ways through. High up there are far more treats, but a low bird flies right at the ledges.
  // The road has fewer treats, and the bird passes safely overhead.
  twoRoutes: {
    duration: 6.9,
    mouseSpot: { t: 5.4, height: 300 },
    obstacles: [{ type: 'cone', t: 1 }, { type: 'highBird', t: 3.7 }, { type: 'bench', t: 5.2 }],
    platforms: [
      { t: 0.4, seconds: 1, height: 150, style: 'plank' },
      { t: 1.9, seconds: 1, height: 190, style: 'awning' },
      { t: 3.4, seconds: 1, height: 150, style: 'plank' },
      { t: 4.9, seconds: 1, height: 190, style: 'awning' },
    ],
    treats: [
      { line: 0.5, count: 5, height: 200 },
      { line: 2, count: 5, height: 240 },
      { line: 3.5, count: 5, height: 200 },
      { line: 5, count: 5, height: 240 },
      lowLine(3.2, 3),
    ],
  },

  // ----- City -----
  // Bounce off the bin to reach the rooftops: a run over the traffic, full of treats.
  rooftops: {
    duration: 8,
    mouseSpot: { t: 6.9, height: 440 },
    obstacles: [
      { type: 'bin', t: 0.9 },
      { type: 'hydrant', t: 2.3 },
      { type: 'bench', t: 3.65 },
      { type: 'cone', t: 5 },
      { type: 'manhole', t: 6.35 },
    ],
    platforms: [
      { t: 1.5, seconds: 2, height: 300, style: 'rooftop' },
      { t: 3.9, seconds: 1.7, height: 270, style: 'rooftop' },
      { t: 6, seconds: 1.8, height: 300, style: 'rooftop' },
    ],
    treats: [
      { line: 1.7, count: 10, height: 350 },
      { line: 4, count: 8, height: 320 },
      { line: 6.1, count: 8, height: 350 },
    ],
  },
  // Teaches the lights: green means keep running, and red means jump the car.
  crossingIntro: {
    duration: 4.2,
    obstacles: [{ type: 'crossingCar', t: 1, position: 'green' }, { type: 'crossingCar', t: 2.55, position: 'red' }],
    treats: [lowLine(0.7, 4), { arc: 2.55 }],
  },
  crossings: {
    duration: 5.7,
    obstacles: [
      { type: 'crossingCar', t: 1, position: 'red' },
      { type: 'crossingCar', t: 2.55, position: 'green' },
      { type: 'crossingCar', t: 4.1, position: 'red' },
    ],
    treats: [{ arc: 1 }, lowLine(2.3, 4), { arc: 4.1 }],
  },
  rushHour: {
    duration: 7.3,
    obstacles: [
      { type: 'crossingCar', t: 1, position: 'red' },
      { type: 'crossingCar', t: 2.55, position: 'red' },
      { type: 'crossingCar', t: 4.1, position: 'green' },
      { type: 'crossingCar', t: 5.65, position: 'red' },
    ],
    treats: [{ arc: 1 }, { arc: 2.55 }, lowLine(3.85, 4), { arc: 5.65 }],
  },

  // ----- Village -----
  // Crates and laundry fall as the cat runs through the market.
  fallingMarket: {
    duration: 5.1,
    obstacles: [{ type: 'fruitCrate', t: 1 }, { type: 'laundry', t: 2.35 }, { type: 'fruitCrate', t: 3.7 }],
    treats: arcs(1, 2.35, 3.7),
  },
  // Land on the first awning and bounce from stall to stall, high over the market.
  marketStalls: {
    duration: 6.5,
    mouseSpot: { t: 3, height: 450 },
    obstacles: [
      { type: 'marketStall', t: 1 },
      { type: 'marketStall', t: 2.35 },
      { type: 'marketStall', t: 3.7 },
      { type: 'fruitCrate', t: 5.05 },
    ],
    treats: [
      { line: 1.25, count: 6, height: 430 },
      { line: 2.6, count: 6, height: 430 },
      { line: 3.95, count: 4, height: 300 },
    ],
  },

  // ----- Farm -----
  // Red flag: a tractor crosses, so jump it. Green flag: keep running.
  tractors: {
    duration: 5.7,
    obstacles: [
      { type: 'tractorCrossing', t: 1, position: 'red' },
      { type: 'tractorCrossing', t: 2.55, position: 'green' },
      { type: 'tractorCrossing', t: 4.1, position: 'red' },
    ],
    treats: [{ arc: 1 }, lowLine(2.3, 4), { arc: 4.1 }],
  },
  // Wide mud, with treats that show the jump across.
  mudPatch: {
    duration: 3,
    obstacles: [{ type: 'mudPool', t: 1 }],
    treats: arcs(1),
  },
  // Big bales keep rolling at the cat, one jump after another.
  hayRoll: {
    duration: 5,
    obstacles: [{ type: 'bigHay', t: 1 }, { type: 'bigHay', t: 2.35 }, { type: 'bigHay', t: 3.7 }],
    treats: arcs(1, 2.35, 3.7),
  },
  // Mud on both sides of a bale.
  muddyRoad: {
    duration: 6.2,
    obstacles: [{ type: 'mudPool', t: 1 }, { type: 'bigHay', t: 2.75 }, { type: 'mudPool', t: 4.5 }],
    treats: arcs(1, 2.75, 4.5),
  },
  // A hay wagon drives into view. Up top is a fast, treat-filled ride over everything on the road.
  hayWagon: {
    duration: 7.4,
    mouseSpot: { t: 5, height: 330 },
    wagons: [{ t: 2 }],
    obstacles: [{ type: 'cone', t: 2.6 }, { type: 'boxes', t: 4 }, { type: 'mudPool', t: 5.7 }],
    treats: [
      { line: 2.3, count: 6, height: 200 },
      { line: 3.5, count: 6, height: 200 },
      { line: 4.7, count: 6, height: 200 },
    ],
  },
  // ----- Finale -----
  // Something from every world on the journey, one after another.
  finale: {
    duration: 8.6,
    obstacles: [
      { type: 'crossingCar', t: 1, position: 'red' },
      { type: 'mudPool', t: 2.85 },
      { type: 'bigHay', t: 4.5 },
      { type: 'marketStall', t: 5.85 },
      { type: 'fruitCrate', t: 7.2 },
    ],
    treats: [{ arc: 1 }, { arc: 2.85 }, { arc: 4.5 }, { line: 6.1, count: 5, height: 430 }, { arc: 7.2 }],
  },
  // One last lunge, then a clear run to the door with the whole family right behind.
  vetDash: {
    duration: 4,
    attacks: [{ t: 0.1 }],
    treats: [lowLine(1.6, 8)],
  },
  // A climb: the second ledge is higher, with a tempting line of treats.
  climb: {
    duration: 4.2,
    mouseSpot: { t: 3.2, height: 440 },
    obstacles: [{ type: 'hydrant', t: 1.2 }, { type: 'barrier', t: 2.7 }],
    platforms: [
      { t: 0.4, seconds: 1.2, height: 180, style: 'plank' },
      // Low enough that an air jump still reaches it, for a cat that just ran off the first ledge.
      { t: 2, seconds: 1.2, height: 320, style: 'awning' },
    ],
    treats: [{ line: 2.1, count: 6, height: 370 }],
  },
};
