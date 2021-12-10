import { AABB, Axis, Coord, Facing, Side, Vector } from "../base/math";
import { MapEntity, MapEntityType, TERRAIN_SIZE } from "../map/interfaces";
import { RendererContext } from "../render/Renderer";
import { TextureLike } from "../render/TextureManager";
import LevelScene from "../scene/LevelScene";
import Mob from "./Mob";
import Model from "./Model";
import Player from "./Player";
import Projectile from "./projectile";

export const GRAVITY = 0.2;

/**
 * Entity:
 * - moveable
 * - interacts with terrain
 * - has facing (left or right).
 *
 * Note that all methods with names ended with 'R' should:
 * - Assume that the entity is facing right, and
 * - Return coordinates relative to `this.position`.
 */
export default abstract class Entity extends Model {
  type: MapEntityType;

  velocity: Vector;
  oldPosition: Coord;
  oldCollisionBox!: AABB;

  /** The facing of the entity. */
  facing = Facing.right;

  /** whether the entity is standing on solid ground */
  onGround: boolean;
  /** ticks in air, used for jumping check */
  airTicks = 0;

  /** impulse applied to the entity, will override velocity in a few ticks */
  impulseX: number | null = null;
  impulseY: number | null = null;
  /** ticks left when the impulse will apply */
  impulseTicks: number = 0;

  constructor(data: MapEntity) {
    super(data);

    this.type = data.type;

    this.velocity = new Vector(0, 0);
    this.onGround = true;

    this.oldPosition = this.position;
  }

  /* ======== Basic ======== */

  isMob(): this is Mob { return false; }
  isPlayer(): this is Player { return false; }
  isProjectile(): this is Projectile { return false; }

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

  /* ======== Movement ======== */

  /**
   * Whether movement of this entity should be affected by gravity.
   */
  get underGravity() { return true; }

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

  setImpulse(impulseX: number | null, impulseY: number | null, ticks: number) {
    this.impulseX = impulseX;
    this.impulseY = impulseY;
    this.impulseTicks = ticks;
  }

  knockback(source: Coord, facing: Facing, speed: number, ticks: number = 4) {
    let deltaY = this.collisionBox.bottom - source.y;
    let impulseY = deltaY <= 1 ? -0.5 : deltaY >= 3 ? 0.5 : 0;
    impulseY += Math.random() * 0.2 - 0.1;
    let impulseX = (facing === Facing.right ? 1 : -1) * Math.sqrt(1 - impulseY ** 2);

    speed = speed * (0.8 + Math.random() * 0.4);
    this.setImpulse(speed * impulseX, speed * impulseY, ticks);
  }

  /* ======== Logic ======== */

  /**
   * Performs movement and terrain interaction logic.
   */
  tick(scene: LevelScene) {
    this.move(scene);
    this.interactTerrains(scene);

    if (this.onGround) {
      this.airTicks = 0;
    } else {
      this.airTicks++;
      if (this.underGravity)
        this.velocity.y += GRAVITY;
    }
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

    // Terrain
    this.oldPosition = this.position.clone();

    this.oldCollisionBox = this.collisionBox;
    this.position.x += this.velocity.x;
    this.collideTerrains(scene, Axis.x);

    this.oldCollisionBox = this.collisionBox;
    this.position.y += this.velocity.y;
    this.collideTerrains(scene, Axis.y);

    // Map border
    const { collisionBox } = this;
    if (collisionBox.left < 0)
      this.triggerCrossBorder(scene, Side.left, collisionBox.left, collisionBox.right <= 0);
    if (collisionBox.right > scene.width)
      this.triggerCrossBorder(scene, Side.right, collisionBox.right - scene.width, collisionBox.left >= scene.width);
    if (collisionBox.top < 0)
      this.triggerCrossBorder(scene, Side.top, collisionBox.top, collisionBox.bottom <= 0);
    if (collisionBox.bottom > scene.height)
      this.triggerCrossBorder(scene, Side.bottom, collisionBox.bottom - scene.height, collisionBox.top >= scene.height);
  }

  private triggerCrossBorder(scene: LevelScene, side: Side, offset: number, fullOut: boolean) {
    switch (this.onCrossBorder(scene, side, fullOut)) {
      case EscapeBehaviour.block:
        if (side === Side.left || side === Side.right)
          this.position.x -= offset;
        else
          this.position.y -= offset;
        break;

      case EscapeBehaviour.delete:
        if (fullOut)
          scene.deleteEntity(this);
        break;
    }
  }

  /**
   * Called when the entity crosses the border of the world.
   * @param fullOut Whether the entity has completely moved out of the world
   */
  onCrossBorder(scene: LevelScene, side: Side, fullOut: boolean): EscapeBehaviour {
    return EscapeBehaviour.none;
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

export interface RenderInfoR {
  box: AABB;
  texture: TextureLike;
}

/**
 * The behaviour entity will follow when escaping the world border.
 */
export enum EscapeBehaviour {
  /** do nothing */ none,
  /** blocked by the border */ block,
  /** deleted if completely out of scene */ delete
}