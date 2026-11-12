# The troll fight: design and plan

The Wood world's boss, at the top of Wood 3, "Heart of the Tree". Agreed with the owner on
2026-11-12. The numbers are starting points, to be tuned in playtests.

## The idea

A big, slow, strong troll with a club. Every attack is heavy and shakes the world; he never shoots.
Each attack has a clear warning, and most leave him open for a moment afterwards. The fight is about
watching, dodging and hitting back at the right time, not standing and holding X.

- **Length:** about 90 seconds when played well.
- **How hard:** medium. Clear warnings, but standing still and shooting loses.
- **Health:** 120, counted in minigun rounds. The minigun fires about 8 rounds a second, so a
  weak moment of shooting takes about 10, and about 12 of them win the fight.

## His animations

He has only the pack's 7 (10 frames each): idle, walk, run, jump, attack, hurt, dead. Every other
pose is made from them by playing part of an animation, or holding a frame:

| Pose | Made from |
|---|---|
| Walking to the cat | walk |
| Warning before a smash or the stone burst | attack frames 2–5 (club up), holding frame 5 |
| The smash lands | attack frame 6 |
| Stuck: bent over, club on the ground | attack frames 7–8, held |
| Warning before the charge or the jump | jump frames 2–3 (the crouch) |
| The charge | run (the club held high) |
| The jump slam | jump frames 4–6 in the air, 7–10 landing |
| Dizzy, after hitting a wall | hurt, the middle frames played slowly back and forth, stars over his head (drawn in code) |
| A big hit (the bolt) | hurt |
| The roar, at a new part | jump frames 5–6 (arms wide) held, red glow, screen shake |
| Beaten | dead |

## His attacks

| Attack | When | Warning | What happens | His weak moment |
|---|---|---|---|---|
| **Quick smash** | the cat is close | club up, 0.5 s | the club hits the floor right in front of him | stuck, 0.8 s |
| **Big smash** | the cat is further away | club up, 0.9 s | a shock wave rolls along the floor both ways: jump it | stuck, 1.5 s |
| **Stone burst** | part 2 on | club up, and glowing cracks in the floor, 1 s | 5–7 stones fly in high arcs, a growing shadow where each will land, always a gap of 2 tiles or more. The cat can shoot them down. | stuck, 1.2 s |
| **Charge** | part 2 on, the cat is far | crouch, 0.7 s | he runs across the arena, club up | dizzy, 2 s, if he hits a wall |
| **Jump slam** | part 3, or the cat is up on an island | crouch, 0.7 s, then a shadow where he'll land | he lands on the cat's spot; the tree shakes | landing crouch, 1 s |

- **Cooldowns:** each attack waits a few seconds before he picks it again, so he mixes them.
- **Never the same attack twice in a row,** unless it's the only one he can use.
- **Touching him** hurts only during the charge and the jump slam. His club hurts only in the moment
  it lands. Each attack can hurt the cat once.

## The three parts

| Part | Health | What's new |
|---|---|---|
| **1** | 100–70% | the quick smash and the big smash; slow walking |
| **2** | 70–35% | he roars and turns red; the stone burst and the charge; two acorn goblins drop in now and then, so the cat can earn the magic bolt |
| **3** | 35–0% | the jump slam; chains of two attacks (a big smash then the stone burst, a jump slam then a charge) |

- **The roar** at the start of a part: about 1.5 s. He can't be hurt during it.
- **A big hit past two marks at once** plays one roar, to the later part.
- **The roar waits** for the attack he's in to finish. If he passes a mark during a weak moment,
  the weak moment ends and he roars at once, so a part can't be skipped by shooting through it.
- **Ammo:** he needs about 120 rounds in all. The cat brings what he has; ammo crates fall when the
  tree shakes, in parts 2 and 3.

## The cat's damage on him

| The cat's attack | Damage |
|---|---|
| Standard round | 1 |
| Laser round | 1 |
| Explosive round | 3 |
| Magic bolt | 20, and he staggers (hurt) |
| Jumping on his head | 8, only in his weak moments; the cat bounces off (about 15 win the fight) |
| Dash or rage | none: the cat bounces off |

- **Outside his weak moments,** everything does half damage. In them, full damage.
- **Nothing hurts him** during his entrance, his roars, or once he's beaten.

## The arena

- One screen wide, a solid floor, walls at both ends (the charge hits them).
- Two low islands, left and right: safe from the shock wave, but he jumps at a cat standing on one.
- Branches above, which shake when he smashes or lands.
- A checkpoint lantern at the arena door, with the minigun and an ammo crate before it.
- The camera stays still on the arena during the fight.

## The show

- **The entrance:** he drops in, the ground shakes, he roars, the health bar fills (2–3 s).
- **His health bar:** his name, the bar with a slow "ghost" part behind it, and marks at 70% and 35%.
- **Hits:** a white flash on him and a small impact. A big hit makes him stagger.
- **Each attack has its own warning sound** (a growl before the smash, a snort before the charge).
- **The finish:** slow motion on the last hit, he falls (dead), a flash, then the win screen with
  `troll-defeted.gif`. The crystals found give the level's stars, as in every level.
- **After 3 losses in a row,** the game offers an easier try: he has a quarter less health.

## How it's built

Plain JavaScript, in the adventure's own files. The runner's bosses (`BossDirector.js`) stay as
they are.

- **The brain,** with no Phaser, tested with vitest, in `src/systems/adventure/bosses/`:
  - `bossStateMachine.js`: the states, the moves allowed between them, entry and exit steps, and
    timers that are cleared on leaving a state. Locked once he's beaten.
  - `bossBrain.js`: his health, his parts, which attack he picks (by where the cat is, cooldowns and
    chains), his weak moments, and the damage he takes.
- **The data:** `src/data/adventure/bossFights.js`, his fight; `src/data/adventure/bosses.js`, his art.
- **The body,** with Phaser:
  - `src/entities/AdventureBoss.js`: his sprite, animations, hitboxes and facing;
  - `src/entities/adventureBossAttacks/`: one small file per kind of attack;
  - `src/entities/AdventureBossArena.js`: walls, camera, falling things, goblins.
- **The health bar:** `src/ui/AdventureBossBar.js`.
- **Trying it:** `?boss=troll1` opens the arena straight away (in development only).

### His states

```
intro → idle (walks to the cat) → windup (the warning) → attack → weak (stuck / dizzy / landing) → idle …
  at a new part's mark:   … → roar → idle
  out of health:          any state → defeated (nothing happens after this)
```

## The order of work

1. **The brain:** states, health, parts, attack choice, damage. Tests only, nothing on screen.
2. **The troll in a test arena** (`?boss=troll1`): walking, both smashes, the shock wave, the health
   bar, winning. The owner can play from here.
3. **The cat's attacks on him:** the damage table, half damage outside weak moments, head jumps.
4. **Parts 2 and 3:** the stone burst, the charge, the jump slam, chains, goblins, the roar.
5. **The arena in Wood 3,** and the climb before it.
6. **The show:** the entrance, sounds, the finish, the easier try.

Each step is a commit with tests. A guide, "how to add a new boss", is written once step 4 is done.
