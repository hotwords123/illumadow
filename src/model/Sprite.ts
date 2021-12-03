import { AABB, Coord } from "../base";
import { Drawable, RendererContext } from "../render/Renderer";
import { TextureClip } from "../render/TextureManager";

/**
 * 精灵：矩形贴图
 */
export default abstract class Sprite implements Drawable {
  visible: boolean = true;

  constructor(public position: Coord) {}

  get x() { return this.position.x; }
  get y() { return this.position.y; }
  set x(value: number) { this.position.x = value; }
  set y(value: number) { this.position.y = value; }

  abstract get texture(): TextureClip | null;

  render(rctx: RendererContext) {
    if (this.visible) {
      const texture = this.texture;
      if (texture) {
        //
      }
    }
  }
}