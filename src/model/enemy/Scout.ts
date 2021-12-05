import { AABB, Coord } from "../../base";
import Entity from "../Entity";

export default class EnemyScout extends Entity {
  constructor(position: Coord) {
    super(position, { maxHealth: 20 });
  }

  get collisionBox() {
    return this.position.expand(3, 3, 8, 8);
  }

  getRenderInfo() {
    return null;
  }
}