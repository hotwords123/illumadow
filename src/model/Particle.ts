import { AABB, Coord, Facing, Vector } from "../base/math";
import { FrameSequence } from "../render/Animation";
import { Texture, TextureLike, textureManager } from "../render/TextureManager";
import LevelScene from "../scene/LevelScene";
import Sprite, { RenderInfo } from "./Sprite";
import imgMeleeWave from "../assets/entity/melee-wave.png";
import imgDeathBurst from "../assets/entity/death-burst.png";

let textureMeleeWave: Texture;
let textureDeathBurst: Texture;

textureManager.loadTextures([
  ["entity/melee-wave", imgMeleeWave],
  ["entity/death-burst", imgDeathBurst],
]).then(textures => {
  [textureMeleeWave, textureDeathBurst] = textures;
  textureMeleeWave.defineClips([
    ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]
  ], 24, 12);
  textureDeathBurst.defineClips([
    ["0", "1", "2", "3", "4", "5", "6", "7"]
  ], 16, 12);
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
    return new AABB(0, -12, 24, 0);
  }
}

export class DeathBurst extends Particle {
  constructor(position: Coord) {
    super(position);

    this.animation = FrameSequence.fromClips("entity/death-burst",
      ["0", "1", "2", "3", "4", "5", "6", "7"]);
  }

  get renderBoxR() {
    return new AABB(-8, -6, 8, 6);
  }
}
