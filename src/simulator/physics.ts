import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { PHYSICS_TIMESTEP, GRAVITY } from '../config/constants';

// Collision groups: upper 16 bits = membership, lower 16 bits = filter
// Objects & table: group 1, interact with groups 1 and 3 (objects + fingers)
// Arm links: group 2, interact with group 2 only (no object/table contact)
// Fingers: group 3, interact with group 1 (objects/table)
export const OBJECT_GROUP = (0x0001 << 16) | 0x0005;
export const ARM_GROUP = (0x0002 << 16) | 0x0002;
export const FINGER_GROUP = (0x0004 << 16) | 0x0001;

export let rapier: typeof RAPIER;

export async function initPhysics(): Promise<void> {
  await RAPIER.init();
  rapier = RAPIER;
}

export function createWorld(): RAPIER.World {
  const world = new RAPIER.World(new RAPIER.Vector3(GRAVITY.x, GRAVITY.y, GRAVITY.z));
  world.numSolverIterations = 16;
  return world;
}

export class PhysicsStepper {
  private accumulator = 0;

  step(world: RAPIER.World, deltaTime: number): void {
    this.accumulator += deltaTime;
    while (this.accumulator >= PHYSICS_TIMESTEP) {
      world.step();
      this.accumulator -= PHYSICS_TIMESTEP;
    }
  }
}

/** Sync a Three.js Object3D position/rotation to a Rapier rigid body */
export function syncMeshToBody(
  mesh: THREE.Object3D,
  body: RAPIER.RigidBody
): void {
  const pos = body.translation();
  const rot = body.rotation();
  mesh.position.set(pos.x, pos.y, pos.z);
  mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
}

/** Create a dynamic rigid body at a given position */
export function createDynamicBody(
  world: RAPIER.World,
  x: number,
  y: number,
  z: number
): RAPIER.RigidBody {
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z);
  return world.createRigidBody(bodyDesc);
}

/** Create a fixed (static) rigid body at a given position */
export function createFixedBody(
  world: RAPIER.World,
  x: number,
  y: number,
  z: number
): RAPIER.RigidBody {
  const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z);
  return world.createRigidBody(bodyDesc);
}

/** Create a kinematic position-based rigid body */
export function createKinematicBody(
  world: RAPIER.World,
  x: number,
  y: number,
  z: number
): RAPIER.RigidBody {
  const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z);
  return world.createRigidBody(bodyDesc);
}

/** Add a box collider to a body */
export function addBoxCollider(
  world: RAPIER.World,
  body: RAPIER.RigidBody,
  hx: number,
  hy: number,
  hz: number,
  options?: { friction?: number; restitution?: number; density?: number; sensor?: boolean; collisionGroup?: number }
): RAPIER.Collider {
  const desc = RAPIER.ColliderDesc.cuboid(hx, hy, hz);
  if (options?.friction !== undefined) desc.setFriction(options.friction);
  if (options?.restitution !== undefined) desc.setRestitution(options.restitution);
  if (options?.density !== undefined) desc.setDensity(options.density);
  if (options?.sensor) desc.setSensor(true);
  if (options?.collisionGroup !== undefined) desc.setCollisionGroups(options.collisionGroup);
  return world.createCollider(desc, body);
}

/** Add a cylinder collider to a body */
export function addCylinderCollider(
  world: RAPIER.World,
  body: RAPIER.RigidBody,
  halfHeight: number,
  radius: number,
  options?: { friction?: number; restitution?: number; density?: number; sensor?: boolean; collisionGroup?: number }
): RAPIER.Collider {
  const desc = RAPIER.ColliderDesc.cylinder(halfHeight, radius);
  if (options?.friction !== undefined) desc.setFriction(options.friction);
  if (options?.restitution !== undefined) desc.setRestitution(options.restitution);
  if (options?.density !== undefined) desc.setDensity(options.density);
  if (options?.sensor) desc.setSensor(true);
  if (options?.collisionGroup !== undefined) desc.setCollisionGroups(options.collisionGroup);
  return world.createCollider(desc, body);
}
