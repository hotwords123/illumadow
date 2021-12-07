import { AABB, Axis, Coord, Vector } from "../base";
import { MapEntity, TERRAIN_SIZE } from "../map/interfaces";
import { RendererContext } from "../render/Renderer";
import LevelScene from "../scene/LevelScene";
import Model from "./Model";

export interface MobInit {
  maxHealth: number;
  health?: number;
  invincible?: boolean;
}

const GRAVITY = 0.25;

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

  damage(amount: number): boolean {
    if (amount <= 0) return false;
    if (this.dead || this.invincible) return false;
    if (this.immuneTicks > 0) return false;
    this.health -= amount;
    if (this.dead) this.die();
    this.immuneTicks = this.hurtImmuneTicks;
    return true;
  }

  cure(amount: number) {
    if (this.dead) return;
    this.health += amount;
    if (this.health > this.maxHealth)
      this.health = this.maxHealth;
  }

  die(): void {}

  /* ======== Movement ======== */

  abstract get collisionBox(): AABB;
  get hurtBox() { return this.collisionBox; }

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

  /**
   * Move the entity and do the collision check.
   */
  move(scene: LevelScene) {
    this.onGround = false;

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