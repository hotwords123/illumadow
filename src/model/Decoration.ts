import { AABB, Coord } from "../base/math";
import { MapDecoration, MapDecorationSign, TERRAIN_SIZE } from "../map/interfaces";
import Model from "./Model";
import imgTree from "../assets/decoration/tree.png";
import imgBrickWall from "../assets/decoration/brick-wall.png";
import imgBrickWallLight from "../assets/decoration/brick-wall-light.png";
import imgSign from "../assets/decoration/sign.png";
import { Texture, TextureLike, textureManager } from "../render/TextureManager";
import { RenderInfo } from "./Sprite";
import { RendererContext } from "../render/Renderer";

export let textureTree: Texture;

textureManager.loadTextures([
  ["decoration/tree", imgTree],
  ["decoration/brick-wall", imgBrickWall],
  ["decoration/brick-wall-light", imgBrickWallLight],
  ["decoration/sign", imgSign],
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
  ["sign", { texture: "decoration/sign", box: [16, 24, 16, 0] }],
]);

export default class Decoration extends Model {
  variant: string;
  variantMeta: DecorationVariantMeta | null = null;
  texture: TextureLike | null = null;

  constructor(public data: MapDecoration) {
    super(data);

    this.variant = data.variant;
    this.variantMeta = VARIANTS.get(this.variant) ?? null;
    if (this.variantMeta) {
      this.texture = textureManager.get(this.variantMeta.texture);
      if (!this.texture)
        console.warn(`texture not found: ${this.variantMeta.texture}`)
    } else {
      console.warn(`unknown decoration variant: ${this.variant}`);
    }
  }

  get renderBox() {
    return this.position.round().expand(...this.variantMeta!.box);
  }

  getRenderInfo() {
    return this.texture && {
      texture: this.texture,
      box: this.renderBox
    };
  }

  render(rctx: RendererContext) {
    super.render(rctx);
    if (this.variant === "sign") {
      rctx.run(({ ctx }) => {
        ctx.font = "4.4px 'Noto Sans SC'"; 
        ctx.fillStyle = '#f7f7f7';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 2;

        const lines = (this.data as MapDecorationSign).text.split('\n');
        const box = this.renderBox;
        let lineHeight = 5.7;
        let y = box.top + 10.5 - lines.length / 2 * lineHeight;

        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], box.center.x, y + i * lineHeight);
        }
      });
    }
  }
}
