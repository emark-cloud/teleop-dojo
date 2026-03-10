import { GraspObject } from '../objects/object-schema';
import { COMMIT_ZONE_MULTIPLIER, TABLE_Y } from '../config/constants';

export interface CommitZoneState {
  commitHeight: number;
  isInZone: boolean;
  corrections: number;
  entryTime: number | null;
  lastDirection: number; // -1 down, 0 none, 1 up
}

export function createCommitZone(objectDef: GraspObject, objectTopY: number): CommitZoneState {
  return {
    commitHeight: objectTopY + objectDef.height * COMMIT_ZONE_MULTIPLIER,
    isInZone: false,
    corrections: 0,
    entryTime: null,
    lastDirection: 0,
  };
}

/**
 * Update commit zone tracking.
 * Returns true if end effector is currently in the commit zone.
 */
export function updateCommitZone(
  zone: CommitZoneState,
  endEffectorY: number,
  verticalVelocity: number,
  timestamp: number
): boolean {
  const wasInZone = zone.isInZone;
  // Commit zone: from commit height down to table surface
  zone.isInZone = endEffectorY <= zone.commitHeight && endEffectorY > TABLE_Y;

  // Track zone entry
  if (!wasInZone && zone.isInZone) {
    zone.entryTime = timestamp;
  }

  // Track direction changes (corrections) while in zone
  if (zone.isInZone) {
    const currentDir = verticalVelocity > 0.01 ? 1 : verticalVelocity < -0.01 ? -1 : 0;
    if (currentDir !== 0 && zone.lastDirection !== 0 && currentDir !== zone.lastDirection) {
      zone.corrections++;
    }
    if (currentDir !== 0) {
      zone.lastDirection = currentDir;
    }
  }

  return zone.isInZone;
}
