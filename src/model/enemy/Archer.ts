import { AABB, Facing } from "../../base/math";
import { MapEntity } from "../../map/interfaces";
import imgArcher from "../../assets/entity/archer.png";
import { Texture, textureManager } from "../../render/TextureManager";
import LevelScene from "../../scene/LevelScene";
import PlatformWalkGoal from "../../ai/PlatformWalkGoal";
import Mob from "../Mob";
import Arrow from "../projectile/Arrow";

let textureArcher: Texture;

textureManager.loadTexture("entity/archer", imgArcher).then(texture => {
  textureArcher = texture;
});

export default class EnemyArcher extends Mob {
  attackCooldown = 0;
  attackSpeed = 30;

  chargeTicks = 0;
  chargeSpeed = 120;

  platformWalkGoal = new PlatformWalkGoal(this);

  constructor(data: MapEntity) {
    super(data, { maxHealth: 2 });
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

    if (this.attackCooldown > 0) {
      this.attackCooldown--;
    } else {
      const shootPos = this.coordByFacing2(4, -6);
      const playerBox = player.hurtBox;
      let deltaX = player.x - this.x;
      let playerInReach = Math.abs(deltaX) <= 160;
      let canShoot = playerBox.vertical.contains(shootPos.y);
  
      if (playerInReach) {
        this.chargeTicks++;
        if (this.chargeTicks >= this.chargeSpeed) {
          if (canShoot) {
            scene.addEntity(new Arrow(shootPos, this, 1, deltaX > 0 ? Facing.right : Facing.left));
            this.attackCooldown = this.attackSpeed;
            this.chargeTicks = 0;
          } else {
            this.chargeTicks = this.chargeSpeed;
          }
        }
      } else {
        this.chargeTicks -= 2;
        if (this.chargeTicks < 0) this.chargeTicks = 0;
      }
    }

    super.tick(scene);
  }
}