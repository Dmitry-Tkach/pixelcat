export const STATE = {
  READY: 'ready',
  PLAYING: 'playing',
  PAUSED: 'paused',
  COMPLETE: 'complete',
  FAILED: 'failed',
};

const ALLOWED = {
  [STATE.READY]: [STATE.PLAYING],
  [STATE.PLAYING]: [STATE.PAUSED, STATE.COMPLETE, STATE.FAILED],
  [STATE.PAUSED]: [STATE.PLAYING],
  [STATE.COMPLETE]: [],
  [STATE.FAILED]: [],
};

// A level's lifecycle. Restarting or moving on creates a new level, and so a new machine.
export class GameStateMachine {
  constructor(onChange = () => {}) {
    this.state = STATE.READY;
    this.onChange = onChange;
  }

  is(state) {
    return this.state === state;
  }

  // Returns false for a move that isn't allowed, such as winning after being caught.
  to(next) {
    if (!ALLOWED[this.state].includes(next)) return false;
    const previous = this.state;
    this.state = next;
    this.onChange(next, previous);
    return true;
  }
}
