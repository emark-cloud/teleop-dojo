import { GripState } from '../simulator/gripper';

export interface TelemetryFrame {
  timestamp: number;
  endEffectorPos: [number, number, number];
  gripCenterPos: [number, number, number];
  jointVelocities: number[];
  gripperState: GripState;
  objectPos: [number, number, number];
  objectAngularVel: [number, number, number];
}

export class TelemetryRecorder {
  private frames: TelemetryFrame[] = [];

  record(frame: TelemetryFrame): void {
    this.frames.push(frame);
  }

  getFrames(): TelemetryFrame[] {
    return this.frames;
  }

  getLastFrame(): TelemetryFrame | null {
    return this.frames.length > 0 ? this.frames[this.frames.length - 1] : null;
  }

  /** Get frames within a time window (ms) */
  getFramesInWindow(startMs: number, endMs: number): TelemetryFrame[] {
    return this.frames.filter(
      (f) => f.timestamp >= startMs && f.timestamp <= endMs
    );
  }

  clear(): void {
    this.frames = [];
  }

  get length(): number {
    return this.frames.length;
  }
}
