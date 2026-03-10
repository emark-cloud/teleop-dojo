import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  ARM_BASE_HEIGHT,
  ARM_BASE_RADIUS,
  ARM_SHOULDER_LENGTH,
  ARM_ELBOW_LENGTH,
  ARM_LINK_RADIUS,
  ARM_COLOR,
  ARM_ROUGHNESS,
  ARM_METALNESS,
  TABLE_Y,
  TABLE_DEPTH,
  BASE_SLIDE_RANGE,
} from '../config/constants';
import { addBoxCollider, addCylinderCollider, ARM_GROUP } from './physics';
import { createGripper, Gripper } from './gripper';

export interface ArmPivots {
  shoulderYaw: THREE.Object3D;
  shoulderPitch: THREE.Object3D;
  elbow: THREE.Object3D;
  wristPitch: THREE.Object3D;
  wristRoll: THREE.Object3D;
}

export interface ArmBodies {
  base: RAPIER.RigidBody;
  shoulderRotator: RAPIER.RigidBody;
  upperArm: RAPIER.RigidBody;
  forearm: RAPIER.RigidBody;
  wristPitchBody: RAPIER.RigidBody;
  wristRollBody: RAPIER.RigidBody;
}

export interface ArmMeshes {
  base: THREE.Mesh;
  shoulderRotator: THREE.Mesh;
  upperArm: THREE.Mesh;
  forearm: THREE.Mesh;
  wristPitchMesh: THREE.Mesh;
  wristRollMesh: THREE.Mesh;
}

export interface RobotArm {
  pivots: ArmPivots;
  bodies: ArmBodies;
  meshes: ArmMeshes;
  gripper: Gripper;
  basePivot: THREE.Object3D;
  baseDefaultY: number;
}

function armMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: ARM_COLOR,
    roughness: ARM_ROUGHNESS,
    metalness: ARM_METALNESS,
  });
}

function jointMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.9,
    metalness: 0.2,
  });
}

function getWorldPos(obj: THREE.Object3D): [number, number, number] {
  const v = new THREE.Vector3();
  obj.getWorldPosition(v);
  return [v.x, v.y, v.z];
}

export function createArm(
  world: RAPIER.World,
  scene: THREE.Scene
): RobotArm {
  const mat = armMaterial();
  const jMat = jointMaterial();

  const baseY = TABLE_Y + ARM_BASE_HEIGHT / 2;

  // ── Three.js FK Hierarchy ──────────────────────────────────
  // basePivot is the root — movable by C/V (base slide)
  const basePivot = new THREE.Object3D();
  basePivot.position.set(0, baseY, -TABLE_DEPTH / 2 + ARM_BASE_RADIUS);
  scene.add(basePivot);

  // Base mesh (centered at basePivot)
  const baseGeo = new THREE.CylinderGeometry(
    ARM_BASE_RADIUS, ARM_BASE_RADIUS * 1.1, ARM_BASE_HEIGHT, 24
  );
  const baseMesh = new THREE.Mesh(baseGeo, mat);
  baseMesh.castShadow = true;
  basePivot.add(baseMesh);

  // Shoulder yaw pivot (top of base, Y-axis rotation)
  const shoulderYawPivot = new THREE.Object3D();
  shoulderYawPivot.position.set(0, ARM_BASE_HEIGHT / 2, 0);
  basePivot.add(shoulderYawPivot);

  // Shoulder rotator mesh
  const srGeo = new THREE.CylinderGeometry(
    ARM_BASE_RADIUS * 0.7, ARM_BASE_RADIUS * 0.7, 0.04, 16
  );
  const srMesh = new THREE.Mesh(srGeo, jMat);
  srMesh.castShadow = true;
  srMesh.position.set(0, 0.02, 0);
  shoulderYawPivot.add(srMesh);

  // Shoulder pitch pivot (above rotator, X-axis rotation)
  const shoulderPitchPivot = new THREE.Object3D();
  shoulderPitchPivot.position.set(0, 0.04, 0);
  shoulderYawPivot.add(shoulderPitchPivot);

  // Upper arm mesh
  const uaGeo = new THREE.BoxGeometry(
    ARM_LINK_RADIUS * 2, ARM_SHOULDER_LENGTH, ARM_LINK_RADIUS * 2
  );
  const uaMesh = new THREE.Mesh(uaGeo, mat);
  uaMesh.castShadow = true;
  uaMesh.position.set(0, ARM_SHOULDER_LENGTH / 2, 0);
  shoulderPitchPivot.add(uaMesh);

  // Elbow pivot (top of upper arm, X-axis rotation)
  const elbowPivot = new THREE.Object3D();
  elbowPivot.position.set(0, ARM_SHOULDER_LENGTH, 0);
  shoulderPitchPivot.add(elbowPivot);

  // Forearm mesh
  const faGeo = new THREE.BoxGeometry(
    ARM_LINK_RADIUS * 1.8, ARM_ELBOW_LENGTH, ARM_LINK_RADIUS * 1.8
  );
  const faMesh = new THREE.Mesh(faGeo, mat);
  faMesh.castShadow = true;
  faMesh.position.set(0, ARM_ELBOW_LENGTH / 2, 0);
  elbowPivot.add(faMesh);

  // Wrist pitch pivot (top of forearm, X-axis rotation)
  const wristPitchPivot = new THREE.Object3D();
  wristPitchPivot.position.set(0, ARM_ELBOW_LENGTH, 0);
  elbowPivot.add(wristPitchPivot);

  // Wrist pitch mesh
  const wpGeo = new THREE.BoxGeometry(
    ARM_LINK_RADIUS * 1.4, 0.06, ARM_LINK_RADIUS * 1.4
  );
  const wpMesh = new THREE.Mesh(wpGeo, jMat);
  wpMesh.castShadow = true;
  wpMesh.position.set(0, 0.03, 0);
  wristPitchPivot.add(wpMesh);

  // Wrist roll pivot (above wrist pitch, Y-axis rotation)
  const wristRollPivot = new THREE.Object3D();
  wristRollPivot.position.set(0, 0.06, 0);
  wristPitchPivot.add(wristRollPivot);

  // Wrist roll mesh
  const wrGeo = new THREE.CylinderGeometry(
    ARM_LINK_RADIUS * 0.6, ARM_LINK_RADIUS * 0.6, 0.05, 12
  );
  const wrMesh = new THREE.Mesh(wrGeo, mat);
  wrMesh.castShadow = true;
  wrMesh.position.set(0, 0.025, 0);
  wristRollPivot.add(wrMesh);

  // ── Kinematic Physics Bodies ─────────────────────────────────
  // All arm bodies are kinematicPositionBased — positions set from FK each frame.
  // Rapier auto-computes velocity from position changes (used by round-manager).
  basePivot.updateMatrixWorld(true);

  const mkBody = (obj: THREE.Object3D): RAPIER.RigidBody => {
    const [x, y, z] = getWorldPos(obj);
    const desc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z);
    return world.createRigidBody(desc);
  };

  const bodies: ArmBodies = {
    base: mkBody(baseMesh),
    shoulderRotator: mkBody(srMesh),
    upperArm: mkBody(uaMesh),
    forearm: mkBody(faMesh),
    wristPitchBody: mkBody(wpMesh),
    wristRollBody: mkBody(wrMesh),
  };

  // Colliders in ARM_GROUP — cannot collide with objects (OBJECT_GROUP)
  addCylinderCollider(world, bodies.base, ARM_BASE_HEIGHT / 2, ARM_BASE_RADIUS, {
    collisionGroup: ARM_GROUP,
  });
  addCylinderCollider(world, bodies.shoulderRotator, 0.02, ARM_BASE_RADIUS * 0.7, {
    collisionGroup: ARM_GROUP,
  });
  addBoxCollider(world, bodies.upperArm,
    ARM_LINK_RADIUS, ARM_SHOULDER_LENGTH / 2, ARM_LINK_RADIUS, { collisionGroup: ARM_GROUP });
  addBoxCollider(world, bodies.forearm,
    ARM_LINK_RADIUS * 0.9, ARM_ELBOW_LENGTH / 2, ARM_LINK_RADIUS * 0.9, { collisionGroup: ARM_GROUP });
  addBoxCollider(world, bodies.wristPitchBody,
    ARM_LINK_RADIUS * 0.7, 0.03, ARM_LINK_RADIUS * 0.7, { collisionGroup: ARM_GROUP });
  addBoxCollider(world, bodies.wristRollBody,
    ARM_LINK_RADIUS * 0.6, 0.025, ARM_LINK_RADIUS * 0.6, { collisionGroup: ARM_GROUP });

  // ── Gripper ──────────────────────────────────────────────────
  // Finger meshes are children of wristRollPivot (part of FK hierarchy)
  // fingerYOffset = distance from wristRollPivot origin to top of wrist roll mesh
  const fingerYOffset = 0.025 + 0.025; // wrMesh local offset + half wrMesh height

  const gripper = createGripper(
    world, wristRollPivot, bodies.wristRollBody, fingerYOffset
  );

  return {
    pivots: {
      shoulderYaw: shoulderYawPivot,
      shoulderPitch: shoulderPitchPivot,
      elbow: elbowPivot,
      wristPitch: wristPitchPivot,
      wristRoll: wristRollPivot,
    },
    bodies,
    meshes: {
      base: baseMesh,
      shoulderRotator: srMesh,
      upperArm: uaMesh,
      forearm: faMesh,
      wristPitchMesh: wpMesh,
      wristRollMesh: wrMesh,
    },
    gripper,
    basePivot,
    baseDefaultY: baseY,
  };
}

/** Sync kinematic physics bodies to FK hierarchy. Call BEFORE world.step(). */
export function syncArmBodies(arm: RobotArm): void {
  arm.basePivot.updateMatrixWorld(true);

  const pairs: [THREE.Object3D, RAPIER.RigidBody][] = [
    [arm.meshes.base, arm.bodies.base],
    [arm.meshes.shoulderRotator, arm.bodies.shoulderRotator],
    [arm.meshes.upperArm, arm.bodies.upperArm],
    [arm.meshes.forearm, arm.bodies.forearm],
    [arm.meshes.wristPitchMesh, arm.bodies.wristPitchBody],
    [arm.meshes.wristRollMesh, arm.bodies.wristRollBody],
  ];

  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();

  for (const [mesh, body] of pairs) {
    mesh.getWorldPosition(pos);
    mesh.getWorldQuaternion(quat);
    body.setNextKinematicTranslation(
      new RAPIER.Vector3(pos.x, pos.y, pos.z)
    );
    body.setNextKinematicRotation(
      new RAPIER.Quaternion(quat.x, quat.y, quat.z, quat.w)
    );
  }

  // Wake gripped body so joint constraint is resolved during physics step
  if (arm.gripper.grippedBody) {
    arm.gripper.grippedBody.wakeUp();
  }

  // Sync gripper finger bodies: shaft (physical blocking) + tip (grip detection)
  for (const finger of arm.gripper.fingers) {
    finger.shaftMesh.getWorldPosition(pos);
    finger.shaftMesh.getWorldQuaternion(quat);
    finger.body.setNextKinematicTranslation(new RAPIER.Vector3(pos.x, pos.y, pos.z));
    finger.body.setNextKinematicRotation(new RAPIER.Quaternion(quat.x, quat.y, quat.z, quat.w));

    finger.tipMesh.getWorldPosition(pos);
    finger.tipMesh.getWorldQuaternion(quat);
    finger.tipBody.setNextKinematicTranslation(new RAPIER.Vector3(pos.x, pos.y, pos.z));
    finger.tipBody.setNextKinematicRotation(new RAPIER.Quaternion(quat.x, quat.y, quat.z, quat.w));
  }
}

/** Get end effector (wrist roll) world position */
export function getEndEffectorPosition(arm: RobotArm): THREE.Vector3 {
  const pos = new THREE.Vector3();
  arm.meshes.wristRollMesh.getWorldPosition(pos);
  return pos;
}

/** Get end effector orientation as a quaternion */
export function getEndEffectorQuaternion(arm: RobotArm): THREE.Quaternion {
  const quat = new THREE.Quaternion();
  arm.meshes.wristRollMesh.getWorldQuaternion(quat);
  return quat;
}
