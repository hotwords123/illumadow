import { AABB } from "../../base";
import { MapEntity } from "../../map/interfaces";
import { EntityWithFacing } from "../Entity";
import imgArcher from "../../assets/entity/archer.png";
import { Texture, textureManager } from "../../render/TextureManager";
import LevelScene from "../../scene/LevelScene";
import PlatformWalkGoal from "../../ai/PlatformWalkGoal";

let textureArcher: Texture;

textureManager.loadTexture("entity/archer", imgArcher).then(texture => {
  textureArcher = texture;
});

export default class EnemyArcher extends EntityWithFacing {
  attackCooldown = 0;
  attackSpeed = 120;

  platformWalkGoal = new PlatformWalkGoal(this);

  constructor(data: MapEntity) {
    super(data, { maxHealth: 5 });
  }

  get collisionBoxR() {
    return new AABB(-5, -10, 3, 0);
  }

  getRenderInfoR() {
    return {
      box: new AABB(-5, -10, 3, 0),
      texture: textureArcher
    }
  }

  tick(scene: LevelScene) {
    const { player } = scene;

    this.applyFriction(this.onGround ? 0.75 : 0.25);

    this.platformWalkGoal.keepDistance(scene, player, this.onGround ? 0.75 : 0.25, 0.6, 40, 80);

    super.tick(scene);
  }
}