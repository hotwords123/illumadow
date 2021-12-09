import { AABB, Facing } from "../base";
import { Texture, textureManager } from "../render/TextureManager";
import Entity, { EntityWithFacing } from "./Entity";
import imgPlayer from "../assets/entity/player.png";
import LevelScene from "../scene/LevelScene";
import { MapEntityPlayer } from "../map/interfaces";

let texturePlayer: Texture;

const
  MAX_GROUND_SPEED = 1.5,
  MAX_AIR_SPEED = 1.25,
  GROUND_ACCELERATION = 1,
  AIR_ACCELERATION = 0.5,
  GROUND_FRICTION = 0.6,
  AIR_FRICTION = 0.2,
  JUMP_SPEED_X = 2.75,
  JUMP_SPEED_Y_SIDE = 3,
  JUMP_SPEED_Y_UP = 3.5;

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

  /** tick index when jump key was pressed */
  jumpedAt = -1;

  constructor({ health, maxHealth, ...data }: MapEntityPlayer) {
    super(data, { health, maxHealth });
  }

  get collisionBoxR() {
    return this.position.expand(4, 8, 4, 0);
  }

  get hurtImmuneTicks() { return 60; }

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
    }
  }

  tick(scene: LevelScene) {
    if (this.dead) return;

    const movement = this.getMovement(scene);
    if (movement !== 0)
      this.facing = movement > 0 ? Facing.right : Facing.left;

    const
      maxSpeed = this.onGround ? MAX_GROUND_SPEED : MAX_AIR_SPEED,
      acceleration = this.onGround ? GROUND_ACCELERATION : AIR_ACCELERATION,
      friction = this.onGround ? GROUND_FRICTION : AIR_FRICTION;

    const { velocity } = this;

    if (velocity.x > 0)
      velocity.x = Math.max(0, velocity.x - friction);
    if (velocity.x < 0)
      velocity.x = Math.min(0, velocity.x + friction);

    if (movement > 0 && velocity.x < maxSpeed)
      velocity.x = Math.min(maxSpeed, velocity.x + acceleration);
    if (movement < 0 && velocity.x > -maxSpeed)
      velocity.x = Math.max(-maxSpeed, velocity.x - acceleration);

    if (this.airTicks <= 3 && this.jumpedAt === scene.ticks) {
      velocity.y = movement === 0 ? -JUMP_SPEED_Y_UP : -JUMP_SPEED_Y_SIDE;
      if (movement > 0)
        velocity.x = JUMP_SPEED_X;
      if (movement < 0)
        velocity.x = -JUMP_SPEED_X;
    }

    super.tick(scene);
  }
}