import { AABB, Facing, Vector } from "../base";
import { Texture, textureManager } from "../render/TextureManager";
import Entity, { EntityWithFacing } from "./Entity";
import imgPlayer from "../assets/entity/player.png";
import LevelScene from "../scene/LevelScene";
import { MapEntityPlayer } from "../map/interfaces";

let texturePlayer: Texture;

const
  MAX_GROUND_SPEED = 1.5,
  MAX_AIR_SPEED = 1.25,
  MAX_FALL_SPEED = 3,
  GROUND_ACCELERATION = 1,
  AIR_ACCELERATION = 0.4,
  GROUND_FRICTION = 0.6,
  AIR_FRICTION = 0.05,
  JUMP_SPEED_X = 2,
  JUMP_SPEED_Y_SIDE = 3,
  JUMP_SPEED_Y_UP = 3.5,
  MELEE_KNOCKBACK = 3,
  DIVE_ATTACK_PUSH_X = 3,
  DIVE_ATTACK_PUSH_Y = 3,
  DIVE_ATTACK_REBOUNCE_X = 3.5,
  DIVE_ATTACK_REBOUNCE_Y = 3.5;

textureManager.loadTexture("entity/player", imgPlayer).then(texture => {
  texturePlayer = texture;
});

enum State {
  walk = 0,
  duck = 1,
  dash = 2,
}

export default class Player extends EntityWithFacing {
  /** player state */
  state = State.walk;

  /** damage of single melee attack */
  meleeDamage = 1;
  /** cooldown ticks after each melee attack */
  meleeSpeed = 20;

  /** tick index when the corresponding key was pressed */
  jumpedAt = -1;
  meleedAt = -1;

  meleeCooldown = 0;

  /** whether the player is respawning */
  respawning = false;

  constructor({ health, maxHealth, ...data }: MapEntityPlayer) {
    super(data, { health, maxHealth });
  }

  get collisionBoxR() {
    return new AABB(-4, -10, 1, 0);
  }

  get hurtImmuneTicks() { return 60; }

  get meleeBoxHorizontal() {
    return this.boxByFacing(new AABB(0, -10, 18, 0));
  }

  get diveBoxCenter() {
    return this.position.expand(8, 0, 8, 10);
  }

  get diveBoxLeft() {
    return this.position.expand(14, 0, 2, 9);
  }

  get diveBoxRight() {
    return this.position.expand(2, 0, 14, 9);
  }

  getRenderInfoR() {
    // blink after hurt
    if (this.immuneTicks % 10 >= 5)
      return null;
    return {
      box: new AABB(-6, -12, 6, 0),
      texture: texturePlayer
    };
  }

  getMovement(scene: LevelScene): number {
    let x = 0;
    if (scene.isKeyPressed("move.left"))
      x--;
    if (scene.isKeyPressed("move.right"))
      x++;
    return x;
  }

  receiveInput(scene: LevelScene, command: string, event: string) {
    switch (command) {
      case "move.jump":
        if (event === "down")
          this.jumpedAt = scene.ticks;
        break;

      case "skill.melee":
        if (event === "down") {
          this.meleedAt = scene.ticks;
          scene.shortPause(2);
        }
        break;
    }
  }

  tick(scene: LevelScene) {
    if (this.dead) return;

    // Move
    const movement = this.getMovement(scene);
    if (movement !== 0)
      this.facing = movement > 0 ? Facing.right : Facing.left;

    const
      maxSpeed = this.onGround ? MAX_GROUND_SPEED : MAX_AIR_SPEED,
      acceleration = this.onGround ? GROUND_ACCELERATION : AIR_ACCELERATION;

    const { velocity } = this;

    this.applyFriction(this.onGround ? GROUND_FRICTION : AIR_FRICTION);

    if (movement !== 0)
      this.accelerate(movement > 0 ? Facing.right : Facing.left, acceleration, maxSpeed);

    // Jump
    if (this.airTicks <= 3 && this.jumpedAt === scene.ticks) {
      velocity.y = movement === 0 ? -JUMP_SPEED_Y_UP : -JUMP_SPEED_Y_SIDE;
      if (movement > 0)
        velocity.x = JUMP_SPEED_X;
      if (movement < 0)
        velocity.x = -JUMP_SPEED_X;
    }

    // Melee attack
    if (scene.ticks === this.meleedAt && this.meleeCooldown === 0) {
      this.meleeAttack(scene);
    } else {
      if (this.meleeCooldown > 0)
        this.meleeCooldown--;
    }

    this.velocity.y = Math.min(MAX_FALL_SPEED, this.velocity.y);

    super.tick(scene);
  }

  meleeAttack(scene: LevelScene) {
    if (scene.isKeyPressed("move.down")) {
      // Dive attack
      let hit = false;
      const dir = this.getMovement(scene);
      const targets = scene.getEntitiesInArea(
        [this.diveBoxLeft, this.diveBoxCenter, this.diveBoxRight][dir + 1]);

      for (const target of targets) {
        if (target.damage(scene, this.meleeDamage)) {
          hit = true;
          target.velocity.y += DIVE_ATTACK_PUSH_Y;
          if (dir)
            target.setImpulse(dir * DIVE_ATTACK_PUSH_X, null, 4);
        }
      }

      this.meleeCooldown = this.meleeSpeed;
      if (hit) {
        this.velocity.x += -dir * DIVE_ATTACK_REBOUNCE_X;
        this.velocity.y = -DIVE_ATTACK_REBOUNCE_Y;
      }
    } else {
      // Horizontal attack
      const targets = scene.getEntitiesInArea(this.meleeBoxHorizontal);

      for (const target of targets) {
        if (target.damage(scene, this.meleeDamage)) {
          target.knockback(this.position, this.facing, MELEE_KNOCKBACK);
        }
      }

      this.meleeCooldown = this.meleeSpeed;
    }
  }

  die(scene: LevelScene) {
    scene.gameOver();

    // don't call super.die(scene) here as it would try to remove player from the scene
  }
}