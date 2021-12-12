import { Coord } from "../base/math";
import { ForwardAnimation, GeneratorAnimation } from "../render/Animation";

interface FocusCircleData {
  center: Coord;
  radius: number;
}

export default abstract class FocusCircle implements ForwardAnimation<FocusCircleData> {
  radiusGenerator = new GeneratorAnimation(this.generateRadius());

  constructor(public center: Coord) {}

  abstract generateRadius(): Generator<number>;

  current() {
    return {
      center: this.center.clone(),
      radius: this.radiusGenerator.current()
    };
  }

  next() {
    return this.radiusGenerator.next();
  }
}

export class OpeningFocusCircle extends FocusCircle {
  *generateRadius() {
    let radius = 0;
    for (let i = 0; i < 12; i++) {
      radius += (36 - radius) * 0.2;
      yield radius;
    }
    for (let i = 0; i < 36; i++)
      yield radius;
    let step = (360 - radius) / 24;
    for (let i = 0; i < 24; i++) {
      radius += step;
      yield radius;
    }
  }
}

export class DespawningFocusCircle extends FocusCircle {
  *generateRadius() {
    let radius = 360;
    for (let i = 0; i < 36; i++) {
      radius -= (radius - 36) * 0.15;
      yield radius;
    }
    for (let i = 0; i < 12; i++)
      yield radius;
    let step = radius / 12;
    for (let i = 0; i < 12; i++) {
      radius -= step;
      yield radius;
    }
  }
}

export class RespawningFocusCirle extends FocusCircle {
  *generateRadius() {
    let radius = 0;
    let step = 360 / 40;
    for (let i = 0; i < 40; i++) {
      radius += step;
      yield radius;
    }
  }
}