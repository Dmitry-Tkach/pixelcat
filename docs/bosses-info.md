

# TASK: Design and Implement a Reusable 2D Boss Framework for Phaser 3

## 1. Project Objective

Design and implement a reusable, extensible Boss Framework for our 2D platformer game, built with Phaser 3 and TypeScript.

The framework must support multiple unique bosses while sharing common gameplay systems, combat mechanics, animations, health management, attack execution, state transitions and phase management.

We do not want every boss implemented independently with duplicated logic.

We want a modular, data-driven architecture where new bosses can be introduced primarily through configuration, custom attack modules, animations and unique behaviours.

**Primary objective:** Build a scalable boss system that separates gameplay logic, visual animations, combat, hitboxes, health, attack patterns and arena mechanics.

Before implementation, inspect the existing repository and understand its current architecture, conventions, physics configuration, player combat system, animation system and asset organisation.

Do not blindly replace existing systems. Reuse compatible components and identify architectural conflicts before making changes.

---

# 2. Core Design Principles

Follow these principles throughout development:

1. Separation of concerns.
2. Reusable components.
3. Data-driven configuration.
4. Independent animation and combat systems.
5. Predictable state transitions.
6. Reusable attack patterns.
7. Scalable boss phase management.
8. Consistent collision and damage handling.
9. Performance-conscious Phaser implementation.
10. Testable and maintainable TypeScript code.

Bosses must be independent gameplay entities rather than ordinary enemies with increased health.

---

# 3. Boss Framework Architecture

Create a shared boss framework containing the following components.

## 3.1 BossController

The main coordinator for an individual boss.

Responsibilities:

- Initialise boss components.
- Coordinate state machine.
- Coordinate attack selection.
- Manage boss phases.
- Communicate with combat and health systems.
- Handle boss lifecycle.
- Handle defeat and cleanup.
- Coordinate interactions with the arena.

It must not contain all attack logic or animation logic directly.

## 3.2 BossStateMachine

Implement a state machine controlling boss behaviour.

Required states:

- IDLE
- DETECT_PLAYER
- CHOOSE_ATTACK
- TELEGRAPH
- ATTACK
- RECOVERY
- TAKE_DAMAGE
- STUNNED
- PHASE_TRANSITION
- DEFEATED

Requirements:

- Define explicit state transitions.
- Prevent invalid transitions.
- Support state entry and exit handlers.
- Cancel or clean up state-specific timers when leaving a state.
- Prevent attacks from executing simultaneously unless explicitly designed to do so.
- Support interruption rules for taking damage.
- Prevent any further combat actions after defeat.

## 3.3 BossAnimator

Responsible exclusively for visual animation management.

Responsibilities:

- Play idle animations.
- Play movement animations.
- Play attack animations.
- Play telegraph animations.
- Play damage animations.
- Play stun animations.
- Play phase transition animations.
- Play defeat animations.
- Synchronise animation events with combat events.

Important:\
Animations must not independently determine whether the player receives damage.

Visual animation and gameplay collision must remain separate.

## 3.4 BossCombat

Responsible for combat interactions.

Responsibilities:

- Execute attacks.
- Activate and deactivate attack hitboxes.
- Apply damage.
- Detect player collisions.
- Manage attack cooldowns.
- Handle attack interruptions.
- Prevent multiple unintended hits from one attack.
- Handle damage received from the player.
- Manage vulnerability windows.

## 3.5 BossHealth

Responsibilities:

- Store maximum health.
- Track current health.
- Receive damage.
- Notify the phase manager about health thresholds.
- Trigger defeat when health reaches zero.
- Provide health information to the UI.

## 3.6 BossPhaseManager

Responsibilities:

- Track the current phase.
- Define health thresholds.
- Trigger phase transitions.
- Change available attacks.
- Change attack frequency.
- Change boss movement parameters.
- Trigger visual transitions.
- Prevent conflicting transitions.

Phase transitions should be configurable for each boss.

## 3.7 BossConfig

Store boss-specific settings separately from the core framework.

Configuration should include:

- Boss ID.
- Display name.
- Maximum health.
- Movement speed.
- Detection range.
- Attack range.
- Initial phase.
- Phase thresholds.
- Available attacks.
- Attack cooldowns.
- Damage values.
- Telegraph durations.
- Recovery durations.
- Animation identifiers.
- Vulnerability settings.

---

# 4. Boss Behaviour and Attack System

Every attack must follow a predictable gameplay sequence:

TELEGRAPH → EXECUTION → RECOVERY

## 4.1 Telegraph Stage

Purpose: Communicate the upcoming attack to the player.

Examples:

- Boss raises its weapon.
- Boss crouches before charging.
- Boss glows before a special ability.
- Boss prepares a projectile.
- Boss jumps before a ground attack.

Requirements:

- Play the appropriate animation.
- Display visual warning effects where appropriate.
- Provide enough reaction time.
- Do not activate damaging hitboxes prematurely.

## 4.2 Execution Stage

Purpose: Execute the actual attack.

Requirements:

- Activate attack hitboxes at the correct moment.
- Apply damage only when valid collision conditions are met.
- Support multiple attack hitboxes where necessary.
- Support projectile spawning.
- Support movement during attacks.
- Support ground-based and aerial attacks.
- Support attack cancellation when appropriate.

## 4.3 Recovery Stage

Purpose: Give the player an opportunity to counterattack.

Requirements:

- Disable attack hitboxes.
- Play recovery animation.
- Reduce or temporarily disable boss offensive actions.
- Allow the player to attack.
- Return to an appropriate state after recovery.

All timings must be configurable.

---

# 5. Initial Attack Library

Create a reusable attack system supporting the following attacks.

## 5.1 ChargeAttack

Boss charges horizontally towards the player's position.

Requirements:

- Telegraph before charging.
- Calculate charge direction.
- Execute horizontal movement.
- Detect collisions.
- Stop at arena boundaries.
- Enter recovery after execution.

## 5.2 GroundSlamAttack

Boss jumps or raises itself before striking the ground.

Requirements:

- Telegraph animation.
- Ground impact.
- Optional shockwave effect.
- Ground-based damage hitboxes.
- Configurable shockwave range.
- Recovery window.

## 5.3 ProjectileAttack

Boss throws or launches projectiles.

Requirements:

- Projectile spawning.
- Configurable projectile speed.
- Configurable projectile damage.
- Configurable projectile direction.
- Collision detection.
- Projectile cleanup.
- Optional multiple projectiles.

## 5.4 JumpAttack

Boss jumps towards or above the player.

Requirements:

- Calculate target position.
- Telegraph before jumping.
- Execute jump movement.
- Detect landing.
- Optional landing damage.
- Optional shockwave.
- Recovery after landing.

All attacks must implement a shared attack interface or compatible abstraction.

Avoid creating one enormous attack class containing every possible attack behaviour.

---

# 6. Boss Phase System

Support multiple phases for every boss.

Initial recommended phase structure:

PHASE 1: 100–70% health

- Basic attacks.
- Slower movement.
- Longer recovery windows.
- Introduce attack patterns.

PHASE 2: 70–35% health

- Faster attacks.
- Introduce additional abilities.
- Reduce recovery windows moderately.
- Introduce attack combinations.

PHASE 3: 35–0% health

- More aggressive behaviour.
- More complex attack patterns.
- Special abilities.
- Unique visual effects.

These thresholds are defaults, not universal rules.

Requirements:

- Phase thresholds configurable per boss.
- Phase transition animations.
- Prevent repeated activation of the same phase transition.
- Ensure the boss cannot attack during an uninterruptible transition.
- Support different attack pools per phase.
- Support changes to movement speed and attack parameters.

Do not simply increase damage and attack speed in every phase. Each phase should create a meaningful gameplay variation.

---

# 7. Hitbox and Damage System

Implement hitbox management independently of sprite animations.

Support:

1. Boss attack hitboxes.
2. Boss vulnerable hitboxes.
3. Player attack hitboxes.
4. Projectile hitboxes.
5. Environmental damage zones.

Requirements:

- Hitboxes can be activated and deactivated independently.
- Hitbox dimensions can differ from sprite dimensions.
- Support directional hitboxes.
- Support multiple hitboxes during one attack.
- Prevent duplicate damage from a single attack unless explicitly configured.
- Support invulnerability frames.
- Support damage interruption rules.
- Clean up hitboxes when attacks finish or are cancelled.

Use the existing Phaser physics system where appropriate.

If Arcade Physics is already used, prefer compatible Arcade Physics solutions.

Do not introduce another physics engine without a strong architectural reason.

---

# 8. Arena System

Boss encounters should support dedicated arenas.

Arena responsibilities:

- Define movement boundaries.
- Manage platforms.
- Manage environmental hazards.
- Support arena-specific events.
- Provide spawn positions.
- Control encounter activation.
- Prevent the boss from leaving the intended fight area.

Support optional environmental mechanics such as:

- Moving platforms.
- Falling objects.
- Spikes.
- Temporary hazards.
- Destructible objects.
- Interactive elements.

Arena mechanics must remain independent of the boss's core combat logic.

---

# 9. UI and Feedback

Implement a reusable boss health bar.

Requirements:

- Display boss name.
- Display current health.
- Display maximum health.
- Smooth health bar transitions.
- Update when damage is received.
- Support phase indicators where appropriate.
- Hide or remove the health bar after defeat.

Combat feedback should support:

- Damage animation.
- Knockback.
- Hit effects.
- Screen shake.
- Particles.
- Sound effects.
- Attack warning indicators.
- Boss defeat effects.

Effects must be modular and reusable.

---

# 10. Technical Project Structure

Use the following as the target structure, adapting it to the repository's existing conventions.

src/\
bosses/\
core/\
BossController.ts\
BossStateMachine.ts\
BossHealth.ts\
BossCombat.ts\
BossAnimator.ts\
BossConfig.ts\
BossPhaseManager.ts

```
attacks/
  BossAttack.ts
  ChargeAttack.ts
  GroundSlamAttack.ts
  ProjectileAttack.ts
  JumpAttack.ts

phases/
  BossPhase.ts
  BossPhaseManager.ts

entities/
  GiantRat/
    GiantRat.ts
    GiantRatConfig.ts
    animations.ts
    attacks.ts
    assets/

  EvilCat/
    EvilCat.ts
    EvilCatConfig.ts
    animations.ts
    attacks.ts
    assets/

arena/
  BossArena.ts
  ArenaHazard.ts

ui/
  BossHealthBar.ts
```

systems/\
DamageSystem.ts\
HitboxSystem.ts\
EffectsSystem.ts

This is a suggested logical structure. Avoid duplicate classes where functionality can be shared. In particular, ensure there is only one authoritative phase manager implementation.

---

# 11. Data-Driven Attack Configuration

Attack parameters should be stored in configuration objects.

Example:

interface BossAttack {\
name: string;\
telegraphDuration: number;\
attackDuration: number;\
recoveryDuration: number;\
damage: number;\
cooldown: number;\
}

Example configuration:

const bossAttacks = [\
{\
name: "charge",\
telegraphDuration: 600,\
attackDuration: 400,\
recoveryDuration: 1200,\
damage: 20,\
cooldown: 2000\
},\
{\
name: "groundSlam",\
telegraphDuration: 800,\
attackDuration: 300,\
recoveryDuration: 1500,\
damage: 30,\
cooldown: 3000\
}\
];

These values are examples only.

Use appropriate TypeScript interfaces, discriminated unions or other type-safe approaches as necessary.

Ensure each attack can define its own parameters, hitbox behaviour, animations and special effects.

---

# 12. Animation Requirements

The framework must support the following animation categories:

- idle
- walk
- run
- jump
- fall
- telegraph
- attack
- special_attack
- take_damage
- stunned
- phase_transition
- defeated

Not every boss must have every animation.

Requirements:

- Animation identifiers configurable per boss.
- Correct facing direction.
- Consistent sprite positioning.
- Correct origin and body dimensions.
- Animation event synchronisation.
- No unnecessary animation restarts.
- Correct animation cleanup.
- Support sprite sheets and atlas-based assets.

Do not assume all bosses use identical sprite dimensions or frame counts.

Assets must remain separate from the combat framework.

---

# 13. Testing Requirements

Create automated tests for systems where practical.

Test:

## State machine

- Valid state transitions.
- Invalid transition rejection.
- State interruption.
- Cleanup when leaving a state.
- Defeat state locking.

## Combat

- Attack execution.
- Hitbox activation.
- Hitbox deactivation.
- Damage application.
- Cooldown handling.
- Duplicate damage prevention.
- Player invulnerability handling.

## Health

- Damage calculation.
- Maximum health.
- Zero health.
- Defeat triggering.

## Phases

- Correct health thresholds.
- Correct transition activation.
- No duplicate phase transitions.
- Correct attack pool changes.

## Lifecycle

- Boss initialisation.
- Boss destruction.
- Timer cleanup.
- Projectile cleanup.
- Event listener cleanup.

Also build a dedicated Phaser test scene that demonstrates the complete boss encounter.

---

# 14. Development and Implementation Strategy

Do not implement everything in one uncontrolled operation.

Work in stages.

STAGE 1 — Repository inspection

- Understand the existing game architecture.
- Identify physics, player combat and animation systems.
- Identify existing reusable components.
- Present an architecture proposal.
- Identify potential conflicts.

STAGE 2 — Core architecture

- Implement BossController.
- Implement BossStateMachine.
- Implement BossHealth.
- Implement BossAnimator.
- Implement BossCombat.
- Implement BossPhaseManager.
- Establish type-safe configuration.

STAGE 3 — Combat systems

- Implement hitbox management.
- Implement damage handling.
- Implement cooldowns.
- Implement invulnerability.
- Implement attack cancellation.

STAGE 4 — Attack library

- Implement ChargeAttack.
- Implement GroundSlamAttack.
- Implement ProjectileAttack.
- Implement JumpAttack.

STAGE 5 — Phase management

- Implement configurable phases.
- Implement attack pools.
- Implement transitions.
- Implement phase-specific parameters.

STAGE 6 — Arena and UI

- Implement arena boundaries.
- Implement environmental hazards.
- Implement boss health bar.
- Integrate combat feedback.

STAGE 7 — Demonstration boss

- Implement one complete boss using the framework.
- Use placeholder graphics if production assets are not ready.
- Demonstrate all required attacks.
- Demonstrate three phases.
- Demonstrate defeat.

STAGE 8 — Testing and optimisation

- Run automated tests.
- Test the complete encounter in Phaser.
- Inspect collisions and timing.
- Check memory and event cleanup.
- Fix identified bugs.
- Verify existing gameplay remains functional.

---

# 15. Important Development Constraints

- Use Phaser 3 and TypeScript.
- Follow the repository's existing coding conventions.
- Do not rewrite the entire game.
- Do not duplicate existing player damage or physics systems.
- Do not hardcode boss-specific behaviour into shared systems.
- Do not mix rendering, animation and combat responsibilities.
- Do not use arbitrary delays where Phaser animation events or state-managed timers are more appropriate.
- Avoid unnecessary dependencies.
- Keep the architecture extensible.
- Use clear names and strict TypeScript typing.
- Do not generate production artwork as part of this task.
- Use placeholders for missing visual assets.
- Do not introduce unnecessary abstractions or over-engineer the framework.

---

# 16. Expected Deliverables

At completion, provide:

1. Architecture overview.
2. Implemented folder structure.
3. Core boss framework.
4. Reusable attack library.
5. Configurable phase system.
6. Hitbox and damage integration.
7. Boss health bar.
8. Arena integration.
9. One fully functional demonstration boss.
10. Automated tests.
11. Phaser demonstration scene.
12. Documentation explaining how to add a new boss.

## Definition of Done

The task is complete when:

- A boss can be created using the shared framework.
- The boss can detect and respond to the player.
- It can execute all four initial attack types.
- Every attack has telegraph, execution and recovery stages.
- Attack hitboxes are independent of visual animations.
- The boss can transition between three phases.
- The boss can receive and deal damage correctly.
- The boss health bar updates correctly.
- The boss can be defeated.
- All relevant timers, events, projectiles and hitboxes are cleaned up.
- A second boss can be added without modifying the core framework.
- Existing player and level systems remain functional.

## Final instruction to Claude

Start with STAGE 1.

Inspect the repository and report your findings before making architectural changes.

Provide:

- Current architecture assessment.
- Existing systems that can be reused.
- Proposed integration strategy.
- Recommended implementation order.
- Potential technical risks.

Wait for approval of the architecture proposal before implementing the framework.

Prioritise a robust, maintainable and reusable gameplay system over simply producing a large amount of code.

## How to use this with Claude Code

I recommend this workflow:

1. Open your Phaser 3 project in VS Code.
2. Start Claude Code in the project root.
3. Paste the complete specification above.
4. Let Claude inspect the repository.
5. Review its architecture proposal before approving implementation.

One important recommendation: Don't let Claude build all bosses at once. First build the framework and one complete demonstration boss. Once that works, use the same framework for your Giant Rat, Evil Cat and future bosses.

This will make collaboration between Claude (programming and architecture) and GPT (game design, mechanics and artwork) much more efficient.