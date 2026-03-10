# Teleop Dojo

## What This Is

A browser-based robotic arm teleoperation game built for PrismaX — a decentralized platform
connecting teleoperators with physical robots to collect AI training data. Teleop Dojo simulates
the teleoperation experience, training players on precision, judgment, and smoothness.

## Project Context

- **PrismaX**: Platform for human-robot teleoperation and AI data collection (prismax.ai)
- **Whitepaper**: See `PrismaX Whitepaper.pdf` for full platform details
- **Game Spec**: See `README.md` for complete design spec
- **Reference Hardware**: SO-100 / Koch v1.1 desktop robot arm (5-DOF + gripper)
- **Reference Clips**: Teleoperation session screenshots from the PrismaX app showing
  the actual "Buddy Arm" interface, dark-themed UI, keyboard-controlled joint mode

## Tech Stack

- TypeScript + Vite (build/dev)
- Three.js (3D rendering)
- @dimforge/rapier3d-compat (WASM physics engine — deterministic)
- HTML/CSS overlays for UI (not Three.js sprites)

## Architecture

```
src/
  main.ts              # Entry point: init WASM, scene, game loop
  simulator/
    scene.ts           # Three.js renderer, lighting, environment
    camera.ts          # PerspectiveCamera + OrbitControls
    physics.ts         # Rapier world, fixed timestep stepping
    arm.ts             # SO-100 arm: links, joints, visual model
    gripper.ts         # Gripper fingers, grip detection, attach/detach
  controls/
    keyboard.ts        # Key state tracking (keydown/keyup)
    joint-controller.ts # Map keys → joint motor targets
  game/
    state-machine.ts   # IDLE→SPAWN→ALIGN→COMMIT_ZONE→GRASP→LIFT→HOLD→SUCCESS/FAIL→SUMMARY
    round-manager.ts   # Round lifecycle, telemetry collection
    commit-zone.ts     # Commit height calculation, zone tracking
  scoring/
    scorer.ts          # Post-round score computation (alignment, judgment, smoothness, stability)
    telemetry.ts       # Per-frame state recorder
    storage.ts         # Save run results to localStorage / JSON
  ui/
    hud.ts             # In-game: commit zone arc, stability ring, key indicators
    summary.ts         # Post-round: segmented score chart
    styles.css         # Dark bronze/espresso theme, grain texture
  objects/
    object-schema.ts   # GraspObject interface
    object-defs.ts     # 4 object definitions (mug, bottle, banana, box)
    object-loader.ts   # GLTF model loading + Rapier collider creation
  config/
    constants.ts       # Physics params, scoring weights, tolerances
```

## Key Design Decisions

- **Deterministic physics**: Fixed timestep (1/60s), no randomness, Rapier guarantees
  identical results for identical inputs
- **Post-round scoring only**: No real-time score display during play
- **Procedural arm model**: Built from Three.js primitives matching SO-100 proportions,
  connected via Rapier revolute joints with motor control
- **Binary grip**: Open or closed, success requires alignment + angular tolerance
- **Mouse for camera, keyboard for arm**: No input conflicts
- **4 objects for v1**: Mug (asymmetric grasp), bottle (stability challenge),
  banana (alignment challenge), box (forgiving/tutorial)

## Controls

| Key | Action |
|-----|--------|
| Up/Down | Elbow up/down |
| A/D | Shoulder rotation |
| Left/Right | Wrist roll |
| W/S | Wrist pitch |
| Q/E | Z-axis lift (kinematic vertical) |
| C/V | Base slide |
| Z/X | Grip open/close |

## Scoring Weights

- Alignment: 35% (lateral 60% + angular 40%)
- Judgment: 25% (commit zone corrections + abort timing)
- Smoothness: 20% (joint velocity variance)
- Stability: 20% (angular velocity in first 500ms post-lift)

## Visual Style

- Dark bronze/espresso palette: bg #1a1410, gold accent #c9a84c
- Matte graphite arm (roughness 0.8, metalness 0.3)
- Subtle grain texture, no glow/flash/bright colors
- Calm instrument-panel aesthetic

## Commands

- `npm install` — install dependencies
- `npm run dev` — start Vite dev server
- `npm run build` — production build to dist/

## Don'ts

- No Math.random() — determinism required
- No sound (v1)
- No success banners or arcade effects
- No glow materials
- No real-time score display during play
