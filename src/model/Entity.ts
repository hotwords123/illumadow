import { AABB, Coord, Vector } from "../base";
import LevelScene from "../scene/LevelScene";
import Sprite from "./Sprite";

export interface MobInit {
  maxHealth: number;
  health?: number;
  invulnerable?: boolean;
}

/**
 * 实体：可以移动，具有生命值，可以受到伤害，占据一定空间
 */
export default abstract class Entity extends Sprite {
  velocity: Vector;
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

  abstract get collisionBox(): AABB;
  get hurtBox() { return this.collisionBox; }

  get dead() { return this.health <= 0; }

  damage(amount: number): boolean {
    if (this.dead || this.invulnerable) return false;
    this.health -= amount;
    this.onDamage(amount);
    if (this.health < 0)
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

  tick(scene: LevelScene) {}
}