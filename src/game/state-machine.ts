export enum GameState {
  IDLE = 'IDLE',
  SPAWN = 'SPAWN',
  ALIGN = 'ALIGN',
  COMMIT_ZONE = 'COMMIT_ZONE',
  GRASP_ATTEMPT = 'GRASP_ATTEMPT',
  LIFT = 'LIFT',
  HOLD = 'HOLD',
  SUCCESS = 'SUCCESS',
  FAIL = 'FAIL',
  SUMMARY = 'SUMMARY',
}

export type StateChangeCallback = (from: GameState, to: GameState) => void;

export class StateMachine {
  private _state: GameState = GameState.IDLE;
  private _listeners: StateChangeCallback[] = [];

  get state(): GameState {
    return this._state;
  }

  onChange(cb: StateChangeCallback): void {
    this._listeners.push(cb);
  }

  transition(to: GameState): void {
    const from = this._state;
    if (from === to) return;
    this._state = to;
    for (const cb of this._listeners) {
      cb(from, to);
    }
  }

  /** Valid transitions map */
  canTransition(to: GameState): boolean {
    const from = this._state;
    switch (from) {
      case GameState.IDLE:
        return to === GameState.SPAWN;
      case GameState.SPAWN:
        return to === GameState.ALIGN;
      case GameState.ALIGN:
        return to === GameState.COMMIT_ZONE || to === GameState.LIFT || to === GameState.FAIL;
      case GameState.COMMIT_ZONE:
        return to === GameState.GRASP_ATTEMPT || to === GameState.ALIGN || to === GameState.LIFT || to === GameState.FAIL;
      case GameState.GRASP_ATTEMPT:
        return to === GameState.LIFT || to === GameState.FAIL;
      case GameState.LIFT:
        return to === GameState.HOLD || to === GameState.FAIL;
      case GameState.HOLD:
        return to === GameState.SUCCESS || to === GameState.FAIL;
      case GameState.SUCCESS:
      case GameState.FAIL:
        return to === GameState.SUMMARY;
      case GameState.SUMMARY:
        return to === GameState.IDLE;
      default:
        return false;
    }
  }
}
