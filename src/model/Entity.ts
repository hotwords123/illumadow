import { AABB, Axis, Coord, Facing, Vector } from "../base";
import { MapEntity, TERRAIN_SIZE } from "../map/interfaces";
import { RendererContext } from "../render/Renderer";
import { TextureLike } from "../render/TextureManager";
import LevelScene from "../scene/LevelScene";
import Model from "./Model";
import { RenderInfo } from "./Sprite";

export interface MobInit {
  maxHealth: number;
  health?: number;
  invincible?: boolean;
}

const GRAVITY = 0.2;

/**
 * Entity:
 * - moveable
 * - has health
 * - can be hurt
 * - interacts with terrain
 */
export default abstract class Entity extends Model {
  velocity: Vector;
  oldPosition: Coord;
  oldCollisionBox!: AABB;
  onGround: boolean;

  /** impulse applied to the entity, will override velocity in a few ticks */
  impulseX: number | null = null;
  impulseY: number | null = null;
  /** ticks left when the impulse will apply */
  impulseTicks: number = 0;

  maxHealth: number;
  health: number;
  invincible: boolean;

  /** ticks in air, used for jumping check */
  airTicks = 0;
  /** hurt immune ticks */
  immuneTicks = 0;

  constructor(data: MapEntity, init: MobInit) {
    super(data);

    this.velocity = new Vector(0, 0);
    this.onGround = true;

    this.oldPosition = this.position;

    this.maxHealth = init.maxHealth;
    this.health = init.health ?? this.maxHealth;
    this.invincible = init.invincible ?? false;
  }

  /* ======== Health ======== */

  get dead() { return this.health <= 0; }

  get hurtImmuneTicks() { return 0; }

  damage(scene: LevelScene, amount: number): boolean {
    if (amount <= 0) return false;
    if (this.dead || this.invincible) return false;
    if (this.immuneTicks > 0) return false;
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

  /* ======== Movement ======== */

  abstract get collisionBox(): AABB;
  get hurtBox() { return this.collisionBox; }

  accelerate(facing: Facing, accel: number, maxSpeed: number) {
    const v = this.velocity;
    if (facing === Facing.right && v.x < maxSpeed) 
      v.x = Math.min(maxSpeed, v.x + accel);
    if (facing === Facing.left && v.x > -maxSpeed) 
      v.x = Math.max(-maxSpeed, v.x - accel);
  }

  applyFriction(friction: number) {
    const v = this.velocity;
    if (v.x > 0)
      v.x = Math.max(0, v.x - friction);
    if (v.x < 0)
      v.x = Math.min(0, v.x + friction);
  }

  /* ======== Logic ======== */

  /**
   * Performs movement and terrain interaction logic.
   */
  tick(scene: LevelScene) {
    if (this.dead) return;

    if (this.immuneTicks > 0)
      this.immuneTicks--;

    this.move(scene);
    this.interactTerrains(scene);

    if (this.onGround) {
      this.airTicks = 0;
    } else {
      this.airTicks++;
      this.velocity.y += GRAVITY;
    }
  }

  knockback(source: Coord, facing: Facing, speed: number, ticks: number = 4) {
    const deltaY = this.collisionBox.bottom - source.y;
    const impulseY = deltaY <= 1 ? -0.5 : deltaY >= 3 ? 0.5 : 0;
    const impulseX = (facing === Facing.right ? 1 : -1) * Math.sqrt(1 - impulseY ** 2);

    this.setImpulse(speed * impulseX, speed * impulseY, ticks);
  }

  setImpulse(impulseX: number | null, impulseY: number | null, ticks: number) {
    this.impulseX = impulseX;
    this.impulseY = impulseY;
    this.impulseTicks = ticks;
  }

  /**
   * Move the entity and do the collision check.
   */
  move(scene: LevelScene) {
    this.onGround = false;

    // Impulse
    if (this.impulseTicks > 0) {
      if (this.impulseX !== null)
        this.velocity.x = this.impulseX;
      if (this.impulseY !== null)
        this.velocity.y = this.impulseY;
      this.impulseTicks--;
    } else {
      this.impulseX = this.impulseY = null;
    }

    this.oldPosition = this.position.clone();

    this.oldCollisionBox = this.collisionBox;
    this.position.x += this.velocity.x;
    this.collideTerrains(scene, Axis.x);

    this.oldCollisionBox = this.collisionBox;
    this.position.y += this.velocity.y;
    this.collideTerrains(scene, Axis.y);
  }

  collideTerrains(scene: LevelScene, axis: Axis) {
    const box = scene.fitTerrain(this.collisionBox.grow(1));

    for (let y = box.top; y < box.bottom; y++) {
      for (let x = box.left; x < box.right; x++) {
        const terrain = scene.terrains[y][x];
        terrain?.collideEntity(scene, this, axis);
      }
    }
  }

  /**
   * Interacts with terrain.
   */
  interactTerrains(scene: LevelScene) {
    const box = scene.fitTerrain(this.collisionBox.grow(1));

    for (let y = box.top; y < box.bottom; y++) {
      for (let x = box.left; x < box.right; x++) {
        const terrain = scene.terrains[y][x];
        terrain?.interactEntity(scene, this);
      }
    }
  }

  render(rctx: RendererContext) {
    super.render(rctx);
    if (rctx.debug) {
      rctx.run(({ ctx, pixelSize }) => {
        const { collisionBox: cbox } = this;
        ctx.lineWidth = 2 / pixelSize;
        ctx.strokeStyle = this.onGround ? '#0f0' : '#00f';
        ctx.strokeRect(cbox.left, cbox.top, cbox.width, cbox.height);
      });
    }
  }
}

/**
 * Entity with facing (left or right).
 * 
 * This class functions as a middleware to deal with logic related to facing.
 * 
 * Note that all methods with names ended with 'R' should:
 * - Assume that the entity is facing right, and
 * - Return coordinates relative to `this.position`.
 */
export abstract class EntityWithFacing extends Entity {
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