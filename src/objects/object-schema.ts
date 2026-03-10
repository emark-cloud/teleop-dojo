export interface GraspObject {
  id: string;
  mass: number;
  friction: number;
  height: number;
  grasp_axis: [number, number, number];
  alignment_tolerance: number;
  angular_tolerance: number;
  stability_tolerance: number;
  com_offset?: [number, number, number];
  modelPath: string;
  /** Visual dimensions for procedural geometry fallback */
  dimensions: {
    type: 'cylinder' | 'box' | 'capsule';
    radius?: number;
    width?: number;
    depth?: number;
    height: number;
  };
  color: number;
}
