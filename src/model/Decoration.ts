import { AABB, Coord } from "../base/math";
import { MapDecoration, TERRAIN_SIZE } from "../map/interfaces";
import Model from "./Model";
import imgTree from "../assets/decoration/tree.png";
import imgBrickWall from "../assets/decoration/brick-wall.png";
import imgBrickWallLight from "../assets/decoration/brick-wall-light.png";
import { Texture, TextureLike, textureManager } from "../render/TextureManager";
import { RenderInfo } from "./Sprite";

export let textureTree: Texture;

textureManager.loadTextures([
  ["decoration/tree", imgTree],
  ["decoration/brick-wall", imgBrickWall],
  ["decoration/brick-wall-light", imgBrickWallLight],
]).then(textures => {
  [textureTree] = textures;
  textureTree.defineClips([
    ["branch-end-l", "branch", "trunk-branch-l", "trunk", "trunk-branch-r", "branch-end-r", "platform", "platform-fragile"]
  ], TERRAIN_SIZE, TERRAIN_SIZE);
});

interface DecorationVariantMeta {
  texture: string;
  box: [number, number, number, number];
}

const VARIANTS = new Map<string, DecorationVariantMeta>([
  ["trunk", { texture: "decoration/tree:trunk", box: [4, 4, 4, 4] }],
  ["trunk-branch-l", { texture: "decoration/tree:trunk-branch-l", box: [4, 4, 4, 4] }],
  ["trunk-branch-r", { texture: "decoration/tree:trunk-branch-r", box: [4, 4, 4, 4] }],
  ["branch", { texture: "decoration/tree:branch", box: [4, 4, 4, 4] }],
  ["branch-end-l", { texture: "decoration/tree:branch-end-l", box: [4, 4, 4, 4] }],
  ["branch-end-r", { texture: "decoration/tree:branch-end-r", box: [4, 4, 4, 4] }],
  ["brick-wall", { texture: "decoration/brick-wall", box: [4, 4, 4, 4] }],
  ["brick-wall-light", { texture: "decoration/brick-wall-light", box: [4, 4, 4, 4] }],
]);

export default class Decoration extends Model {
  variant: string;
  variantMeta: DecorationVariantMeta | null = null;
  texture: TextureLike | null = null;

  constructor({ variant, ...data }: MapDecoration) {
    super(data);

    this.variant = variant;
    this.variantMeta = VARIANTS.get(variant) ?? null;
    if (this.variantMeta) {
      this.texture = textureManager.get(this.variantMeta.texture);
      if (!this.texture)
        console.warn(`texture not found: ${this.variantMeta.texture}`)
    } else {
      console.warn(`unknown decoration variant: ${variant}`);
    }
  }

  getRenderInfo() {
    return this.texture && {
      texture: this.texture,
      box: this.position.round().expand(...this.variantMeta!.box)
    };
  }
}
