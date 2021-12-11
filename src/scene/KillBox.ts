import { AABB } from "../base/math";
import { MapKillBox } from "../map/interfaces";

export default class KillBox {
  box: AABB;
  tags: string[];

  constructor(data: MapKillBox) {
    this.box = AABB.offset(data.x, data.y, data.width, data.height);
    this.tags = data.tags;
  }
}