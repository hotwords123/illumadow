import { AABB, Coord } from "../base";
import { Drawable, RendererContext } from "../render/Renderer";
import { TextureLike } from "../render/TextureManager";

export interface RenderInfo {
  box: AABB;
  texture: TextureLike;
}

/**
 * Sprite:
 * - elements in scene
 * - rendered with rectangular texture
 */
export default abstract class Sprite implements Drawable {
  visible: boolean = true;

  constructor(public position: Coord) {}

  get x() { return this.position.x; }
  get y() { return this.position.y; }
  set x(value: number) { this.position.x = value; }
  set y(value: number) { this.position.y = value; }

  /**
   * Returns necessary information for rendering.
   * Coordinates will be automatically rounded to integers.
   * Derived classes should implement this method.
   */
  getRenderInfo(): RenderInfo | null {
    return null;
  }

  render(rctx: RendererContext) {
    if (this.visible) {
      const info = this.getRenderInfo();
      if (info) {
        info.texture.drawTo(rctx, Math.round(info.box.left), Math.round(info.box.top));
      }
    }
  }
}