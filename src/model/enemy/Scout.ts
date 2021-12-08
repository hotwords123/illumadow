import { AABB, Coord, Facing } from "../../base";
import Entity, { EntityWithFacing } from "../Entity";
import imgScout from "../../assets/entity/scout.png";
import { Texture, textureManager } from "../../render/TextureManager";
import LevelScene from "../../scene/LevelScene";
import { MapEntity } from "../../map/interfaces";

let textureScout: Texture;

textureManager.loadTexture("entity/scout", imgScout).then(texture => {
  textureScout = texture;
});

const WALK_SPEED = 0.75;

export default class EnemyScout extends EntityWithFacing {
  constructor(data: MapEntity) {
    super(data, { maxHealth: 20 });
  }

  get collisionBoxR() {
    return new AABB(-4, -10, 4, 0);
  }

  getRenderInfoR() {
    return {
      box: new AABB(-4, -10, 4, 0),
      texture: textureScout
    };
  }

  tick(scene: LevelScene) {
    if (scene.player.x > this.position.x) {
      // this.velocity.x = WALK_SPEED;
      this.facing = Facing.right;
    } else {
      // this.velocity.x = -WALK_SPEED;
      this.facing = Facing.left;
    }

    super.tick(scene);
  }
}