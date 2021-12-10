import { AABB, Coord, Facing } from "../../base/math";
import { MapEntityType } from "../../map/interfaces";
import Mob from "../Mob";
import Projectile from ".";
import Player from "../Player";
import LevelScene from "../../scene/LevelScene";

export default class Arrow extends Projectile {
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

  onHitMob(scene: LevelScene, mob: Mob) {
    if (mob.isPlayer() && mob.damage(scene, this.power)) {
      mob.knockback(this.position.plus2(0, 8), this.facing, 3, 3);
      return true;
    }
    return false;
  }
}