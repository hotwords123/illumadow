
export enum Direction {
  left = 0,
  top = 1,
  right = 2,
  bottom = 3
};

export const SIDE_MASK = {
  left: 1,
  top: 2,
  right: 4,
  bottom: 8
};

export class Coord {
  constructor(public x: number, public y: number) {}

  expand(left: number, top: number, right: number = left, bottom: number = top) {
    return new AABB(
      this.x - left, this.y - top,
      this.x + right, this.y + bottom
    );
  }

  inside(rect: AABB) {
    return this.x >= rect.left && this.x <= rect.right &&
      this.y >= rect.top && this.y <= rect.bottom;
  }
}

export class Dimension {
  constructor(public width: number, public height: number) {}
}

export class Segment {
  constructor(public l: number, public r: number) {}
}

export class Vector {
  constructor(public x: number, public y: number) {}

  static fromCoord(coord: Coord) {
    return new Vector(coord.x, coord.y);
  }

  clone() {
    return new Vector(this.x, this.y);
  }
}

function sort2(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

export class AABB {
  constructor(public left: number, public top: number, public right: number, public bottom: number) {}

  static centered(center: Coord, width: number, height: number) {
    return center.expand(width / 2, height / 2)
  }

  static offset(left: number, top: number, width: number, height: number) {
    return new AABB(left, top, left + width, top + height);
  }

  static origin(width: number, height: number) {
    return new AABB(0, 0, width, height);
  }

  static cornered(a: Coord, b: Coord) {
    const [left, right] = sort2(a.x, b.x);
    const [top, bottom] = sort2(a.y, b.y);
    return new AABB(left, top, right, bottom);
  }

  get width() { return this.right - this.left; }
  get height() { return this.bottom - this.top; }

  inside(other: AABB) {
    return this.left >= other.left && this.top >= other.top &&
      this.right <= other.right && this.bottom <= other.bottom;
  }

  offset(x: number, y: number) {
    return new AABB(this.left + x, this.top + y, this.right + x, this.bottom + y);
  }

  clone() {
    return new AABB(this.left, this.top, this.right, this.bottom);
  }
}
