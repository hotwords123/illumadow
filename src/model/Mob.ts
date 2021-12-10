import { AABB, Coord, Facing, Side, Vector } from "../base/math";
import { MapEntity } from "../map/interfaces";
import { TextureLike } from "../render/TextureManager";
import LevelScene from "../scene/LevelScene";
import Entity, { EscapeBehaviour } from "./Entity";

export interface MobInit {
  maxHealth: number;
  health?: number;
  invincible?: boolean;
}

/**
 * Mob
 * - is an entity
 * - has health
 * - can be hurt
 */
export default abstract class Mob extends Entity {
  maxHealth: number;
  health: number;
  invincible: boolean;

  /** hurt immune ticks */
  immuneTicks = 0;

  constructor(data: MapEntity, init: MobInit) {
    super(data);
    
    this.maxHealth = init.maxHealth;
    this.health = init.health ?? this.maxHealth;
    this.invincible = init.invincible ?? false;
  }

  /* ======== Health ======== */

  get dead() { return this.health <= 0; }

  get hurtImmuneTicks() { return 0; }

  damage(scene: LevelScene, amount: number, evenIfInvincible: boolean = false): boolean {
    if (amount <= 0) return false;
    if (this.dead) return false;
    if (!evenIfInvincible && (this.invincible || this.immuneTicks > 0)) return false;
    this.health -= amount;
    if (this.dead) this.die(scene);
    this.immuneTicks = this.hurtImmuneTicks;
    return true;
  }

  cure(scene: LevelScene, amount: number) {
    if (this.dead) return;
    this.health += amount;
    if (this.health > this.maxHealth)
      this.health = this.maxHealth;
  }

  die(scene: LevelScene): void {
    scene.deleteEntity(this);
  }

  get hurtBox() { return this.collisionBox; }

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
        if (fullOut) this.die(scene);
        return EscapeBehaviour.none;
    }
  }
}

/**
 * Mob with facing (left or right).
 * 
 * This class functions as a middleware to deal with logic related to facing.
 * 
 * Note that all methods with names ended with 'R' should:
 * - Assume that the entity is facing right, and
 * - Return coordinates relative to `this.position`.
 */
export abstract class MobWithFacing extends Mob {
  /** The facing of the entity. */
  facing = Facing.right;

  /**
   * Flip coordinates if facing left.
   * 
   * Note that `vector` should be relative to `this.position`,
   * and the coordinates returned will be absolute.
   */
  coordByFacing(vector: Vector) {
    return this.position.plus2(this.facing === Facing.right ? vector.x : -vector.x, vector.y);
  }
  coordByFacing2(x: number, y: number) {
    return this.position.plus2(this.facing === Facing.right ? x : -x, y);
  }

  /**
   * Flip box if facing left.
   * 
   * Note that `box` should be relative to `this.position`,
   * and the box returned will contain absolute coordinates.
   */
  boxByFacing(box: AABB) {
    return (this.facing === Facing.right ? box : box.flipX(0)).offset(this.position);
  }

  get collisionBox() {
    return this.boxByFacing(this.collisionBoxR);
  }
  /**
   * Returns collision box of entity, assuming it is facing right.
   */
  abstract get collisionBoxR(): AABB;

  get hurtBox() {
    return this.boxByFacing(this.hurtBoxR);
  }
  get hurtBoxR(): AABB {
    return this.collisionBoxR;
  }

  getRenderInfo() {
    const info = this.getRenderInfoR();
    if (!info) return null;
    const flipped = this.facing === Facing.left;
    return {
      box: (flipped ? info.box.flipX(0) : info.box).offset(this.position.round()),
      flipped,
      texture: info.texture
    };
  }
  /**
   * Returns information used for rendering, assuming entity is facing right.
   * Note that `box` should be **relative to** `this.position`.
   */
  abstract getRenderInfoR(): RenderInfoR | null;
}

export interface RenderInfoR {
  box: AABB;
  texture: TextureLike;
}