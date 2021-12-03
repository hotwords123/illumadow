import { AABB, Coord } from "../base";
import Entity from "./Entity";

export default class Player extends Entity {
  constructor(position: Coord) {
    super(position, { maxHealth: 3 }); // change afterwards
  }

  get boundingBox() {
    return this.position.expand(64, 16, 0, 16);
  }

  get collisionBox() {
    return this.position.expand(0, 0, 0, 0);
  }

  get texture() {
    return null;
  }
}