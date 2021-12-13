import { AABB, Coord, Facing, Vector } from "../../base/math";
import Mob, { DamageSource } from "../Mob";
import imgWitch from "../../assets/entity/witch.png";
import imgWitchCurse from "../../assets/entity/witch-curse.png";
import imgWitchSummon from "../../assets/entity/witch-summon.png";
import { Texture, textureManager } from "../../render/TextureManager";
import { MapEntity, MapEntityArcher, MapEntityScout, MapEntityType } from "../../map/interfaces";
import LevelScene from "../../scene/LevelScene";
import StateMachine from "../StateMachine";
import { FrameSequence } from "../../render/Animation";
import { RendererContext } from "../../render/Renderer";
import EnemyScout from "./Scout";
import { WitchTeleport } from "../Particle";
import EnemyArcher from "./Archer";
import { Terrain } from "../Terrain";
import { STRINGS } from "../../scene/Subtitle";

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
  CURSE_IMPULSE_POWER = 4,
  CURSE_IMPULSE_TICKS = 3,
  CURSE_COOLDOWN_TICKS = 90,
  SUMMON_PREPARE_TICKS = 120,
  SUMMON_COOLDOWN_TICKS = 90,
  TELEPORT_COOLDOWN_TICKS = 120,
  INITIAL_COOLDOWN_TICKS = 120,
  MIN_SUMMON_DISTANCE = 48,
  MAX_SUMMON_DISTANCE = 96,
  MIN_TELEPORT_DISTANCE = 56,
  MIN_TELEPORT_LENGTH = 80,
  MAX_TELEPORT_LENGTH = 280,
  DAMAGE_REBOUNCE_POWER = 2.5,
  DAMAGE_REBOUNCE_TICKS = 3;

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
        ["0", 15],
        ["1", 15],
        ["2", 15],
        ["3", 15],
        ["4", 15],
        ["5", 15],
        ["6", 15],
        ["7", 15],
      ])
    }],
  ], State.idle);

  curseTicks = 0;
  summonTicks = 0;
  cooldownTicks = INITIAL_COOLDOWN_TICKS;
  damageCount = 0;

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
          if (seed < 15) {
            if (distance < 0.9 * CURSE_MAX_RANGE) {
              this.state.set(State.cursing);
            }
          } else if (seed < 23) {
            if (scene.getEntitiesWithTag("witch-summon").length < 18)
              this.state.set(State.summoning);
          } else if (seed < 25) {
            this.teleport(scene);
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
                player.knockback(player.position, player.x > this.x ? Facing.right : Facing.left,
                  CURSE_IMPULSE_POWER, CURSE_IMPULSE_TICKS);
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
          let types = [MapEntityType.scout, MapEntityType.archer];
          if (scene.getEntitiesWithTag("witch-summon").length >= 10)
            types.splice(Math.floor(Math.random() * 2), 1);

          let results = types.map(x => this.summon(scene, x));
          if (results.some(x => x)) {
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

  teleport(scene: LevelScene): boolean {
    const choices = scene.getLandmarksWithTag("tp");
    if (!choices.length) {
      console.warn("failed to teleport");
      return false;
    }

    for (let i = 0; i < 20; i++) {
      const { box } = choices[Math.floor(Math.random() * choices.length)];
      let newPos = new Coord(
        box.left + Math.random() * (box.right - box.left),
        box.bottom
      );

      let length = newPos.diff(this.position).length;
      if (length < MIN_TELEPORT_LENGTH || length > MAX_TELEPORT_LENGTH)
        continue;

      if (newPos.diff(scene.player.position).length < MIN_TELEPORT_DISTANCE)
        continue;

      scene.addParticle(new WitchTeleport(this.collisionBox.center));
      this.position.set(newPos);
      scene.addParticle(new WitchTeleport(this.collisionBox.center));

      this.cooldownTicks = TELEPORT_COOLDOWN_TICKS;
      scene.onTickEnd(() => {
        this.velocity.reset();
        this.impulseTicks = 0;
      });
      return true;
    }

    return false;
  }

  summon(scene: LevelScene, type: MapEntityType): boolean {
    const choices = scene.getLandmarksWithTag("summon");
    if (!choices.length) {
      console.warn("failed to summon");
      return false;
    }

    for (let i = 0; i < 20; i++) {
      const { box } = choices[Math.floor(Math.random() * choices.length)];

      let data: MapEntityScout | MapEntityArcher = {
        x: box.left + Math.random() * (box.right - box.left),
        y: box.bottom,
        tags: ["witch-summon", "enemy"],
        type,
        skeleton: Math.random() < 0.5
      };
      let mob = scene.createEntity(data)!;

      // Should not be too close to player
      let distance = mob.position.diff(scene.player.position).length;
      if (distance < MIN_SUMMON_DISTANCE || distance > MAX_SUMMON_DISTANCE)
        continue;

      if (data.skeleton && !scene.skeletonSummoned) {
        scene.skeletonSummoned = true;
        scene.showSubtitle(STRINGS["level2-start"], 180);
      }
  
      scene.addEntity(mob);
  
      return true;
    }

    return false;
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
    this.damageCount++;

    const { player } = scene;

    if (source === player) {
      player.knockback(player.position, player.x > this.x ? Facing.right : Facing.left,
        DAMAGE_REBOUNCE_POWER, DAMAGE_REBOUNCE_TICKS);
    }

    let seed = Math.random();
    if (source instanceof Terrain || seed < Math.pow(0.6, 6 - this.damageCount)) {
      if (this.teleport(scene)) {
        this.damageCount = 0;
        if (this.state.current !== State.idle) {
          this.abort();
        }
      }
    }
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
        ctx.lineWidth = 0.9 - 0.3 * Math.cos(this.curseTicks / CURSE_DAMAGE_TICKS * 2 * Math.PI);

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

  die(scene: LevelScene, source: DamageSource) {
    scene.onBossDie(this);
    super.die(scene, source);
  }
}