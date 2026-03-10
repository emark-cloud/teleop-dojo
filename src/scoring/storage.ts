import { RoundScores } from './scorer';

export interface RunRecord {
  run_id: string;
  object_id: string;
  scores: RoundScores;
  outcome: string;
  duration_ms: number;
  timestamp: string;
}

const STORAGE_KEY = 'teleop_dojo_runs';

export function saveRun(record: RunRecord): void {
  try {
    const existing = loadAllRuns();
    existing.push(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // localStorage might be full or unavailable
    console.warn('Failed to save run to localStorage');
  }
}

export function loadAllRuns(): RunRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as RunRecord[];
  } catch {
    return [];
  }
}

export function downloadRunsJSON(): void {
  const runs = loadAllRuns();
  const blob = new Blob([JSON.stringify(runs, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `teleop_dojo_runs_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
