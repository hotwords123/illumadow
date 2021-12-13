import { AABB, Coord, Facing } from "../../base/math";
import imgScout from "../../assets/entity/scout.png";
import { Texture, textureManager } from "../../render/TextureManager";
import LevelScene from "../../scene/LevelScene";
import { MapEntity } from "../../map/interfaces";
import PlatformWalkGoal from "../../ai/PlatformWalkGoal";
import Mob, { DamageSource } from "../Mob";
import StateMachine from "../StateMachine";
import { FrameSequence } from "../../render/Animation";
import { ItemFlower } from "../Item";

let textureScout: Texture;

textureManager.loadTexture("entity/scout", imgScout).then(texture => {
  textureScout = texture;
  textureScout.defineClips([
    ["0", "1", "2", "3"]
  ], 8, 10);
});

const WALK_SPEED = 0.75;

enum State {
  idle = 0,
  stabbing = 1,
  stabbed = 2
}

export default class EnemyScout extends Mob {
  stabbingTicks = 0;

  attackCooldown = 0;
  attackSpeed = 40;
  attackDamage = 1;

  platformWalkGoal = new PlatformWalkGoal(this);

  state = new StateMachine<State>([
    [State.idle,
      {
        next: State.idle,
        animation: FrameSequence.fromClipRanges("entity/scout", [
          ["0", 1]
        ])
      }
    ],
    [State.stabbing,
      {
        next: State.stabbed,
        animation: FrameSequence.fromClipRanges("entity/scout", [
          ["0", 1],
          ["1", 4],
        ])
      }
    ],
    [State.stabbed,
      {
        next: State.idle,
        animation: FrameSequence.fromClipRanges("entity/scout", [
          ["2", 5],
          ["3", 5],
        ])
      }
    ],
  ], State.idle);

  constructor(data: MapEntity) {
    super(data, { maxHealth: 3 });
  }

  get collisionBoxR() {
    return new AABB(-4, -10, 4, 0);
  }

  get attackBox() {
    return this.boxByFacing(new AABB(-2, -12, 10, 0));
  }

  getRenderInfoR() {
    return {
      box: new AABB(-4, -10, 4, 0),
      texture: this.state.animation.current()
    };
  }

  tick(scene: LevelScene) {
    const { player } = scene;

    this.applyFriction(this.onGround ? 0.75 : 0.25);

    this.platformWalkGoal.keepDistance(scene, player, this.onGround ? 1 : 0.25, WALK_SPEED, 8, 10);

    if (this.attackCooldown > 0) {
      this.attackCooldown--;
    } else {
      const playerInTouch = this.attackBox.intersects(scene.player.hurtBox);

      if (playerInTouch) {
        this.stabbingTicks++;
        if (this.stabbingTicks > 5)
          this.stabbingTicks = 5;
        if (this.state.current === State.idle)
          this.state.set(State.stabbing);
      } else if (this.state.current === State.stabbing) {
        this.stabbingTicks = Math.max(0, this.stabbingTicks - 2);
        if (this.stabbingTicks > 0)
          this.state.set(State.stabbing, this.stabbingTicks - 1);
        else
          this.state.set(State.idle);
      }

      if (playerInTouch && this.stabbingTicks >= 5) {
        if (player.damage(scene, this.attackDamage, this)) {
          player.knockback(this.position, this.facing, 2.5);
          this.attackCooldown = this.attackSpeed;
          this.stabbingTicks = 0;
          this.state.set(State.stabbed);
        } else {
          this.state.set(State.stabbing, 9);
        }
      }
    }

    this.state.next();

    super.tick(scene);
  }

  die(scene: LevelScene, source: DamageSource) {
    if (this.tags.includes("witch-summon")) {
      ItemFlower.trySpawnAt(scene, this.collisionBox.center, 0.6, 0.2);
    }
    super.die(scene, source);
  }
}