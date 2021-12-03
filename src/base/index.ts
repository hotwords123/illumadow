
export class Coord {
  constructor(public x: number, public y: number) {}

  expand(left: number, top: number, right: number = left, bottom: number = top) {
    return new AABB(
      this.x - left, this.y - top,
      this.x + right, this.y + bottom
    );
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

export class AABB {
  constructor(public left: number, public top: number, public right: number, public bottom: number) {}

  static centered(center: Coord, width: number, height: number) {
    return center.expand(width / 2, height / 2)
  }

  get width() { return this.right - this.left; }
  get height() { return this.bottom - this.top; }
}
