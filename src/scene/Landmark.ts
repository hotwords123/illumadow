import { AABB } from "../base/math";
import { MapLandmark } from "../map/interfaces";

export default class Landmark {
  box: AABB;
  tags: string[];

  constructor(data: MapLandmark) {
    this.box = AABB.offset(data.x, data.y, data.width, data.height);
    this.tags = data.tags;
  }
}