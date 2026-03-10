import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { GameState, StateMachine } from './state-machine';
import { CommitZoneState, createCommitZone, updateCommitZone } from './commit-zone';
import { RobotArm, getEndEffectorPosition } from '../simulator/arm';
import {
  Gripper,
  updateGripperState,
  attemptGrip,
  releaseGrip,
  getGripCenter,
} from '../simulator/gripper';
import { SpawnedObject, spawnObject, removeObject, syncObjectMesh } from '../objects/object-loader';
import { getNextObject } from '../objects/object-defs';
import { GraspObject } from '../objects/object-schema';
import { TelemetryRecorder, TelemetryFrame } from '../scoring/telemetry';
import { computeScores, RoundScores } from '../scoring/scorer';
import { saveRun } from '../scoring/storage';
import { LIFT_THRESHOLD, HOLD_DURATION_MS, TABLE_Y, GRIPPER_CLOSED_DISTANCE } from '../config/constants';
import { anyKeyPressed, wasKeyJustPressed, isKeyDown } from '../controls/keyboard';

export class RoundManager {
  private sm: StateMachine;
  private world: RAPIER.World;
  private scene: THREE.Scene;
  private arm: RobotArm;
  private telemetry: TelemetryRecorder;

  private currentObject: SpawnedObject | null = null;
  private currentDef: GraspObject | null = null;
  private commitZone: CommitZoneState | null = null;
  private roundStartTime = 0;
  private liftStartTime = 0;
  private gripAttempted = false;
  private lastScores: RoundScores | null = null;
  private outcome: 'success' | 'fail' | null = null;

  // Callbacks for UI
  onScoresReady: ((scores: RoundScores, outcome: string, objectId: string) => void) | null = null;
  onStateChange: ((state: GameState) => void) | null = null;

  constructor(
    sm: StateMachine,
    world: RAPIER.World,
    scene: THREE.Scene,
    arm: RobotArm
  ) {
    this.sm = sm;
    this.world = world;
    this.scene = scene;
    this.arm = arm;
    this.telemetry = new TelemetryRecorder();

    this.sm.onChange((_from, to) => {
      this.onStateChange?.(to);
    });

    // Auto-start the first round so the object is visible immediately
    this.startRound();
    this.sm.transition(GameState.ALIGN);
  }

  get state(): GameState {
    return this.sm.state;
  }

  get scores(): RoundScores | null {
    return this.lastScores;
  }

  get commitZoneState(): CommitZoneState | null {
    return this.commitZone;
  }

  get spawnedObject(): SpawnedObject | null {
    return this.currentObject;
  }

  update(dt: number, jointVelocities: number[]): void {
    const now = performance.now();
    const eePos = getEndEffectorPosition(this.arm);

    switch (this.sm.state) {
      case GameState.IDLE:
        if (anyKeyPressed()) {
          this.sm.transition(GameState.SPAWN);
        }
        break;

      case GameState.SPAWN:
        this.startRound();
        this.sm.transition(GameState.ALIGN);
        break;

      case GameState.ALIGN: {
        this.recordFrame(now, eePos, jointVelocities);
        const contactBody = updateGripperState(this.arm.gripper, dt, this.world);
        if (this.currentObject) syncObjectMesh(this.currentObject);

        // Check if end effector enters commit zone
        if (this.commitZone) {
          const eeVel = this.arm.bodies.wristRollBody.linvel();
          const inZone = updateCommitZone(this.commitZone, eePos.y, eeVel.y, now);
          if (inZone) {
            this.sm.transition(GameState.COMMIT_ZONE);
          }
        }

        // Try grip only when both fingers are physically contacting the object
        if (this.currentObject && contactBody === this.currentObject.body) {
          if (!this.gripAttempted) this.gripAttempted = true;
          const success = attemptGrip(this.arm.gripper, this.world, this.currentObject.body);
          if (success) {
            this.sm.transition(GameState.LIFT);
          }
        }
        break;
      }

      case GameState.COMMIT_ZONE: {
        this.recordFrame(now, eePos, jointVelocities);
        const contactBody = updateGripperState(this.arm.gripper, dt, this.world);
        if (this.currentObject) syncObjectMesh(this.currentObject);

        if (this.commitZone) {
          const eeVel = this.arm.bodies.wristRollBody.linvel();
          updateCommitZone(this.commitZone, eePos.y, eeVel.y, now);
        }

        // Try grip only when both fingers are physically contacting the object
        if (this.currentObject && contactBody === this.currentObject.body) {
          const success = attemptGrip(this.arm.gripper, this.world, this.currentObject.body);
          if (success) {
            this.sm.transition(GameState.LIFT);
          }
        }

        // Exit commit zone upward without grip → back to ALIGN
        if (this.commitZone && !this.commitZone.isInZone && eePos.y > this.commitZone.commitHeight) {
          this.sm.transition(GameState.ALIGN);
        }
        break;
      }

      case GameState.GRASP_ATTEMPT: {
        this.recordFrame(now, eePos, jointVelocities);
        const contactBody = updateGripperState(this.arm.gripper, dt, this.world);
        if (this.currentObject) syncObjectMesh(this.currentObject);

        if (this.currentObject) {
          if (contactBody === this.currentObject.body) {
            const success = attemptGrip(this.arm.gripper, this.world, this.currentObject.body);
            if (success) {
              this.sm.transition(GameState.LIFT);
            }
          } else if (this.arm.gripper.separation <= GRIPPER_CLOSED_DISTANCE) {
            // Grip failed — fingers fully closed without grabbing
            this.outcome = 'fail';
            this.sm.transition(GameState.FAIL);
          }
        }
        break;
      }

      case GameState.LIFT: {
        this.recordFrame(now, eePos, jointVelocities);
        const contactBody = updateGripperState(this.arm.gripper, dt, this.world);
        if (this.currentObject) syncObjectMesh(this.currentObject);

        // Re-grip after release — only when both fingers physically touch the object
        if (this.currentObject && !this.arm.gripper.gripJoint && contactBody === this.currentObject.body) {
          attemptGrip(this.arm.gripper, this.world, this.currentObject.body);
        }
        break;
      }

      case GameState.HOLD:
        this.recordFrame(now, eePos, jointVelocities);
        updateGripperState(this.arm.gripper, dt, this.world);
        if (this.currentObject) syncObjectMesh(this.currentObject);
        break;

      case GameState.SUCCESS:
      case GameState.FAIL:
        this.endRound();
        this.sm.transition(GameState.SUMMARY);
        break;

      case GameState.SUMMARY:
        // Wait for any key to restart
        if (wasKeyJustPressed('Space') || wasKeyJustPressed('Enter')) {
          this.cleanup();
          this.sm.transition(GameState.IDLE);
        }
        break;
    }
  }

  private startRound(): void {
    this.telemetry.clear();
    this.gripAttempted = false;
    this.liftStartTime = 0;
    this.outcome = null;
    this.lastScores = null;
    this.roundStartTime = performance.now();

    // Spawn next object
    this.currentDef = getNextObject();
    this.currentObject = spawnObject(
      this.world,
      this.scene,
      this.currentDef,
      0.3, // X position in front of arm
      0.0  // Z position
    );

    // Create commit zone
    const objPos = this.currentObject.body.translation();
    const objTopY = objPos.y + this.currentDef.height / 2;
    this.commitZone = createCommitZone(this.currentDef, objTopY);
  }

  private endRound(): void {
    const duration = performance.now() - this.roundStartTime;

    if (this.currentDef && this.commitZone) {
      this.lastScores = computeScores(
        this.telemetry.getFrames(),
        this.currentDef,
        this.commitZone,
        this.outcome === 'success'
      );

      saveRun({
        run_id: `run_${Date.now()}`,
        object_id: this.currentDef.id,
        scores: this.lastScores,
        outcome: this.outcome ?? 'fail',
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      });

      this.onScoresReady?.(this.lastScores, this.outcome ?? 'fail', this.currentDef.id);
    }
  }

  private cleanup(): void {
    // Release grip
    if (this.arm.gripper.gripJoint && this.arm.gripper.grippedBody) {
      this.world.removeImpulseJoint(this.arm.gripper.gripJoint, true);
      this.arm.gripper.gripJoint = null;
      this.arm.gripper.grippedBody = null;
    }

    // Remove object
    if (this.currentObject) {
      removeObject(this.world, this.scene, this.currentObject);
      this.currentObject = null;
    }
    this.currentDef = null;
    this.commitZone = null;
  }

  private recordFrame(timestamp: number, eePos: THREE.Vector3, jointVelocities: number[]): void {
    const gripCenter = getGripCenter(this.arm.gripper);
    this.telemetry.record({
      timestamp,
      endEffectorPos: [eePos.x, eePos.y, eePos.z],
      gripCenterPos: [gripCenter.x, gripCenter.y, gripCenter.z],
      jointVelocities: [...jointVelocities],
      gripperState: this.arm.gripper.state,
      objectPos: this.currentObject
        ? (() => {
            const p = this.currentObject.body.translation();
            return [p.x, p.y, p.z] as [number, number, number];
          })()
        : [0, 0, 0],
      objectAngularVel: this.currentObject
        ? (() => {
            const v = this.currentObject.body.angvel();
            return [v.x, v.y, v.z] as [number, number, number];
          })()
        : [0, 0, 0],
    });
  }
}
