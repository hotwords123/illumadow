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
  playerInTouchTicks = 0;

  attackCooldown = 0;
  attackSpeed = 45;
  attackDamage = 1;

  constructor(data: MapEntity) {
    super(data, { maxHealth: 5 });
  }

  get collisionBoxR() {
    return new AABB(-4, -10, 4, 0);
  }

  get attackBox() {
    return this.boxByFacing(new AABB(-2, -8, 10, 0));
  }

  getRenderInfoR() {
    return {
      box: new AABB(-4, -10, 4, 0),
      texture: textureScout
    };
  }

  tick(scene: LevelScene) {
    const { player } = scene;

    this.applyFriction(this.onGround ? 0.75 : 0.25);

    if (player.x > this.position.x) {
      // this.velocity.x = WALK_SPEED;
      this.facing = Facing.right;
    } else {
      // this.velocity.x = -WALK_SPEED;
      this.facing = Facing.left;
    }

    const playerInTouch = this.attackBox.intersects(scene.player.hurtBox);
    if (playerInTouch)
      this.playerInTouchTicks++;
    else
      this.playerInTouchTicks = Math.max(0, this.playerInTouchTicks - 2);

    if (this.attackCooldown > 0) {
      this.attackCooldown--;
    } else {
      if (playerInTouch && this.playerInTouchTicks >= 5) {
        if (player.damage(scene, this.attackDamage)) {
          player.knockback(this.position, this.facing, 2.5);
          this.attackCooldown = this.attackSpeed;
        }
      }
    }

    super.tick(scene);
  }
}