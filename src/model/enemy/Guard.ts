import imgGuard from "../../assets/entity/guard.png";
import { Texture, textureManager } from "../../render/TextureManager";
import LevelScene from "../../scene/LevelScene";
import { MapEntity } from "../../map/interfaces";
import { AABB } from "../../base/math";
import Mob from "../Mob";

let textureGuard: Texture;

textureManager.loadTexture("entity/guard", imgGuard).then(texture => {
  textureGuard = texture;
});

const WALK_SPEED = 0.375;

export default class EnemyGuard extends Mob {
  constructor(data: MapEntity) {
    super(data, { maxHealth: 20 });
  }

  get collisionBoxR() {
    return new AABB(-3, -14, 3, 0);
  }

  getRenderInfoR() {
    return {
      box: new AABB(-4, -14, 4, 0),
      texture: textureGuard
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