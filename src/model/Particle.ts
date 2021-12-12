import { AABB, Coord } from "../base/math";
import { TextureLike, textureManager } from "../render/TextureManager";
import Sprite, { RenderInfo } from "./Sprite";

export enum ParticleVariant {

}

interface ParticleVariantMeta {
  texture: string;
  box: [number, number, number, number];
}

const VARIANTS = new Map<ParticleVariant, ParticleVariantMeta>([
]);

export default class Particle extends Sprite {
  variantMeta: ParticleVariantMeta;
  texture: TextureLike;

  constructor(position: Coord, public variant: ParticleVariant) {
    super(position);

    const meta = VARIANTS.get(variant);
    if (!meta)
      throw new Error(`no such particle: ${variant}`);

    this.variantMeta = meta;
    this.texture = textureManager.get(meta.texture);
  }

  getRenderInfo() {
    return {
      box: this.position.expand(...this.variantMeta.box),
      texture: this.texture
    };
  }
}
