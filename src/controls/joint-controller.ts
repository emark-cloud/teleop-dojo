import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { isKeyDown } from './keyboard';
import { RobotArm } from '../simulator/arm';
import { openGripper, closeGripper, stopGripper } from '../simulator/gripper';
import {
  JOINT_MAX_VELOCITY,
  JOINT_ACCEL,
  JOINT_FRICTION_DECEL,
  BASE_SLIDE_SPEED,
  BASE_SLIDE_RANGE,
  SHOULDER_ROTATION_LIMIT,
  SHOULDER_PITCH_MIN,
  SHOULDER_PITCH_MAX,
  ELBOW_PITCH_MIN,
  ELBOW_PITCH_MAX,
  WRIST_PITCH_MIN,
  WRIST_PITCH_MAX,
  WRIST_ROLL_LIMIT,
  TABLE_Y,
  GRIPPER_FINGER_LENGTH,
} from '../config/constants';

interface JointMapping {
  positiveKey: string;
  negativeKey: string;
  min: number;
  max: number;
}

const targetAngles: number[] = [0, 0, 0, 0, 0];
const currentVelocities: number[] = [0, 0, 0, 0, 0];
const _pos = new THREE.Vector3();

export function resetJointTargets(): void {
  for (let i = 0; i < targetAngles.length; i++) {
    targetAngles[i] = 0;
    currentVelocities[i] = 0;
  }
}

const _dir = new THREE.Vector3();

/** Check if any arm link or gripper claw tip is below the table surface */
function isArmBelowTable(arm: RobotArm): boolean {
  arm.basePivot.updateMatrixWorld(true);

  const threshold = TABLE_Y + 0.05;

  // Check arm link centers with generous margin
  const meshes: THREE.Object3D[] = [
    arm.meshes.upperArm,
    arm.meshes.forearm,
    arm.meshes.wristPitchMesh,
    arm.meshes.wristRollMesh,
  ];

  for (const mesh of meshes) {
    mesh.getWorldPosition(_pos);
    if (_pos.y < threshold) {
      return true;
    }
  }

  // Check gripper fingertip positions — skip when gripping (fingers are around object near table)
  if (!arm.gripper.gripJoint) {
    for (const finger of arm.gripper.fingers) {
      // Hinge position
      finger.pivot.getWorldPosition(_pos);
      if (_pos.y < threshold) return true;

      // Approximate fingertip: project finger length along the pivot's local Y axis
      finger.pivot.getWorldDirection(_dir); // local +Z in world
      // Local +Y direction: extract from world matrix column 1
      const m = finger.pivot.matrixWorld.elements;
      _dir.set(m[4], m[5], m[6]).normalize();
      _pos.addScaledVector(_dir, GRIPPER_FINGER_LENGTH);
      if (_pos.y < threshold) return true;
    }
  }

  return false;
}

export function updateJoints(arm: RobotArm, dt: number, world: RAPIER.World): number[] {
  const SHOULDER_YAW_SPEED_SCALE = 0.4; // A/D rotation is slower for precision

  const mappings: JointMapping[] = [
    {
      positiveKey: 'KeyD',
      negativeKey: 'KeyA',
      min: -SHOULDER_ROTATION_LIMIT,
      max: SHOULDER_ROTATION_LIMIT,
    },
    {
      positiveKey: 'KeyE',
      negativeKey: 'KeyQ',
      min: SHOULDER_PITCH_MIN,
      max: SHOULDER_PITCH_MAX,
    },
    {
      positiveKey: 'ArrowDown',
      negativeKey: 'ArrowUp',
      min: ELBOW_PITCH_MIN,
      max: ELBOW_PITCH_MAX,
    },
    {
      positiveKey: 'KeyW',
      negativeKey: 'KeyS',
      min: WRIST_PITCH_MIN,
      max: WRIST_PITCH_MAX,
    },
    {
      positiveKey: 'ArrowRight',
      negativeKey: 'ArrowLeft',
      min: -WRIST_ROLL_LIMIT,
      max: WRIST_ROLL_LIMIT,
    },
  ];

  // Save pitch angles (indices 1, 2, 3) before changes
  const prevPitch = [targetAngles[1], targetAngles[2], targetAngles[3]];

  const velocities: number[] = [];

  for (let i = 0; i < mappings.length; i++) {
    const m = mappings[i];
    const positive = isKeyDown(m.positiveKey);
    const negative = isKeyDown(m.negativeKey);

    const maxVel = i === 0 ? JOINT_MAX_VELOCITY * SHOULDER_YAW_SPEED_SCALE : JOINT_MAX_VELOCITY;
    let desiredVel = 0;
    if (positive && !negative) desiredVel = maxVel;
    else if (negative && !positive) desiredVel = -maxVel;

    // Smooth velocity: accelerate toward desired, friction-decelerate when idle
    const accel = desiredVel !== 0 ? JOINT_ACCEL : JOINT_FRICTION_DECEL;
    const diff = desiredVel - currentVelocities[i];
    const maxChange = accel * dt;
    if (Math.abs(diff) <= maxChange) {
      currentVelocities[i] = desiredVel;
    } else {
      currentVelocities[i] += Math.sign(diff) * maxChange;
    }

    targetAngles[i] += currentVelocities[i] * dt;
    targetAngles[i] = Math.max(m.min, Math.min(m.max, targetAngles[i]));
    velocities.push(currentVelocities[i]);
  }

  // Check if arm is already below table BEFORE applying new angles
  const wasBelowBefore = isArmBelowTable(arm);

  // Save previous yaw for table collision revert
  const prevYaw = arm.pivots.shoulderYaw.rotation.y;

  // Apply all rotations to FK pivots
  arm.pivots.shoulderYaw.rotation.y = targetAngles[0];
  arm.pivots.shoulderPitch.rotation.x = targetAngles[1];
  arm.pivots.elbow.rotation.x = targetAngles[2];
  arm.pivots.wristPitch.rotation.x = targetAngles[3];
  arm.pivots.wristRoll.rotation.y = targetAngles[4];

  // Only block the transition from above to below table — if already below, allow movement to escape
  if (!wasBelowBefore && isArmBelowTable(arm)) {
    targetAngles[0] = prevYaw;
    targetAngles[1] = prevPitch[0];
    targetAngles[2] = prevPitch[1];
    targetAngles[3] = prevPitch[2];
    currentVelocities[0] = 0;
    currentVelocities[1] = 0;
    currentVelocities[2] = 0;
    currentVelocities[3] = 0;
    arm.pivots.shoulderYaw.rotation.y = targetAngles[0];
    arm.pivots.shoulderPitch.rotation.x = targetAngles[1];
    arm.pivots.elbow.rotation.x = targetAngles[2];
    arm.pivots.wristPitch.rotation.x = targetAngles[3];
  }

  // Base slide X
  if (isKeyDown('KeyC')) arm.basePivot.position.x -= BASE_SLIDE_SPEED * dt;
  if (isKeyDown('KeyV')) arm.basePivot.position.x += BASE_SLIDE_SPEED * dt;
  arm.basePivot.position.x = Math.max(
    -BASE_SLIDE_RANGE,
    Math.min(BASE_SLIDE_RANGE, arm.basePivot.position.x)
  );

  // Gripper — hold to gradually open/close, release to stop
  if (isKeyDown('KeyZ')) openGripper(arm.gripper, world);
  else if (isKeyDown('KeyX')) closeGripper(arm.gripper);
  else stopGripper(arm.gripper);

  return velocities;
}
