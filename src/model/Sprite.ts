import { AABB, Coord } from "../base";
import { Drawable, RendererContext } from "../render/Renderer";
import { TextureLike } from "../render/TextureManager";

export interface RenderInfo {
  box: AABB;
  texture: TextureLike;
}

/**
 * 精灵：场景中的元素，渲染为矩形贴图
 */
export default abstract class Sprite implements Drawable {
  visible: boolean = true;

  constructor(public position: Coord) {}

  get x() { return this.position.x; }
  get y() { return this.position.y; }
  set x(value: number) { this.position.x = value; }
  set y(value: number) { this.position.y = value; }

  /**
   * 返回渲染所用的贴图与渲染位置。
   * 渲染坐标会被自动取整。
   */
  abstract getRenderInfo(): RenderInfo | null;

  render(rctx: RendererContext) {
    if (this.visible) {
      const info = this.getRenderInfo();
      if (info) {
        info.texture.drawTo(rctx, Math.round(info.box.left), Math.round(info.box.top));
      }
    }
  }
}