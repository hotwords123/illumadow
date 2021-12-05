import { AABB, Coord, Vector } from "../base";
import { TERRAIN_SIZE } from "../map/interfaces";
import { RendererContext } from "../render/Renderer";
import LevelScene from "../scene/LevelScene";
import Sprite from "./Sprite";

export interface MobInit {
  maxHealth: number;
  health?: number;
  invulnerable?: boolean;
}

const GRAVITY = 0.25;

/**
 * Entity:
 * - moveable
 * - has health
 * - can be hurt
 * - interacts with terrain
 */
export default abstract class Entity extends Sprite {
  velocity: Vector;
  oldPosition!: Coord;
  oldCollisionBox!: AABB;
  onGround: boolean;

  maxHealth: number;
  health: number;
  invulnerable: boolean;

  constructor(position: Coord, init: MobInit) {
    super(position);

    this.velocity = new Vector(0, 0);
    this.onGround = true;

    this.maxHealth = init.maxHealth;
    this.health = init.health ?? this.maxHealth;
    this.invulnerable = init.invulnerable ?? false;
  }

  /* ======== Health ======== */

  get dead() { return this.health <= 0; }

  damage(amount: number): boolean {
    if (this.dead || this.invulnerable) return false;
    this.health -= amount;
    this.onDamage(amount);
    if (this.dead)
      this.onDead();
    return true;
  }

  cure(amount: number) {
    if (this.dead) return;
    this.health += amount;
    if (this.health > this.maxHealth)
      this.health = this.maxHealth;
  }

  onDamage(amount: number): void {}
  onDead(): void {}

  /* ======== Movement ======== */

  abstract get collisionBox(): AABB;
  get hurtBox() { return this.collisionBox; }

  /* ======== Logic ======== */

  /**
   * Performs movement and terrain interaction logic.
   */
  tick(scene: LevelScene) {
    this.oldPosition = this.position.clone();
    this.oldCollisionBox = this.collisionBox;

    this.position.setPlus(this.velocity);

    this.onGround = false;
    this.interactTerrains(scene);

    if (!this.onGround)
      this.velocity.y += GRAVITY;
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
      const { ctx, pixelSize } = rctx;
      const { collisionBox: cbox } = this;
      ctx.lineWidth = 2 / pixelSize;
      ctx.strokeStyle = this.onGround ? '#0f0' : '#f00';
      ctx.strokeRect(cbox.left, cbox.top, cbox.width, cbox.height);
    }
  }
}