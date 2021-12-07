import { AABB, Coord } from "../base";
import { MapDecoration, TERRAIN_SIZE } from "../map/interfaces";
import Model from "./Model";
import imgTree from "../assets/decoration/tree.png";
import { Texture, TextureLike, textureManager } from "../render/TextureManager";
import { RenderInfo } from "./Sprite";

let textureTree: Texture;

textureManager.loadTextures([
  ["decoration/tree", imgTree]
]).then(textures => {
  [textureTree] = textures;
  textureTree.defineClips([
    ["branch-end-l", "branch", "trunk-branch-l", "trunk", "trunk-branch-r", "branch-end-r"]
  ], TERRAIN_SIZE, TERRAIN_SIZE);
});

interface DecorationVariant {
  texture: string;
  box: [number, number, number, number];
}

const VARIANTS = new Map<string, DecorationVariant>([
  ["trunk", { texture: "tree:trunk", box: [4, 4, 4, 4] }],
  ["trunk-branch-l", { texture: "tree:trunk-branch-l", box: [4, 4, 4, 4] }],
  ["trunk-branch-r", { texture: "tree:trunk-branch-r", box: [4, 4, 4, 4] }],
  ["branch", { texture: "tree:branch", box: [4, 4, 4, 4] }],
  ["branch-end-l", { texture: "tree:branch-end-l", box: [4, 4, 4, 4] }],
  ["branch-end-r", { texture: "tree:branch-end-r", box: [4, 4, 4, 4] }],
]);

export default class Decoration extends Model {
  variant: string;
  variantMeta: DecorationVariant | null = null;
  texture: TextureLike | null = null;

  constructor({ variant, ...data }: MapDecoration) {
    super(data);

    this.variant = variant;
    this.variantMeta = VARIANTS.get(variant) ?? null;
    if (this.variantMeta) {
      this.texture = textureManager.get("decoration/" + this.variantMeta.texture);
      if (!this.texture)
        console.warn(`texture not found: ${this.variantMeta.texture}`)
    } else {
      console.warn(`unknown decoration variant: ${variant}`);
    }
  }

  getRenderInfo() {
    return this.texture && {
      texture: this.texture,
      box: this.position.expand(...this.variantMeta!.box)
    };
  }
}
