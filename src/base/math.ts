
export enum Side {
  left = 0,
  top = 1,
  right = 2,
  bottom = 3,
};

export enum Direction {
  left = 0,
  up = 1,
  right = 2,
  down = 3
};

export enum Facing {
  left = 0,
  right = 1
}

export enum Axis {
  x = 0, y = 1
}

export const SIDE_MASK = {
  left: 1,
  top: 2,
  right: 4,
  bottom: 8
};

export class Coord {
  constructor(public x: number, public y: number) {}

  clone() { return new Coord(this.x, this.y); }

  /** operator + */
  plus(vector: Vector) {
    return new Coord(this.x + vector.x, this.y + vector.y);
  }

  /** operator + */
  plus2(x: number, y: number) {
    return new Coord(this.x + x, this.y + y);
  }

  /** operator - */
  minus(vector: Vector) {
    return new Coord(this.x - vector.x, this.y - vector.y);
  }

  /** operator - */
  diff(base: Coord) {
    return new Vector(this.x - base.x, this.y - base.y);
  }

  /** operator += */
  setPlus(vector: Vector) {
    this.x += vector.x;
    this.y += vector.y;
  }

  /** operator -= */
  setMinus(vector: Vector) {
    this.x -= vector.x;
    this.y -= vector.y;
  }

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

  round() {
    return new Coord(Math.round(this.x), Math.round(this.y));
  }
}

export class Dimension {
  constructor(public width: number, public height: number) {}
}

export class Segment {
  constructor(public l: number, public r: number) {}

  intersects(other: Segment) {
    return this.l < other.r && other.l < this.r;
  }

  contains(value: number) {
    return value >= this.l && value <= this.r;
  }
}

export class Vector {
  constructor(public x: number, public y: number) {}

  static fromCoord(coord: Coord) {
    return new Vector(coord.x, coord.y);
  }

  /** operator = */
  set(vector: Vector) {
    this.x = vector.x;
    this.y = vector.y;
  }

  reset() {
    this.x = this.y = 0;
  }

  clone() { return new Vector(this.x, this.y); }

  get length() { return Math.sqrt(this.x ** 2 + this.y ** 2); }

  /** operator += */
  setPlus(vector: Vector) {
    this.x += vector.x;
    this.y += vector.y;
  }
  /** operator += */
  setPlus2(x: number, y: number) {
    this.x += x;
    this.y += y;
  }

  /** operator * */
  scale(k: number) {
    return new Vector(this.x * k, this.y * k);
  }
  /** operator *= */
  setScale(k: number) {
    this.x *= k;
    this.y *= k;
  }

  round() {
    return new Vector(Math.round(this.x), Math.round(this.y));
  }
}

export const DIRECTION_VECTORS = [
  new Vector(-1, 0),
  new Vector(0, -1),
  new Vector(1, 0),
  new Vector(0, 1)
];

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

  get horizontal() { return new Segment(this.left, this.right); }
  get vertical() { return new Segment(this.top, this.bottom); }

  get center() { return new Coord((this.left + this.right) / 2, (this.top + this.bottom) / 2); }

  clone() {
    return new AABB(this.left, this.top, this.right, this.bottom);
  }

  inside(other: AABB) {
    return this.left >= other.left && this.top >= other.top &&
      this.right <= other.right && this.bottom <= other.bottom;
  }

  offset(offset: Coord | Vector) {
    return this.offset2(offset.x, offset.y);
  }

  offset2(x: number, y: number) {
    return new AABB(this.left + x, this.top + y, this.right + x, this.bottom + y);
  }

  intersects(other: AABB) {
    return (this.left < other.right && other.left < this.right &&
      this.top < other.bottom && other.top < this.bottom);
  }

  grow(x: number, y: number = x) {
    return new AABB(
      this.left - x, this.top - y,
      this.right + x, this.bottom + y
    );
  }

  flipX(x: number) {
    return new AABB(
      2 * x - this.right, this.top,
      2 * x - this.left, this.bottom
    );
  }
}
