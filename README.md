# Teleop Dojo

A browser-based robotic arm teleoperation training game built for [PrismaX](https://prismax.ai) — a decentralized platform connecting teleoperators with physical robots to collect AI training data.

Teleop Dojo simulates the teleoperation experience, training players on precision, judgment, and smoothness using a virtual SO-100 / Koch v1.1 desktop robot arm (5-DOF + gripper).

## Getting Started

```bash
npm install
npm run dev       # Start dev server (http://localhost:5173)
npm run build     # Production build to dist/
```

## Tech Stack

- **TypeScript + Vite** — build and dev tooling
- **Three.js** — 3D rendering
- **Rapier3D** (`@dimforge/rapier3d-compat`) — deterministic WASM physics engine
- **HTML/CSS overlays** — HUD and UI elements

## Controls

| Key     | Action              |
| ------- | ------------------- |
| Up / Down   | Elbow up / down         |
| A / D   | Shoulder rotation   |
| Left / Right | Wrist roll          |
| W / S   | Wrist pitch         |
| Q / E   | Z-axis lift up / down |
| C / V   | Base slide          |
| Z / X   | Grip open / close   |

Mouse controls the orbit camera.

## Game Flow

1. An object spawns on the table
2. Position the arm above the object (ALIGN)
3. Descend into the commit zone (COMMIT_ZONE)
4. Open gripper, close to grasp (GRASP_ATTEMPT)
5. Lift and hold steady (LIFT → HOLD)
6. Round ends with SUCCESS or FAIL → score summary

State machine: `IDLE → SPAWN → ALIGN → COMMIT_ZONE → GRASP_ATTEMPT → LIFT → HOLD → SUCCESS/FAIL → SUMMARY`

## Scoring

All scoring is computed **post-round** — no real-time score display during play.

| Component    | Weight | Description                                      |
| ------------ | ------ | ------------------------------------------------ |
| Alignment    | 35%    | Lateral error (60%) + angular error (40%)        |
| Judgment     | 25%    | Commit zone corrections + abort timing penalties |
| Smoothness   | 20%    | Joint velocity variance (lower = better)         |
| Stability    | 20%    | Angular velocity in first 500ms post-lift        |

Scoring is fully deterministic — identical inputs produce identical scores.

## Objects

8 graspable objects with varying difficulty:

| Object  | Challenge                |
| ------- | ------------------------ |
| Box     | Forgiving / tutorial     |
| Mug     | Asymmetric grasp         |
| Bottle  | Stability challenge      |
| Banana  | Alignment challenge      |
| Can     | Cylindrical grasp        |
| Block   | Compact / precise        |
| Puck    | Low-profile target       |
| Pen     | Narrow / high difficulty |

All objects use procedural geometry (Three.js primitives with Rapier colliders).

## Architecture

```
src/
  main.ts                  # Entry point: init WASM, scene, game loop
  simulator/
    scene.ts               # Three.js renderer, lighting, environment
    camera.ts              # PerspectiveCamera + OrbitControls
    physics.ts             # Rapier world, fixed timestep (1/60s)
    arm.ts                 # SO-100 arm: links, joints, visual model
    gripper.ts             # Gripper fingers, grip detection, attach/detach
  controls/
    keyboard.ts            # Key state tracking (keydown/keyup)
    joint-controller.ts    # Map keys → joint motor targets
  game/
    state-machine.ts       # Game state machine with transition logic
    round-manager.ts       # Round lifecycle, telemetry collection
    commit-zone.ts         # Commit height calculation, zone tracking
  scoring/
    scorer.ts              # Post-round score computation
    telemetry.ts           # Per-frame state recorder
    storage.ts             # Save run results to localStorage + JSON export
  ui/
    hud.ts                 # Key indicators panel
    summary.ts             # Post-round score breakdown screen
    styles.css             # Dark bronze/espresso theme, grain texture
  objects/
    object-schema.ts       # GraspObject interface
    object-defs.ts         # 8 object definitions
    object-loader.ts       # Procedural geometry + Rapier collider creation
  config/
    constants.ts           # Physics params, scoring weights, tolerances
```

## Data Storage

Run results are saved to `localStorage` as JSON:

```json
{
  "run_id": "...",
  "object_id": "box",
  "scores": { "alignment": 0.82, "judgment": 0.91, "smoothness": 0.74, "stability": 0.88, "overall": 0.84 },
  "outcome": "success",
  "duration_ms": 12340,
  "timestamp": 1710000000000
}
```

A `downloadRunsJSON()` utility is available for exporting all stored runs.

## Design Principles

- **Deterministic physics** — fixed timestep, no randomness, reproducible results
- **Skill over speed** — scoring rewards precision and judgment
- **Post-round evaluation only** — no distracting in-game scores
- **Calm aesthetic** — dark bronze/espresso palette (#1a1410), gold accent (#c9a84c), subtle grain texture, no glow or arcade effects
- **No sound** (v1)

## Current Status

**Functionally playable.** Core mechanics are complete:

- Arm model with all 5 DOF + gripper, physics-driven
- Full keyboard control mapping
- 8 objects with spawn, grasp, and lift physics
- Complete state machine flow
- Deterministic scoring engine
- Telemetry recording and localStorage persistence
- Key indicator HUD

**Not yet wired up:**

- Summary screen (class exists but not displayed after rounds)
- Commit zone arc visualization (CSS placeholder only)
- Stability ring visualization
- Data export UI button
- Game state indicator in HUD
