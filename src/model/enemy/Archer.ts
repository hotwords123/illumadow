import { AABB, Facing } from "../../base/math";
import { MapEntityArcher } from "../../map/interfaces";
import imgArcher from "../../assets/entity/archer.png";
import imgSkeletonArcher from "../../assets/entity/skeleton-archer.png";
import { Texture, textureManager } from "../../render/TextureManager";
import LevelScene from "../../scene/LevelScene";
import PlatformWalkGoal from "../../ai/PlatformWalkGoal";
import Mob, { DamageSource } from "../Mob";
import Arrow from "../projectile/Arrow";
import { FrameSequence } from "../../render/Animation";
import StateMachine from "../StateMachine";
import { ItemFlower } from "../Item";

let textureArcher: Texture;
let textureSkeletonArcher: Texture;

textureManager.loadTextures([
  ["entity/archer", imgArcher],
  ["entity/skeleton-archer", imgSkeletonArcher],
]).then(textures => {
  [textureArcher, textureSkeletonArcher] = textures;
  textureArcher.defineClips([
    ["0", "1", "2", "3", "4", "5", "6", "7", "8"]
  ], 8, 10);
  textureSkeletonArcher.defineClips([
    ["0", "1", "2", "3", "4", "5", "6", "7", "8"]
  ], 8, 10);
});

enum State {
  idle = 0,
  drawing = 1,
  shot = 2
}

enum Variant {
  normal = 0,
  skeleton = 1
}

export default class EnemyArcher extends Mob {
  attackCooldown = 0;
  attackSpeed = 30;

  chargeTicks = 0;
  chargeSpeed = 120;

  platformWalkGoal = new PlatformWalkGoal(this);

  variant: Variant;

  state: StateMachine<State>;

  constructor(data: MapEntityArcher) {
    super(data, { maxHealth: 3 });

    this.variant = data.skeleton ? Variant.skeleton : Variant.normal;

    const texture = this.variant === Variant.normal ? "entity/archer" : "entity/skeleton-archer";

    this.state = new StateMachine<State>([
      [State.idle, {
        next: State.idle,
        animation: FrameSequence.fromClipRanges(texture, [
          ["0", 40],
          ["1", 20]
        ]).setLoop(true)
      }],
      [State.drawing, {
        next: State.idle,
        animation: FrameSequence.fromClipRanges(texture, [
          ["1", 10],
          ["2", 10],
          ["3", 90],
          ["4", 10]
        ])
      }],
      [State.shot, {
        next: State.idle,
        animation: FrameSequence.fromClipRanges(texture, [
          ["5", 6],
          ["3", 6],
          ["6", 6],
          ["7", 6],
          ["8", 6]
        ])
      }]
    ], State.idle);
  }

  get collisionBoxR() {
    return this.variant === Variant.normal ? new AABB(-5, -10, 3, 0) : new AABB(-3, -10, 3, 0);
  }

  getRenderInfoR() {
    return {
      box: this.variant === Variant.normal ? new AABB(-5, -10, 3, 0) : new AABB(-3, -10, 5, 0),
      texture: this.state.animation.current()
    }
  }

  tick(scene: LevelScene) {
    const { player } = scene;

    this.applyFriction(this.onGround ? 0.75 : 0.25);

    this.platformWalkGoal.keepDistance(scene, player, this.onGround ? 0.75 : 0.25, 0.6, 40, 80);

    if (this.attackCooldown > 0) {
      this.attackCooldown--;
    } else {
      const shootPos = this.coordByFacing2(4, -6);
      const playerBox = player.hurtBox;
      let deltaX = player.x - this.x;
      let playerInReach = Math.abs(deltaX) <= 160;
      let canShoot = playerBox.vertical.contains(shootPos.y);
      let shot = false;
  
      if (playerInReach) {
        this.chargeTicks++;
        if (this.chargeTicks >= this.chargeSpeed) {
          if (canShoot) {
            scene.addEntity(new Arrow(shootPos, this, 1, deltaX > 0 ? Facing.right : Facing.left));
            this.attackCooldown = this.attackSpeed;
            this.chargeTicks = 0;
            shot = true;
          } else {
            this.chargeTicks = this.chargeSpeed;
          }
        }
      } else {
        this.chargeTicks -= 2;
        if (this.chargeTicks < 0) this.chargeTicks = 0;
      }

      if (shot) {
        this.state.set(State.shot);
      } else if (this.chargeTicks > 0) {
        this.state.set(State.drawing, this.chargeTicks - 1);
      } else {
        this.state.set(State.idle);
      }
    }

    this.state.next();

    super.tick(scene);
  }

  die(scene: LevelScene, source: DamageSource) {
    if (this.tags.includes("witch-summon")) {
      ItemFlower.trySpawnAt(scene, this.collisionBox.center, 0.25, 0.45);
    }
    super.die(scene, source);
  }
}