import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  GRIPPER_OPEN_DISTANCE,
  GRIPPER_CLOSED_DISTANCE,
  GRIPPER_FINGER_LENGTH,
  GRIPPER_FINGER_WIDTH,
  GRIPPER_FINGER_DEPTH,
  GRIPPER_TIP_LENGTH,
  GRIPPER_TIP_ANGLE,
  GRIPPER_SPEED,
  GRIPPER_OPEN_ANGLE,
  ARM_COLOR,
  ARM_ROUGHNESS,
  ARM_METALNESS,
} from '../config/constants';
import { FINGER_GROUP } from './physics';

export type GripState = 'OPEN' | 'CLOSED' | 'OPENING' | 'CLOSING';

export interface GripperFinger {
  body: RAPIER.RigidBody;          // shaft body — physical blocking (prevents clipping)
  collider: RAPIER.Collider;       // shaft collider
  tipBody: RAPIER.RigidBody;       // tip body — grip detection (fires when hook reaches object)
  tipCollider: RAPIER.Collider;    // tip collider (small, at actual grip point)
  mesh: THREE.Object3D;            // group containing shaft + tip
  shaftMesh: THREE.Mesh;           // shaft mesh — used for shaft body sync
  tipMesh: THREE.Mesh;             // tip mesh — used for tip body sync
  pivot: THREE.Object3D;
  side: number;
}

export interface Gripper {
  fingers: [GripperFinger, GripperFinger];
  state: GripState;
  separation: number;
  gripJoint: RAPIER.ImpulseJoint | null;
  grippedBody: RAPIER.RigidBody | null;
  wristBody: RAPIER.RigidBody;
}

/**
 * Create gripper with finger meshes in the FK hierarchy.
 * Each finger has TWO kinematic bodies:
 *   - shaft body: full shaft collider prevents gripper clipping through objects
 *   - tip body: small collider at the hook tip, used for grip detection only
 */
export function createGripper(
  world: RAPIER.World,
  wristRollPivot: THREE.Object3D,
  wristBody: RAPIER.RigidBody,
  fingerYOffset: number
): Gripper {
  const mat = new THREE.MeshStandardMaterial({
    color: ARM_COLOR,
    roughness: ARM_ROUGHNESS,
    metalness: ARM_METALNESS,
  });

  const shaftLen = GRIPPER_FINGER_LENGTH - GRIPPER_TIP_LENGTH;
  const shaftGeo = new THREE.BoxGeometry(
    GRIPPER_FINGER_WIDTH,
    shaftLen,
    GRIPPER_FINGER_DEPTH
  );

  const tipGeo = new THREE.BoxGeometry(
    GRIPPER_FINGER_WIDTH,
    GRIPPER_TIP_LENGTH,
    GRIPPER_FINGER_DEPTH * 0.7
  );

  const fingers: [GripperFinger, GripperFinger] = [null!, null!];
  const sides = [-1, 1];

  wristRollPivot.updateMatrixWorld(true);

  for (let i = 0; i < 2; i++) {
    const side = sides[i];

    const pivot = new THREE.Object3D();
    pivot.position.set(side * GRIPPER_FINGER_WIDTH / 2, fingerYOffset, 0);
    wristRollPivot.add(pivot);

    const fingerGroup = new THREE.Group();
    pivot.add(fingerGroup);

    // Shaft: straight section from hinge downward
    const shaft = new THREE.Mesh(shaftGeo, mat);
    shaft.castShadow = true;
    shaft.position.set(0, shaftLen / 2, 0);
    fingerGroup.add(shaft);

    // Tip pivot: hooks inward
    const tipPivot = new THREE.Object3D();
    tipPivot.position.set(0, shaftLen, 0);
    tipPivot.rotation.z = side * GRIPPER_TIP_ANGLE;
    fingerGroup.add(tipPivot);

    const tip = new THREE.Mesh(tipGeo, mat);
    tip.castShadow = true;
    tip.position.set(0, GRIPPER_TIP_LENGTH / 2, 0);
    tipPivot.add(tip);

    pivot.rotation.z = -side * GRIPPER_OPEN_ANGLE;
    wristRollPivot.updateMatrixWorld(true);

    const worldPos = new THREE.Vector3();

    // --- Shaft body: physical blocking ---
    shaft.getWorldPosition(worldPos);
    const shaftBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(worldPos.x, worldPos.y, worldPos.z);
    const body = world.createRigidBody(shaftBodyDesc);
    const shaftColDesc = RAPIER.ColliderDesc.cuboid(
      GRIPPER_FINGER_WIDTH / 2,
      shaftLen / 2,
      GRIPPER_FINGER_DEPTH / 2
    ).setCollisionGroups(FINGER_GROUP);
    const collider = world.createCollider(shaftColDesc, body);

    // --- Tip body: grip detection ---
    tip.getWorldPosition(worldPos);
    const tipBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(worldPos.x, worldPos.y, worldPos.z);
    const tipBody = world.createRigidBody(tipBodyDesc);
    const tipColDesc = RAPIER.ColliderDesc.cuboid(
      GRIPPER_FINGER_WIDTH / 2,
      GRIPPER_TIP_LENGTH / 2,
      GRIPPER_FINGER_DEPTH / 2
    ).setCollisionGroups(FINGER_GROUP);
    const tipCollider = world.createCollider(tipColDesc, tipBody);

    fingers[i] = { body, collider, tipBody, tipCollider, mesh: fingerGroup, shaftMesh: shaft, tipMesh: tip, pivot, side };
  }

  return {
    fingers,
    state: 'OPEN',
    separation: GRIPPER_OPEN_DISTANCE,
    gripJoint: null,
    grippedBody: null,
    wristBody,
  };
}

/** Command the gripper to open — call each frame while key held. Releases grip if holding. */
export function openGripper(gripper: Gripper, world?: RAPIER.World): void {
  if (gripper.separation >= GRIPPER_OPEN_DISTANCE) return;
  if (gripper.state !== 'OPENING') {
    releaseGrip(gripper, world);
    gripper.state = 'OPENING';
  }
}

/** Command the gripper to close — call each frame while key held */
export function closeGripper(gripper: Gripper): void {
  if (gripper.gripJoint) return;
  if (gripper.separation <= GRIPPER_CLOSED_DISTANCE) return;
  if (gripper.state !== 'CLOSING') {
    gripper.state = 'CLOSING';
  }
}

/** Stop gripper animation — call when keys released */
export function stopGripper(gripper: Gripper): void {
  if (gripper.gripJoint) return;
  if (gripper.state === 'OPENING') gripper.state = 'OPEN';
  if (gripper.state === 'CLOSING') gripper.state = 'OPEN';
}

/** Animate gripper separation and update state. Call once per frame with dt.
 *  Returns the body both finger TIPS are squeezing (if any), or null. */
export function updateGripperState(gripper: Gripper, dt: number, world: RAPIER.World): RAPIER.RigidBody | null {
  let contactBody: RAPIER.RigidBody | null = null;

  if (gripper.state === 'OPENING') {
    gripper.separation += GRIPPER_SPEED * dt;
    if (gripper.separation >= GRIPPER_OPEN_DISTANCE) {
      gripper.separation = GRIPPER_OPEN_DISTANCE;
      gripper.state = 'OPEN';
    }
  } else if (gripper.state === 'CLOSING') {
    // Use TIP colliders for contact detection — only fires when the hook tip reaches the object
    const touchedBodies: Set<RAPIER.RigidBody>[] = [new Set(), new Set()];
    for (let i = 0; i < 2; i++) {
      world.contactPairsWith(gripper.fingers[i].tipCollider, (otherCollider: RAPIER.Collider) => {
        const otherBody = otherCollider.parent();
        if (!otherBody || !otherBody.isDynamic() || otherBody === gripper.grippedBody) return;

        // Filter out speculative contacts — require actual geometric overlap
        let hasRealContact = false;
        world.contactPair(gripper.fingers[i].tipCollider, otherCollider, (manifold, _flipped) => {
          for (let k = 0; k < manifold.numContacts(); k++) {
            if (manifold.contactDist(k) <= 0.001) {
              hasRealContact = true;
            }
          }
        });

        if (hasRealContact) {
          touchedBodies[i].add(otherBody);
        }
      });
    }

    for (const body of touchedBodies[0]) {
      if (touchedBodies[1].has(body)) {
        contactBody = body;
        break;
      }
    }

    if (!contactBody) {
      gripper.separation -= GRIPPER_SPEED * dt;
      if (gripper.separation <= GRIPPER_CLOSED_DISTANCE) {
        gripper.separation = GRIPPER_CLOSED_DISTANCE;
        gripper.state = 'CLOSED';
      }
    }
  }

  // Convert separation to rotation angle and apply to finger pivots
  const t = (gripper.separation - GRIPPER_CLOSED_DISTANCE) /
            (GRIPPER_OPEN_DISTANCE - GRIPPER_CLOSED_DISTANCE);
  const angle = t * GRIPPER_OPEN_ANGLE;
  for (const finger of gripper.fingers) {
    finger.pivot.rotation.z = -finger.side * angle;
  }

  return contactBody;
}

/** Attempt to grip an object — returns true if grip is successful */
export function attemptGrip(
  gripper: Gripper,
  world: RAPIER.World,
  objectBody: RAPIER.RigidBody
): boolean {
  if (gripper.gripJoint) return true;

  // Use tip body positions — that's where actual contact happened
  const f0 = gripper.fingers[0].tipBody.translation();
  const f1 = gripper.fingers[1].tipBody.translation();
  const objPos = objectBody.translation();
  const gripCenter = {
    x: (f0.x + f1.x) / 2,
    y: (f0.y + f1.y) / 2,
    z: (f0.z + f1.z) / 2,
  };

  const dx = objPos.x - gripCenter.x;
  const dy = objPos.y - gripCenter.y;
  const dz = objPos.z - gripCenter.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Object center must be within finger separation + tip size of tip midpoint
  const tolerance = gripper.separation + GRIPPER_TIP_LENGTH;
  if (dist > tolerance) return false;

  // Attach object to wrist via fixed joint
  const wristPos = gripper.wristBody.translation();
  const wristRot = gripper.wristBody.rotation();
  const worldOffset = new THREE.Vector3(
    objPos.x - wristPos.x,
    objPos.y - wristPos.y,
    objPos.z - wristPos.z
  );
  const invWristQuat = new THREE.Quaternion(wristRot.x, wristRot.y, wristRot.z, wristRot.w).invert();
  worldOffset.applyQuaternion(invWristQuat);

  const jointData = RAPIER.JointData.fixed(
    new RAPIER.Vector3(worldOffset.x, worldOffset.y, worldOffset.z),
    new RAPIER.Quaternion(0, 0, 0, 1),
    new RAPIER.Vector3(0, 0, 0),
    new RAPIER.Quaternion(0, 0, 0, 1)
  );
  gripper.gripJoint = world.createImpulseJoint(jointData, gripper.wristBody, objectBody, true);
  gripper.grippedBody = objectBody;
  gripper.state = 'CLOSED';
  return true;
}

/** Release the gripped object */
export function releaseGrip(gripper: Gripper, world?: RAPIER.World): void {
  if (gripper.gripJoint) {
    if (world) {
      world.removeImpulseJoint(gripper.gripJoint, true);
    }
    gripper.gripJoint = null;
    gripper.grippedBody = null;
  }
}

/** Get grip center position (midpoint of both finger tips) */
export function getGripCenter(gripper: Gripper): THREE.Vector3 {
  const f0 = gripper.fingers[0].tipBody.translation();
  const f1 = gripper.fingers[1].tipBody.translation();
  return new THREE.Vector3(
    (f0.x + f1.x) / 2,
    (f0.y + f1.y) / 2,
    (f0.z + f1.z) / 2
  );
}
