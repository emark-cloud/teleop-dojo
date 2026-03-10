import { GraspObject } from './object-schema';

export const OBJECTS: GraspObject[] = [
  {
    id: 'box',
    mass: 0.5,
    friction: 0.7,
    height: 0.08,
    grasp_axis: [0, 1, 0],
    alignment_tolerance: 0.06,
    angular_tolerance: 0.7,
    stability_tolerance: 1.5,
    modelPath: '',
    dimensions: { type: 'box', width: 0.08, depth: 0.08, height: 0.08 },
    color: 0x8b7355,
  },
  {
    id: 'mug',
    mass: 0.3,
    friction: 0.6,
    height: 0.10,
    grasp_axis: [1, 0, 0],
    alignment_tolerance: 0.04,
    angular_tolerance: 0.4,
    stability_tolerance: 1.2,
    com_offset: [0.01, 0, 0],
    modelPath: '',
    dimensions: { type: 'cylinder', radius: 0.035, height: 0.10 },
    color: 0x9c8b7a,
  },
  {
    id: 'bottle',
    mass: 0.2,
    friction: 0.4,
    height: 0.18,
    grasp_axis: [0, 1, 0],
    alignment_tolerance: 0.035,
    angular_tolerance: 0.45,
    stability_tolerance: 0.8,
    com_offset: [0, 0.03, 0],
    modelPath: '',
    dimensions: { type: 'cylinder', radius: 0.03, height: 0.18 },
    color: 0x6b8f71,
  },
  {
    id: 'banana',
    mass: 0.15,
    friction: 0.3,
    height: 0.15,
    grasp_axis: [1, 0, 0],
    alignment_tolerance: 0.03,
    angular_tolerance: 0.35,
    stability_tolerance: 1.0,
    modelPath: '',
    dimensions: { type: 'capsule', radius: 0.02, height: 0.15 },
    color: 0xc9b458,
  },
  {
    id: 'can',
    mass: 0.35,
    friction: 0.5,
    height: 0.12,
    grasp_axis: [0, 1, 0],
    alignment_tolerance: 0.04,
    angular_tolerance: 0.5,
    stability_tolerance: 1.0,
    modelPath: '',
    dimensions: { type: 'cylinder', radius: 0.033, height: 0.12 },
    color: 0x7a8fa6,
  },
  {
    id: 'block',
    mass: 0.45,
    friction: 0.65,
    height: 0.12,
    grasp_axis: [0, 1, 0],
    alignment_tolerance: 0.05,
    angular_tolerance: 0.6,
    stability_tolerance: 1.3,
    modelPath: '',
    dimensions: { type: 'box', width: 0.05, depth: 0.05, height: 0.12 },
    color: 0xa05c5c,
  },
  {
    id: 'puck',
    mass: 0.6,
    friction: 0.55,
    height: 0.05,
    grasp_axis: [0, 1, 0],
    alignment_tolerance: 0.06,
    angular_tolerance: 0.7,
    stability_tolerance: 1.8,
    modelPath: '',
    dimensions: { type: 'cylinder', radius: 0.045, height: 0.05 },
    color: 0x8b6b8b,
  },
  {
    id: 'pen',
    mass: 0.1,
    friction: 0.25,
    height: 0.18,
    grasp_axis: [1, 0, 0],
    alignment_tolerance: 0.025,
    angular_tolerance: 0.3,
    stability_tolerance: 0.7,
    modelPath: '',
    dimensions: { type: 'capsule', radius: 0.012, height: 0.18 },
    color: 0x6b9a8b,
  },
];

let objectIndex = 0;

export function getNextObject(): GraspObject {
  const obj = OBJECTS[objectIndex % OBJECTS.length];
  objectIndex++;
  return obj;
}

export function resetObjectIndex(): void {
  objectIndex = 0;
}
