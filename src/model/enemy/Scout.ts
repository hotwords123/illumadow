import { AABB, Coord } from "../../base";
import Entity from "../Entity";
import imgScout from "../../assets/entity/scout.png";
import { Texture, textureManager } from "../../render/TextureManager";
import LevelScene from "../../scene/LevelScene";
import { MapEntity } from "../../map/interfaces";

let textureScout: Texture;

textureManager.loadTexture(imgScout).then(texture => {
  textureScout = texture;
});

const WALK_SPEED = 0.75;

export default class EnemyScout extends Entity {
  constructor(data: MapEntity) {
    super(data, { maxHealth: 20 });
  }

  get collisionBox() {
    return this.position.expand(3, 14, 3, 0);
  }

  getRenderInfo() {
    return {
      box: this.position.expand(4, 14, 4, 0),
      texture: textureScout
    };
  }

  tick(scene: LevelScene) {
    if (scene.player.x > this.position.x) {
      this.velocity.x = WALK_SPEED;
    } else {
      this.velocity.x = -WALK_SPEED;
    }

    super.tick(scene);
  }
}