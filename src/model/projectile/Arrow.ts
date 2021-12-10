import { AABB, Coord, Facing, Side } from "../../base/math";
import { MapEntityType } from "../../map/interfaces";
import Mob from "../Mob";
import Projectile from ".";
import Player from "../Player";
import LevelScene from "../../scene/LevelScene";
import { Terrain } from "../Terrain";

export default class Arrow extends Projectile {
  stoppedTicks = -1;

  constructor(position: Coord, owner: Mob | null, public power: number, facing: Facing) {
    super(position, MapEntityType.arrow, owner);
    this.facing = facing;
    this.velocity.x = (facing === Facing.right ? 1 : -1) * 3;
  }

  canHarmMob(mob: Mob) {
    return mob.type === MapEntityType.player;
  }

  get collisionBoxR() {
    return new AABB(-3, -1, 3, 1);
  }

  getRenderInfoR() {
    return null;
  }

  tick(scene: LevelScene) {
    if (this.stoppedTicks >= 0) {
      this.stoppedTicks++;
      if (this.stoppedTicks >= 600) {
        this.destroy(scene);
        return;
      }
    }
    super.tick(scene);
  }

  onHitMob(scene: LevelScene, mob: Mob) {
    if (this.stoppedTicks >= 0)
      return false;
    if (mob.isPlayer() && mob.damage(scene, this.power)) {
      mob.knockback(this.position.plus2(0, 8), this.facing, 3, 3);
      return true;
    }
    return false;
  }

  onCollideTerrain(scene: LevelScene, terrain: Terrain, side: Side) {
    const facingSide = this.facing === Facing.right ? Side.right : Side.left;
    if (facingSide === side) {
      this.stoppedTicks = 0;
    }
  }
}