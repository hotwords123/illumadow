import { Coord } from "../base/math";
import { MapSprite } from "../map/interfaces";
import Sprite from "./Sprite";

/**
 * Sprite models in map.
 */
export default abstract class Model extends Sprite {
  tags: string[];

  constructor(data: MapSprite) {
    super(new Coord(data.x, data.y));
    this.tags = data.tags;
  }
}