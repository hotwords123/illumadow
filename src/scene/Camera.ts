
import { AABB, Coord } from "../base";
import LevelScene from "./LevelScene";
import { SCENE_WIDTH, SCENE_HEIGHT } from "./Scene";

export default class Camera {
  offset: Coord;

  constructor(private scene: LevelScene) {
    this.offset = new Coord(0, 0);
  }

  get viewBox() {
    return AABB.offset(this.offset.x, this.offset.y, SCENE_WIDTH, SCENE_HEIGHT);
  }
}