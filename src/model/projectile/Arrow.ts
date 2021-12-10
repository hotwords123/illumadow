import { AABB, Coord, Facing } from "../../base/math";
import { MapEntityType } from "../../map/interfaces";
import Mob from "../Mob";
import Projectile from ".";
import Player from "../Player";
import LevelScene from "../../scene/LevelScene";

export default class Arrow extends Projectile {
  constructor(position: Coord, owner: Mob | null, public power: number) {
    super(position, MapEntityType.arrow, owner);
  }

  canHarmMob(mob: Mob) {
    return mob.type === MapEntityType.player;
  }

  get collisionBoxR() {
    return new AABB(0, 0, 0, 0);
  }

  getRenderInfoR() {
    return null;
  }

  onHitMob(scene: LevelScene, mob: Mob) {
    if (mob.isPlayer() && mob.damage(scene, this.power)) {
      mob.knockback(this.position, this.facing, 4, 3);
      return true;
    }
    return false;
  }
}