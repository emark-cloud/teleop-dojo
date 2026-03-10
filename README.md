# Teleop Dojo — Core Game Spec

## 1. Design Principles

* Skill > speed
* Judgment > raw success
* Deterministic simulation
* Post-round evaluation only

---

## 2. Arm Model (Visual + Functional)

* Matte graphite material
* No glow, no branding
* Clear joint segmentation
* Dominant wrist + gripper
* State communicated only through motion

---

## 3. Physics (Deterministic)

### Global

* Fixed timestep
* Earth gravity
* No randomness

### Arm

* Rigid links
* Acceleration limits
* No flex

### Grip

* Binary (open/closed)
* Success requires alignment + angular tolerance

### Object Schema

Each object defines:

* id
* mass
* friction
* height
* grasp_axis
* alignment_tolerance
* angular_tolerance
* stability_tolerance
* optional COM offset

---

## 4. Controls (Final Mapping)

| Input | Action                                    |
| ----- | ----------------------------------------- |
| ↑ / ↓ | Elbow joint up / down                     |
| A / D | Shoulder rotation left / right            |
| ← / → | Wrist rotation anti-clockwise / clockwise |
| W / S | Wrist Y-axis forward / backward           |
| Q / E | Shoulder Z-axis lift up / down            |
| C / V | Base slide left / right                   |
| Z / X | Grip open / close                         |

Z-axis (Q/E) is the primary commit axis.

---

## 5. Canonical Pickup Reference

1. W → align above object
2. E → descend
3. Z → open
4. X → close
5. Q → lift

Used as reference for judgment scoring.

---

## 6. Game State Machine

States:
IDLE → SPAWN → ALIGN → COMMIT_ZONE → GRASP_ATTEMPT → LIFT → HOLD → SUCCESS/FAIL → SUMMARY

Transitions are deterministic and event-driven.

---

## 7. Commit Zone Math

commit_height = object_top_z + (object.height * 0.5)

Inside commit zone when:
end_effector_z <= commit_height

Below object top when:
end_effector_z <= object_top_z

Abort = re-ascending above commit_height without successful grip.
# Teleop Dojo — Scoring & Math Spec

All scoring is computed post-round.

---

## 1. Alignment Score

lateral_error = distance(gripper_center, object_center_xy)
angular_error = angle(wrist_axis, object.grasp_axis)

alignment_score = 1 - clamp(
(lateral_error / alignment_tolerance) * 0.6 +
(angular_error / angular_tolerance) * 0.4,
0, 1
)

---

## 2. Judgment Score

Track:

* Corrections inside commit zone
* Abort timing

judgment_score = 1 - clamp(
(zone_corrections * 0.1) + late_abort_penalty,
0, 1
)

Early abort improves score.
Late abort penalized.

---

## 3. Smoothness Score

smoothness = 1 - normalize(variance(joint_velocity))

Lower variance = higher score.

---

## 4. Stability Score

Measured during first 500ms after lift.

stability = 1 - clamp(
angular_velocity / stability_tolerance,
0, 1
)

---

## 5. Overall Score

overall =
alignment * 0.35 +
judgment * 0.25 +
smoothness * 0.2 +
stability * 0.2

---

## 6. Determinism Rule

Given identical key inputs, identical scores must result.
# Teleop Dojo — UI & Visual System Spec

## 1. Visual Principles

* Dark bronze / espresso UI
* Warm gold highlights
* Subtle grain texture
* No flashing, no arcade effects
* Calm, instrument-panel feel

---

## 2. In-Session UI

### Commit Zone Arc

* Segmented circular arc around gripper shadow
* Intensifies inside commit zone
* No numbers shown

### Stability Ring

* Appears after lift
* Fractures if instability detected

### Control Feedback

* Subtle motion smears
* No text popups

---

## 3. Post-Round Summary

* Segmented circular breakdown
* Alignment, Judgment, Smoothness, Stability
* Numbers secondary to visual arcs

---

## 4. Explicit Non-Goals

* No bright colors
* No glow effects
* No success banners
* No sound-based rewards (v1)
# Teleop Dojo — Dev & Architecture Spec

## 1. Recommended Stack

* TypeScript
* Three.js (rendering)
* Rapier (physics)
* Vite (build)

---

## 2. Folder Structure

```
src/
 ├─ simulator/
 ├─ controls/
 ├─ game/
 ├─ scoring/
 ├─ ui/
 ├─ objects/
 └─ config/
```

---

## 3. Data Storage (Option A)

Per-run JSON:

{
run_id,
object_id,
scores,
outcome,
duration_ms,
timestamp
}

Stored locally in `/data`.

---

## 4. Milestones

Phase 1: Arm + Controls
Phase 2: Commit detection
Phase 3: Scoring engine
Phase 4: UI overlays
Phase 5: 4 objects tuning

---

## 5. Definition of Complete v1

* All controls functional
* 4 objects implemented
* Deterministic scoring
* JSON output per run
* Summary UI working

When these are met, v1 is complete.

