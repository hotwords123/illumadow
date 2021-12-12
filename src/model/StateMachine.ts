import { FrameSequence } from "../render/Animation";

export interface StateMeta<S> {
  next: S;
  animation: FrameSequence;
}

export default class StateMachine<S> {
  states: Map<S, StateMeta<S>>;
  animation: FrameSequence;
  interrupted = false;

  constructor(states: [S, StateMeta<S>][], public current: S) {
    this.states = new Map(states);
    this.animation = this.states.get(current)!.animation;
  }

  set(state: S, index = 0, interrupt = true) {
    this.current = state;
    this.animation = this.states.get(this.current)!.animation;
    this.animation.set(index);
    this.interrupted = interrupt;
  }

  next() {
    if (this.interrupted) {
      this.interrupted = false;
      return;
    }
    if (this.animation.next()) {
      this.set(this.states.get(this.current)!.next, 0, false);
    }
  }
}