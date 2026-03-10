import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { GraspObject } from './object-schema';
import { TABLE_Y } from '../config/constants';
import { OBJECT_GROUP } from '../simulator/physics';

export interface SpawnedObject {
  definition: GraspObject;
  mesh: THREE.Mesh;
  body: RAPIER.RigidBody;
}

/** Spawn a grasp object on the tabletop at given (x, z) position */
export function spawnObject(
  world: RAPIER.World,
  scene: THREE.Scene,
  definition: GraspObject,
  x: number,
  z: number
): SpawnedObject {
  const dims = definition.dimensions;
  const halfHeight = dims.height / 2;
  const y = TABLE_Y + halfHeight;

  // Create visual mesh (procedural geometry)
  let geometry: THREE.BufferGeometry;
  let colDesc: RAPIER.ColliderDesc;

  switch (dims.type) {
    case 'cylinder': {
      const r = dims.radius ?? 0.03;
      geometry = new THREE.CylinderGeometry(r, r, dims.height, 16);
      colDesc = RAPIER.ColliderDesc.cylinder(halfHeight, r);
      break;
    }
    case 'box': {
      const w = dims.width ?? 0.08;
      const d = dims.depth ?? 0.08;
      geometry = new THREE.BoxGeometry(w, dims.height, d);
      colDesc = RAPIER.ColliderDesc.cuboid(w / 2, halfHeight, d / 2);
      break;
    }
    case 'capsule': {
      const r = dims.radius ?? 0.02;
      // Use capsule-like geometry: cylinder with hemisphere ends
      geometry = new THREE.CapsuleGeometry(r, dims.height - r * 2, 8, 12);
      colDesc = RAPIER.ColliderDesc.capsule(halfHeight - r, r);
      break;
    }
  }

  const material = new THREE.MeshStandardMaterial({
    color: definition.color,
    roughness: 0.7,
    metalness: 0.1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  // Cylinders and capsules roll freely on their curved surface — damp rotation heavily
  const angularDamping = (dims.type === 'cylinder' || dims.type === 'capsule') ? 8.0 : 0.5;

  // Create physics body
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(x, y, z)
    .setLinearDamping(0.5)
    .setAngularDamping(angularDamping);
  const body = world.createRigidBody(bodyDesc);

  colDesc
    .setDensity(definition.mass / (dims.height * 0.01)) // approximate
    .setFriction(definition.friction)
    .setRestitution(0.1)
    .setCollisionGroups(OBJECT_GROUP);
  world.createCollider(colDesc, body);

  return { definition, mesh, body };
}

/** Sync spawned object mesh to physics body */
export function syncObjectMesh(obj: SpawnedObject): void {
  const pos = obj.body.translation();
  const rot = obj.body.rotation();
  obj.mesh.position.set(pos.x, pos.y, pos.z);
  obj.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
}

/** Remove spawned object from world and scene */
export function removeObject(
  world: RAPIER.World,
  scene: THREE.Scene,
  obj: SpawnedObject
): void {
  scene.remove(obj.mesh);
  if (obj.mesh.geometry) obj.mesh.geometry.dispose();
  if (obj.mesh.material instanceof THREE.Material) obj.mesh.material.dispose();
  world.removeRigidBody(obj.body);
}
