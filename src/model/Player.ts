import { AABB, Facing, Side, Vector } from "../base/math";
import { Texture, TextureLike, textureManager } from "../render/TextureManager";
import Entity, { EscapeBehaviour, GRAVITY } from "./Entity";
import imgPlayer from "../assets/entity/player.png";
import LevelScene from "../scene/LevelScene";
import { MapEntityPlayer, MapEntityType, MapTerrainType } from "../map/interfaces";
import { RendererContext } from "../render/Renderer";
import Mob, { DamageSource } from "./Mob";
import { Terrain } from "./Terrain";
import { ForwardAnimation, FrameSequence } from "../render/Animation";
import { DiveAttackWave, DiveSideAttackWave, MeleeWave } from "./Particle";
import { STRINGS } from "../scene/Subtitle";

let texturePlayer: Texture;

const
  MAX_GROUND_SPEED = 1.5,
  MAX_AIR_SPEED = 1.25,
  MAX_FALL_SPEED = 3,
  GROUND_ACCELERATION = 1,
  AIR_ACCELERATION = 0.45,
  GROUND_FRICTION = 0.6,
  AIR_FRICTION = 0.15,
  JUMP_SPEED_X = 2.5,
  JUMP_SPEED_Y_SIDE = 2.75,
  JUMP_SPEED_Y_UP = 3,
  MELEE_KNOCKBACK = 3,
  DIVE_ATTACK_PUSH_X = 3,
  DIVE_ATTACK_PUSH_Y = 3,
  DIVE_ATTACK_REBOUNCE_X = 4,
  DIVE_ATTACK_REBOUNCE_Y = 3.25;

textureManager.loadTexture("entity/player", imgPlayer).then(texture => {
  texturePlayer = texture;
  texturePlayer.defineClips([
    ["normal", "attack1", "attack2", "attack3", "attack4", "attack5"]
  ], 12, 12);
});

enum State {
  normal = 0,
  walk = 1,
  attack = 2,
  attackReversed = 3
}

export default class Player extends Mob {
  /** player state */
  state = State.walk;

  /** damage of single melee attack */
  meleeDamage = 1;
  /** cooldown ticks after each melee attack */
  meleeSpeed = 30;

  /** tick index when the corresponding key was pressed / released */
  jumpPressedAt = -1;
  jumpReleasedAt = -1;
  meleePressedAt = -1;

  jumpedAt = -99;

  meleeCooldown = 0;

  outOfControlTicks = 0;

  animation: FrameSequence = this.createAnimation(State.normal);

  constructor({ health, maxHealth, ...data }: MapEntityPlayer) {
    super(data, { health, maxHealth });
  }

  isPlayer() { return true; }

  get collisionBoxR() {
    return new AABB(-4, -10, 3, 0);
  }

  get hurtImmuneTicks() { return 60; }

  get meleeBoxHorizontal() {
    return this.boxByFacing(new AABB(0, -12, 22, 0));
  }

  get diveBoxCenter() {
    return this.position.expand(6, 0, 6, 16);
  }

  get diveBoxLeft() {
    return this.position.expand(10, 0, 2, 16);
  }

  get diveBoxRight() {
    return this.position.expand(2, 0, 10, 16);
  }

  getRenderInfoR() {
    return {
      box: new AABB(-6, -12, 6, 0),
      texture: this.animation.current()
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
          this.jumpPressedAt = scene.ticks;
        else if (event === "up")
          this.jumpReleasedAt = scene.ticks;
        break;

      case "skill.melee":
        if (event === "down") {
          this.meleePressedAt = scene.ticks;
          if (this.meleeCooldown === 0)
            scene.shortPause(2);
        }
        break;
    }
  }

  createAnimation(state: State): FrameSequence {
    switch (state) {
      case State.normal: default:
        return FrameSequence.fromClips("entity/player", ["normal"]).setLoop(true);

      case State.attack:
        return FrameSequence.fromClipRanges("entity/player", [
          ["attack1", 1],
          ["attack2", 1],
          ["attack3", 1],
          ["attack4", 1],
          ["attack5", 5],
          ["attack4", 3],
          ["attack3", 3],
          ["attack2", 3],
          ["attack1", 3]
        ]);

      case State.attackReversed:
        return FrameSequence.fromClipRanges("entity/player", [
          ["attack5", 2],
          ["attack4", 2],
          ["attack3", 2],
          ["attack2", 2],
          ["attack1", 2]
        ]);
    }
  }

  tick(scene: LevelScene) {
    if (this.dead) return;

    this.applyFriction(this.onGround ? GROUND_FRICTION : AIR_FRICTION);

    if (this.animation.next())
      this.animation = this.createAnimation(State.normal);

    if (this.outOfControlTicks > 0) {
      this.outOfControlTicks--;
    } else {
      // Move
      const movement = this.getMovement(scene);
      if (movement !== 0)
        this.facing = movement > 0 ? Facing.right : Facing.left;
  
      const
        maxSpeed = this.onGround ? MAX_GROUND_SPEED : MAX_AIR_SPEED,
        acceleration = this.onGround ? GROUND_ACCELERATION : AIR_ACCELERATION;
  
      const { velocity } = this;
  
      if (movement !== 0)
        this.accelerate(movement > 0 ? Facing.right : Facing.left, acceleration, maxSpeed);
  
      // Jump
      if (this.airTicks <= 3 && this.jumpPressedAt === scene.ticks) {
        velocity.y = movement === 0 ? -JUMP_SPEED_Y_UP : -JUMP_SPEED_Y_SIDE;
        if (movement > 0)
          velocity.x = JUMP_SPEED_X;
        if (movement < 0)
          velocity.x = -JUMP_SPEED_X;
        this.jumpedAt = scene.ticks;
      }
  
      const ticksAfterJumped = scene.ticks - this.jumpPressedAt;
      if (ticksAfterJumped >= 6 && ticksAfterJumped <= 12 && this.jumpReleasedAt < this.jumpPressedAt) {
        this.velocity.y -= GRAVITY;
      }
  
      // Melee attack
      if (scene.ticks === this.meleePressedAt && this.meleeCooldown === 0) {
        this.meleeAttack(scene);
      } else {
        if (this.meleeCooldown > 0)
          this.meleeCooldown--;
      }
    }

    this.velocity.y = Math.min(MAX_FALL_SPEED, this.velocity.y);

    super.tick(scene);
  }

  canAttack(target: Entity) {
    if (target.isMob())
      return target.isEnemy();
    else if (target.isProjectile())
      return [MapEntityType.arrow].includes(target.type);
    else
      return false;
  }

  meleeAttack(scene: LevelScene) {
    if (scene.isKeyPressed("move.down")) {
      // Dive attack
      let hit = false;
      const dir = this.getMovement(scene);
      const targets = scene.getEntitiesInArea(
        [this.diveBoxLeft, this.diveBoxCenter, this.diveBoxRight][dir + 1]);

      for (const target of targets) {
        if (target.isMob() && target.isEnemy()) {
          if (target.damage(scene, this.meleeDamage, this)) {
            hit = true;
            target.velocity.y += DIVE_ATTACK_PUSH_Y;
            target.setImpulse((dir - 0.25 + Math.random() * 0.5) * DIVE_ATTACK_PUSH_X, null, 4);
          }
        }
      }

      this.meleeCooldown = this.meleeSpeed;
      if (hit) {
        this.velocity.x += -dir * DIVE_ATTACK_REBOUNCE_X;
        this.velocity.y = -DIVE_ATTACK_REBOUNCE_Y;
      }

      this.animation = this.createAnimation(dir === 0 ? State.attackReversed : State.attack);
      if (dir === 0)
        scene.addParticle(new DiveAttackWave(this.position.clone()));
      else
        scene.addParticle(new DiveSideAttackWave(this.position.clone(), dir > 0 ? Facing.right : Facing.left));
    } else {
      // Horizontal attack
      let targets = scene.getEntitiesInArea(this.meleeBoxHorizontal).filter(x => this.canAttack(x));

      // Check if there are enemies in the opposite direction
      if (!targets.length) {
        let was = this.facing;
        this.facing = was === Facing.right ? Facing.left : Facing.right;
        targets = scene.getEntitiesInArea(this.meleeBoxHorizontal).filter(x => this.canAttack(x));
        if (!targets.length)
          this.facing = was;
      }

      for (const target of targets) {
        if (target.isMob()) {
          if (target.damage(scene, this.meleeDamage, this)) {
            target.knockback(this.position, this.facing, MELEE_KNOCKBACK);
          }
        } else if (target.isProjectile()) {
          target.destroy(scene);
        }
      }

      this.meleeCooldown = this.meleeSpeed;
      this.animation = this.createAnimation(State.attack);

      scene.addParticle(new MeleeWave(this.position.clone(), this.facing));
    }
  }

  onCrossBorder(scene: LevelScene, side: Side, fullOut: boolean): EscapeBehaviour {
    if (side === Side.bottom) {
      this.damage(scene, 1, null, true);
      return EscapeBehaviour.none;
    } else {
      return super.onCrossBorder(scene, side, fullOut);
    }
  }

  onDamage(scene: LevelScene, amount: number, source: DamageSource) {
    // Respawn on certain circumstances if not fatal
    if (!this.dead) {
      if (!source || source instanceof Terrain) {
        scene.onPlayerRespawn();
        if (!scene.playerFallenIntoWater && source instanceof Terrain && source.type === MapTerrainType.water) {
          scene.playerFallenIntoWater = true;
          scene.showSubtitle(STRINGS["fall-into-water"], 180);
        }
      }
    }
  }

  respawn(scene: LevelScene) {
    this.position = scene.spawnPoint.clone();
    this.immuneTicks = this.hurtImmuneTicks;
    this.facing = Facing.right;
    this.velocity.reset();
    this.impulseTicks = 0;
    this.outOfControlTicks = 30;
  }

  die(scene: LevelScene, source: DamageSource) {
    super.die(scene, source);
    scene.gameOver();
  }

  render(rctx: RendererContext) {
    rctx.run(({ ctx, pixelSize, debug }) => {
      // blink when hurt
      if (this.immuneTicks % 10 >= 5)
        ctx.globalAlpha = 0.25;
      super.render(rctx);
    });
  }
}