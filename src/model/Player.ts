import { AABB, Coord, Vector } from "../base";
import { Texture, textureManager } from "../render/TextureManager";
import { RenderInfo } from "./Sprite";
import Entity from "./Entity";
import imgPlayer from "../assets/entity/player.png";
import { RendererContext } from "../render/Renderer";
import LevelScene from "../scene/LevelScene";

let texturePlayer: Texture;

const
  MAX_GROUND_SPEED = 1.5,
  MAX_AIR_SPEED = 1.25,
  GROUND_ACCELERATION = 1,
  AIR_ACCELERATION = 0.75,
  GROUND_FRICTION = 0.6,
  AIR_FRICTION = 0.3,
  JUMP_SPEED_X = 3,
  JUMP_SPEED_Y_SIDE = 3,
  JUMP_SPEED_Y_UP = 3.5;

textureManager.loadTexture(imgPlayer).then(texture => {
  texturePlayer = texture;
});

interface PlayerInit {
  health: number;
  maxHealth: number;
}

enum Posture {
  normal = 0,
  duck = 1
}

export default class Player extends Entity {
  airTick = 0;
  posture = Posture.normal;

  constructor(position: Coord, init: PlayerInit) {
    super(position, init);
  }

  get collisionBox() {
    return this.position.expand(3, 18, 3, 0);
  }

  getRenderInfo(): RenderInfo {
    return {
      box: this.position.expand(5, 20, 5, 0),
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

  tick(scene: LevelScene) {
    const movement = this.getMovement(scene);
    const
      maxSpeed = this.onGround ? MAX_GROUND_SPEED : MAX_AIR_SPEED,
      acceleration = this.onGround ? GROUND_ACCELERATION : AIR_ACCELERATION,
      friction = this.onGround ? GROUND_FRICTION : AIR_FRICTION;

    if (this.onGround)
      this.airTick = 0;
    else
      this.airTick++;

    const { velocity } = this;

    if (velocity.x > 0)
      velocity.x = Math.max(0, velocity.x - friction);
    if (velocity.x < 0)
      velocity.x = Math.min(0, velocity.x + friction);

    if (movement > 0 && velocity.x < maxSpeed)
      velocity.x = Math.min(maxSpeed, velocity.x + acceleration);
    if (movement < 0 && velocity.x > -maxSpeed)
      velocity.x = Math.max(-maxSpeed, velocity.x - acceleration);

    if (this.airTick <= 3 && scene.jumpPressed === scene.ticks) {
      velocity.y = movement === 0 ? -JUMP_SPEED_Y_UP : -JUMP_SPEED_Y_SIDE;
      if (movement > 0)
        velocity.x = JUMP_SPEED_X;
      if (movement < 0)
        velocity.x = -JUMP_SPEED_X;
    }

    super.tick(scene);
  }
}