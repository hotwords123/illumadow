import { AABB, Coord, Facing, Vector } from "../base/math";
import { FrameSequence } from "../render/Animation";
import { Texture, TextureLike, textureManager } from "../render/TextureManager";
import LevelScene from "../scene/LevelScene";
import Sprite, { RenderInfo } from "./Sprite";
import imgMeleeWave from "../assets/entity/melee-wave.png";
import imgDiveAttackWave from "../assets/entity/dive-attack-wave.png";
import imgDiveSideAttackWave from "../assets/entity/dive-side-attack-wave.png";
import imgDamageBurst from "../assets/entity/damage-burst.png";
import imgWitchTeleport from "../assets/entity/witch-teleport.png";

let textureMeleeWave: Texture;
let textureDiveAttack: Texture;
let textureDiveSideAttack: Texture;
let textureDamageBurst: Texture;
let textureWitchTeleport: Texture;

textureManager.loadTextures([
  ["entity/melee-wave", imgMeleeWave],
  ["entity/dive-attack-wave", imgDiveAttackWave],
  ["entity/dive-side-attack-wave", imgDiveSideAttackWave],
  ["entity/damage-burst", imgDamageBurst],
  ["entity/witch-teleport", imgWitchTeleport],
]).then(textures => {
  [textureMeleeWave, textureDiveAttack, textureDiveSideAttack, textureDamageBurst, textureWitchTeleport] = textures;
  textureMeleeWave.defineClips([
    ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]
  ], 24, 12);
  textureDiveAttack.defineClips([
    ["0", "1", "2", "3", "4", "5", "6", "7"]
  ], 12, 16);
  textureDiveSideAttack.defineClips([
    ["0", "1", "2", "3", "4", "5", "6", "7"]
  ], 12, 16);
  textureDamageBurst.defineClips([
    ["0", "1", "2", "3", "4", "5", "6", "7"]
  ], 16, 12);
  textureWitchTeleport.defineClips([
    ["0", "1", "2", "3", "4"]
  ], 20, 20);
});

export default abstract class Particle extends Sprite {
  velocity = new Vector(0, 0);
  facing = Facing.right;
  animation!: FrameSequence;

  getRenderInfo() {
    const box = this.renderBoxR;
    if (!box) return null;
    const flipped = this.facing === Facing.left;
    return {
      box: (flipped ? box.flipX(0) : box).offset(this.position.round()),
      flipped,
      texture: this.animation.current()
    };
  }

  /**
   * Returns information used for rendering, assuming particle is facing right.
   * Note that `box` should be **relative to** `this.position`.
   */
  abstract get renderBoxR(): AABB | null;

  tick(scene: LevelScene) {
    if (this.animation.next())
      this.destroy(scene);
    this.position.setPlus(this.velocity);
  }

  destroy(scene: LevelScene) {
    scene.deleteParticle(this);
  }
}

export class MeleeWave extends Particle {
  constructor(position: Coord, facing: Facing) {
    super(position);

    this.facing = facing;
    this.animation = FrameSequence.fromClips("entity/melee-wave",
      ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]);
  }

  get renderBoxR() {
    return new AABB(2, -12, 26, 0);
  }
}

export class DiveAttackWave extends Particle {
  constructor(position: Coord) {
    super(position);

    this.animation = FrameSequence.fromClips("entity/dive-attack-wave",
      ["0", "1", "2", "3", "4", "5", "6", "7"]);
  }

  get renderBoxR() {
    return new AABB(-6, 2, 6, 18);
  }
}

export class DiveSideAttackWave extends Particle {
  constructor(position: Coord, facing: Facing) {
    super(position);

    this.facing = facing;
    this.animation = FrameSequence.fromClips("entity/dive-side-attack-wave",
      ["0", "1", "2", "3", "4", "5", "6", "7"]);
  }

  get renderBoxR() {
    return new AABB(0, 2, 12, 18);
  }
}

export class DamageBurst extends Particle {
  constructor(position: Coord) {
    super(position);

    this.animation = FrameSequence.fromClips("entity/damage-burst",
      ["0", "1", "2", "3", "4", "5", "6", "7"]);
  }

  get renderBoxR() {
    return new AABB(-8, -6, 8, 6);
  }
}

export class WitchTeleport extends Particle {
  constructor(position: Coord) {
    super(position);

    this.animation = FrameSequence.fromClipRanges("entity/witch-teleport", [
      ["0", 2],
      ["1", 2],
      ["2", 2],
      ["3", 2],
      ["4", 2],
      ["3", 2],
      ["2", 2],
      ["1", 2],
      ["0", 2],
    ]);
  }

  get renderBoxR() {
    return new AABB(-10, -10, 10, 10);
  }
}
