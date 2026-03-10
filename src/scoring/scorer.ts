import { TelemetryFrame } from './telemetry';
import { GraspObject } from '../objects/object-schema';
import { CommitZoneState } from '../game/commit-zone';
import {
  SCORE_WEIGHT_ALIGNMENT,
  SCORE_WEIGHT_JUDGMENT,
  SCORE_WEIGHT_SMOOTHNESS,
  SCORE_WEIGHT_STABILITY,
  HOLD_DURATION_MS,
} from '../config/constants';

export interface RoundScores {
  alignment: number;
  judgment: number;
  smoothness: number;
  stability: number;
  overall: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Find the frame closest to when grip was attempted (last CLOSING state transition) */
function findGripFrame(frames: TelemetryFrame[]): TelemetryFrame | null {
  for (let i = frames.length - 1; i >= 0; i--) {
    if (frames[i].gripperState === 'CLOSING') {
      return frames[i];
    }
  }
  return frames.length > 0 ? frames[frames.length - 1] : null;
}

/**
 * Alignment Score (35%):
 * At moment of grip attempt, measure lateral and angular error.
 */
function scoreAlignment(frames: TelemetryFrame[], objectDef: GraspObject): number {
  const gripFrame = findGripFrame(frames);
  if (!gripFrame) return 0;

  // Lateral error: XZ distance between grip center and object center
  const dx = gripFrame.gripCenterPos[0] - gripFrame.objectPos[0];
  const dz = gripFrame.gripCenterPos[2] - gripFrame.objectPos[2];
  const lateralError = Math.sqrt(dx * dx + dz * dz);

  // Angular error: simplified — vertical alignment of end effector with grasp axis
  // For objects with vertical grasp axis, measure how vertical the approach is
  // For horizontal grasp axis, measure lateral approach angle
  const eeY = gripFrame.endEffectorPos[1];
  const objY = gripFrame.objectPos[1];
  const dy = eeY - objY;
  const totalDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const angularError = totalDist > 0.001 ? Math.acos(clamp(Math.abs(dy) / totalDist, 0, 1)) : 0;

  const latNorm = lateralError / objectDef.alignment_tolerance;
  const angNorm = angularError / objectDef.angular_tolerance;

  return clamp(1 - (latNorm * 0.6 + angNorm * 0.4), 0, 1);
}

/**
 * Judgment Score (25%):
 * Quality of decision-making in commit zone — fewer corrections = better.
 */
function scoreJudgment(commitZone: CommitZoneState, success: boolean): number {
  const correctionPenalty = commitZone.corrections * 0.1;
  const lateAbortPenalty = !success ? 0.3 : 0;
  return clamp(1 - correctionPenalty - lateAbortPenalty, 0, 1);
}

/**
 * Smoothness Score (20%):
 * Joint velocity consistency — lower variance = smoother.
 */
function scoreSmoothness(frames: TelemetryFrame[]): number {
  if (frames.length < 2) return 1;

  const allVelocities: number[] = [];
  for (const frame of frames) {
    for (const v of frame.jointVelocities) {
      allVelocities.push(Math.abs(v));
    }
  }

  if (allVelocities.length === 0) return 1;

  // Compute variance
  const mean = allVelocities.reduce((a, b) => a + b, 0) / allVelocities.length;
  const variance =
    allVelocities.reduce((sum, v) => sum + (v - mean) ** 2, 0) / allVelocities.length;

  // Normalize: variance of 4.0 rad²/s² → score 0
  const normalized = clamp(variance / 4.0, 0, 1);
  return 1 - normalized;
}

/**
 * Stability Score (20%):
 * Angular velocity of object in first 500ms after lift.
 */
function scoreStability(
  frames: TelemetryFrame[],
  objectDef: GraspObject,
  success: boolean
): number {
  if (!success) return 0;

  // Find lift frame — first frame where object is rising
  let liftFrameIdx = -1;
  for (let i = 1; i < frames.length; i++) {
    if (
      frames[i].objectPos[1] > frames[i - 1].objectPos[1] + 0.001 &&
      frames[i].gripperState === 'CLOSED'
    ) {
      liftFrameIdx = i;
      break;
    }
  }

  if (liftFrameIdx < 0) return 0.5;

  const liftTime = frames[liftFrameIdx].timestamp;
  const holdFrames = frames.filter(
    (f) => f.timestamp >= liftTime && f.timestamp <= liftTime + HOLD_DURATION_MS
  );

  if (holdFrames.length === 0) return 0.5;

  // Average angular velocity magnitude during hold
  let totalAngVel = 0;
  for (const f of holdFrames) {
    const av = f.objectAngularVel;
    totalAngVel += Math.sqrt(av[0] ** 2 + av[1] ** 2 + av[2] ** 2);
  }
  const avgAngVel = totalAngVel / holdFrames.length;

  return clamp(1 - avgAngVel / objectDef.stability_tolerance, 0, 1);
}

/** Compute all scores for a completed round */
export function computeScores(
  frames: TelemetryFrame[],
  objectDef: GraspObject,
  commitZone: CommitZoneState,
  success: boolean
): RoundScores {
  const alignment = scoreAlignment(frames, objectDef);
  const judgment = scoreJudgment(commitZone, success);
  const smoothness = scoreSmoothness(frames);
  const stability = scoreStability(frames, objectDef, success);

  const overall =
    SCORE_WEIGHT_ALIGNMENT * alignment +
    SCORE_WEIGHT_JUDGMENT * judgment +
    SCORE_WEIGHT_SMOOTHNESS * smoothness +
    SCORE_WEIGHT_STABILITY * stability;

  return { alignment, judgment, smoothness, stability, overall };
}
