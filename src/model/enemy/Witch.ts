import { AABB, Coord, Vector } from "../../base/math";
import Mob, { DamageSource } from "../Mob";
import imgWitch from "../../assets/entity/witch.png";
import imgWitchCurse from "../../assets/entity/witch-curse.png";
import imgWitchSummon from "../../assets/entity/witch-summon.png";
import { Texture, textureManager } from "../../render/TextureManager";
import { MapEntity, MapEntityType } from "../../map/interfaces";
import LevelScene from "../../scene/LevelScene";
import StateMachine from "../StateMachine";
import { FrameSequence } from "../../render/Animation";
import { RendererContext } from "../../render/Renderer";
import EnemyScout from "./Scout";

let textureWitch: Texture;
let textureWitchCurse: Texture;
let textureWitchSummon: Texture;

textureManager.loadTextures([
  ["entity/witch", imgWitch],
  ["entity/witch-curse", imgWitchCurse],
  ["entity/witch-summon", imgWitchSummon],
]).then(textures => {
  [textureWitch, textureWitchCurse, textureWitchSummon] = textures;
  textureWitch.defineClips([
    ["0"]
  ], 16, 20);
  textureWitchCurse.defineClips([
    ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
  ], 16, 20);
  textureWitchSummon.defineClips([
    ["0", "1", "2", "3", "4", "5", "6", "7"]
  ], 16, 20);
});

const
  CURSE_MAX_RANGE = 128,
  CURSE_PREPARE_TICKS = 180,
  CURSE_DAMAGE_TICKS = 120,
  CURSE_DAMAGE = 1,
  CURSE_IMPULSE_POWER = 2.5,
  CURSE_IMPULSE_TICKS = 2,
  SUMMON_PREPARE_TICKS = 160,
  CURSE_COOLDOWN_TICKS = 180,
  SUMMON_COOLDOWN_TICKS = 240,
  TELEPORT_COOLDOWN_TICKS = 300,
  INITIAL_COOLDOWN_TICKS = 120;

enum State {
  idle = 0,
  cursing = 1,
  summoning = 2
}

export default class EnemyWitch extends Mob {
  state = new StateMachine<State>([
    [State.idle, {
      next: State.idle,
      animation: FrameSequence.fromClips("entity/witch", ["0"])
    }],
    [State.cursing, {
      next: State.idle,
      animation: FrameSequence.fromClipRanges("entity/witch-curse", [
        ["0", 18],
        ["1", 18],
        ["2", 18],
        ["3", 18],
        ["4", 18],
        ["5", 18],
        ["6", 18],
        ["7", 18],
        ["8", 18],
        ["9", 18],
        ["9", CURSE_DAMAGE_TICKS],
      ])
    }],
    [State.summoning, {
      next: State.idle,
      animation: FrameSequence.fromClipRanges("entity/witch-summon", [
        ["0", 20],
        ["1", 20],
        ["2", 20],
        ["3", 20],
        ["4", 20],
        ["5", 20],
        ["6", 20],
        ["7", 20],
      ])
    }],
  ], State.idle);

  curseTicks = 0;
  summonTicks = 0;
  cooldownTicks = INITIAL_COOLDOWN_TICKS;

  curseTarget: Coord | null = null;

  constructor(data: MapEntity) {
    super(data, { maxHealth: 20 });
  }

  get collisionBoxR() {
    return new AABB(-12, -20, 4, 0);
  }

  getRenderInfoR() {
    return {
      box: new AABB(-12, -20, 4, 0),
      texture: this.state.animation.current()
    };
  }

  tick(scene: LevelScene) {
    const { player } = scene;
    const center = this.collisionBox.center;
    const vector = player.collisionBox.center.diff(center);
    const distance = vector.length;

    this.applyFriction(this.onGround ? 0.75 : 0.25);

    switch (this.state.current) {
      case State.idle: {
        if (this.cooldownTicks > 0) {
          this.cooldownTicks--;
        } else {
          let seed = Math.random() * 100;
          if (seed < 8) {
            if (distance < 0.9 * CURSE_MAX_RANGE) {
              this.state.set(State.cursing);
            }
          } else if (seed < 16) {
            this.state.set(State.summoning);
          } else if (seed < 24) {
            this.teleport(scene);
            this.cooldownTicks = TELEPORT_COOLDOWN_TICKS;
          }
        }
        break;
      }

      case State.cursing: {
        if (distance > CURSE_MAX_RANGE) {
          this.abort();
        } else {
          this.curseTarget = player.collisionBox.center;
          if (this.curseTicks < CURSE_PREPARE_TICKS) {
            // Preparing Curse
            this.state.set(State.cursing, this.curseTicks);
          } else {
            // Cursing
            let cursePeriodTicks = (this.curseTicks - CURSE_PREPARE_TICKS) % CURSE_DAMAGE_TICKS;

            if (cursePeriodTicks === 0) {
              if (player.damage(scene, CURSE_DAMAGE, this)) {
                let impulse = vector.scale(CURSE_IMPULSE_POWER / vector.length);
                player.setImpulse(impulse.x, impulse.y, CURSE_IMPULSE_TICKS);
              }
            }

            this.state.set(State.cursing, CURSE_PREPARE_TICKS + cursePeriodTicks);
          }
          this.curseTicks++;
        }
        break;
      }

      case State.summoning: {
        if (this.summonTicks >= SUMMON_PREPARE_TICKS) {
          let offsets = [new Vector(40, 0), new Vector(-40, 0)];
          if (Math.random() < 0.5) offsets.reverse();

          if (offsets.some(x => this.summon(scene, player.position.plus(x)))) {
            this.abort();
          }
        } else {
          this.state.set(State.summoning, this.summonTicks);
          this.summonTicks++;
        }
        break;
      }
    }

    super.tick(scene);
  }

  teleport(scene: LevelScene) {
    const choices = scene.getLandmarksWithTag("tp");
    if (!choices.length) {
      console.warn("failed to teleport");
      return;
    }
    const { box } = choices[Math.floor(Math.random() * choices.length)];

    this.position.x = box.left + Math.random() * (box.right - box.left);
    this.position.y = box.bottom;
  }

  summon(scene: LevelScene, position: Coord): boolean {
    const mob = new EnemyScout({
      x: position.x, y: position.y,
      tags: [],
      type: MapEntityType.scout
    });
    const { collisionBox } = mob;

    // TODO: Landmark limit scope

    const box = scene.fitTerrain(mob.collisionBox);

    for (let y = box.top; y < box.bottom; y++) {
      for (let x = box.left; x < box.right; x++) {
        if (scene.terrains[y][x]?.collisionBox?.intersects(collisionBox))
          return false;
      }
    }

    scene.addEntity(mob);
    return true;
  }

  abort() {
    switch (this.state.current) {
      case State.cursing:
        this.curseTicks = 0;
        this.cooldownTicks = CURSE_COOLDOWN_TICKS;
        this.state.set(State.idle);
        this.curseTarget = null;
        break;
      case State.summoning:
        this.summonTicks = 0;
        this.cooldownTicks = SUMMON_COOLDOWN_TICKS;
        this.state.set(State.idle);
        break;
    }
  }

  onDamage(scene: LevelScene, amount: number, source: DamageSource) {
    if (this.state.current !== State.idle)
      this.abort();
  }

  render(rctx: RendererContext) {
    super.render(rctx);
    if (this.state.current === State.cursing && this.curseTarget) {
      const center = this.collisionBox.center;

      rctx.run(({ ctx }) => {
        if (this.curseTicks < CURSE_PREPARE_TICKS) {
          let total = 8;
          let solid = total * (1 - Math.cos(this.curseTicks / CURSE_PREPARE_TICKS * Math.PI)) / 2;
          ctx.setLineDash([solid, total - solid]);
          ctx.lineDashOffset = solid / 2;
        }
        ctx.strokeStyle = `hsl(${this.curseTicks / CURSE_PREPARE_TICKS * 360}, 100%, 50%)`;
        ctx.lineWidth = 0.9 + 0.3 * Math.sin(this.curseTicks / 60 * Math.PI);

        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(this.curseTarget!.x, this.curseTarget!.y);
        ctx.stroke();
      });

      rctx.run(({ ctx }) => {
        if (this.curseTicks >= CURSE_PREPARE_TICKS) {
          ctx.strokeStyle = '#f3f';
          ctx.lineWidth = 0.8 + 0.2 * Math.sin(this.curseTicks / 60 * Math.PI);
          ctx.fillStyle = 'rgba(255, 0, 255, 0.1)';

          ctx.beginPath();
          ctx.arc(center.x, center.y, CURSE_MAX_RANGE, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.fill();
        }
      });
    }
  }
}