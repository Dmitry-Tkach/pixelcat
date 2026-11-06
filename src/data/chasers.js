// The characters who chase the cat. Levels list who chases in `chasers`: the first starts the
// level, and each Super Paw knockout brings in the next. The last one keeps coming back.
//
// character:  which entry in data/characters.js to draw
// speedDelta: added to the level's ownerSpeed. It must stay below the cat's speed.
// arrival:    an optional message when they join the chase
// rush:       optional sudden sprints: every `everySeconds`, run `extraSpeed` faster for `seconds`
// catchMessage, catchSound: optional replacements for the defaults when they catch the cat

export const CHASERS = {
  girl: {
    character: 'owner',
    speedDelta: 0,
    catchMessage: 'So many cuddles! And then, the carrier. There\'s still time for one more try.',
    catchSound: 'caughtHug',
  },
  boy: {
    character: 'boy',
    speedDelta: 10,
    arrival: 'The boy joins the chase. He\'s quick!',
    catchMessage: 'He got you, and he\'s not letting go. Then it\'s the carrier. There\'s still time for one more try.',
    catchSound: 'caughtHug',
  },
  grandma: {
    character: 'grandma',
    speedDelta: -15,
    arrival: 'Grandma\'s coming. Watch for her rushes!',
    catchMessage: 'Grandma scoops you up for a long, long cuddle. Then it\'s the carrier. There\'s still time for one more try.',
    catchSound: 'caughtHug',
    rush: { everySeconds: 7, seconds: 1.2, extraSpeed: 130 },
  },
};
