import { Texture, TextureLike, textureManager } from "./TextureManager";

interface AnimationBase<T> {
  /** current animation value */
  current(): T;
}

export interface ForwardAnimation<T> extends AnimationBase<T> {
  /**
   * Returns true if the animation has ended; false otherwise.
   */
  next(): boolean;
}

export interface RandomAnimation<T> extends ForwardAnimation<T> {
  /**
   * Set the current index of the animation.
   */
  set(index: number): boolean;
}

export class GeneratorAnimation<T> implements ForwardAnimation<T> {
  value: T;

  constructor(private generator: Generator<T>) {
    const first = generator.next();
    if (first.done)
      throw new Error("generator ended on first iteration");
    this.value = first.value;
  }

  current() {
    return this.value;
  }

  next() {
    const result = this.generator.next();
    if (result.done) return true;
    this.value = result.value;
    return false;
  }
}

export class FrameSequence implements RandomAnimation<TextureLike> {
  frameCount: number;
  index = 0;
  loop = false;

  constructor(public frames: TextureLike[]) {
    if (frames.length === 0)
      throw new Error("frame sequence should contain at least one frame");
    this.frameCount = frames.length;
  }

  static fromClips(textureName: string, clipNames: string[]) {
    const texture = textureManager.get(textureName) as Texture;
    return new FrameSequence(clipNames.map(name => texture.getClip(name)));
  }

  static fromClipRanges(textureName: string, ranges: [string, number][]) {
    return this.fromClips(textureName,
      ranges.flatMap(([name, count]) => new Array(count).fill(name)));
  }

  setLoop(flag: boolean): this {
    this.loop = flag;
    return this;
  }

  current() {
    return this.frames[this.index];
  }

  set(index: number) {
    if (this.loop) {
      this.index = index % this.frameCount;
      return false;
    } else {
      if (index >= this.frameCount)
        return true;
      this.index = index;
      return false;
    }
  }

  next() {
    return this.set(this.index + 1);
  }
}