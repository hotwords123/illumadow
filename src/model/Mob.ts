import { AABB, Coord, Facing, Side, Vector } from "../base/math";
import { MapEntity, MapEntityType } from "../map/interfaces";
import LevelScene from "../scene/LevelScene";
import Entity, { EscapeBehaviour } from "./Entity";
import { Terrain } from "./Terrain";

export interface MobInit {
  maxHealth: number;
  health?: number;
  invincible?: boolean;
}

/**
 * Mob
 * - is an Entity
 * - has health
 * - can be hurt
 */
export default abstract class Mob extends Entity {
  maxHealth: number;
  health: number;
  invincible: boolean;

  /** ticks left while entity is immune to damage */
  immuneTicks = 0;

  constructor(data: MapEntity, init: MobInit) {
    super(data);

    this.maxHealth = init.maxHealth;
    this.health = init.health ?? this.maxHealth;
    this.invincible = init.invincible ?? false;
  }

  isMob() { return true };
  isEnemy() {
    return ![MapEntityType.player].includes(this.type);
  }

  get hurtBox() {
    return this.boxByFacing(this.hurtBoxR);
  }
  get hurtBoxR(): AABB {
    return this.collisionBoxR;
  }

  get dead() { return this.health <= 0; }

  /**
   * Returns ticks entity will be immune to damage after being hurt.
  */
  get hurtImmuneTicks() { return 0; }

  damage(scene: LevelScene, amount: number, source: DamageSource, evenIfInvincible: boolean = false): boolean {
    if (amount <= 0) return false;
    if (this.dead) return false;
    if (!evenIfInvincible && (this.invincible || this.immuneTicks > 0))
      return false;

    this.health -= amount;
    if (this.health < 0)
      this.health = 0;

    this.onDamage(scene, amount, source);
    if (this.dead) this.die(scene, source);

    this.immuneTicks = this.hurtImmuneTicks;
    return true;
  }

  onDamage(scene: LevelScene, amount: number, source: DamageSource): void {}

  cure(scene: LevelScene, amount: number) {
    if (this.dead) return;
    this.health += amount;
    if (this.health > this.maxHealth)
      this.health = this.maxHealth;
  }

  die(scene: LevelScene, source: DamageSource): void {
    scene.deleteEntity(this);
  }

  tick(scene: LevelScene) {
    if (this.dead) return;

    if (this.immuneTicks > 0)
      this.immuneTicks--;

    super.tick(scene);
  }

  onCrossBorder(scene: LevelScene, side: Side, fullOut: boolean) {
    switch (side) {
      case Side.top:
        return EscapeBehaviour.none;
      case Side.left: case Side.right:
        return EscapeBehaviour.block;
      case Side.bottom:
        if (fullOut) this.damage(scene, Infinity, null, true);
        return EscapeBehaviour.none;
    }
  }
}

export type DamageSource = Terrain | Entity | null;
