import { AABB, Coord } from "../base";
import { Drawable, RendererContext } from "../render/Renderer";
import { TextureLike } from "../render/TextureManager";

export interface RenderInfo {
  /** The bounding box of texture relative to the position */
  box: AABB;
  /** Whether texture and box should be flipped horizontally */
  flipped?: boolean;
  /** The Texture or TextureClip to render */
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
   * 
   * Derived classes should implement this method.
   * 
   * Note that `box` field accepts integer coordinates only,
   * and that it should contain absolute coordinates.
   */
  abstract getRenderInfo(): RenderInfo | null;

  render(rctx: RendererContext) {
    if (this.visible) {
      const info = this.getRenderInfo();
      if (info) {
        const { box, flipped = false, texture } = info;
        if (!Number.isInteger(box.left) || !Number.isInteger(box.top))
          throw new Error(`render area should have integer coordinates: got (${box.left},${box.top})`);
        if (box.width !== texture.width || box.height !== texture.height)
          throw new Error(`texture size does not match: expected ${box.width}x${box.height}, actual ${texture.width}x${texture.height}`);
        texture.drawTo(rctx, flipped ? box.right : box.left, box.top, flipped);
      }
    }
  }
}