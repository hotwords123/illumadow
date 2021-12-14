import { AABB } from "../base/math";
import { RendererContext } from "./Renderer";

export type TextureLike = Texture | TextureClip;

class TextureManager {
  private tasks: Promise<Texture>[] = [];
  private textures = new Map<string, Texture>();

  loadTexture(name: string, path: string): Promise<Texture> {
    const promise = new Promise<Texture>((resolve, reject) => {
      const img = new Image();
      img.src = path;
      img.onload = () => {
        const texture = new Texture(img, name);
        this.textures.set(name, texture);
        resolve(texture);
      };
      img.onerror = ((evt: ErrorEvent) => reject(new Error(evt.message))) as any;
    });
    this.tasks.push(promise);
    return promise;
  }

  loadTextures(items: [name: string, path: string][]): Promise<Texture[]> {
    return Promise.all(items.map(([name, path]) => this.loadTexture(name, path)));
  }

  untilAllLoaded(): Promise<void> {
    return Promise.all(this.tasks).then(() => {});
  }

  get(name: string): TextureLike {
    const [textureName, clipName] = name.split(':');
    const texture = this.textures.get(textureName);
    if (!texture)
      throw new Error(`texture not found: "${name}"`);
    return clipName ? texture.getClip(clipName) : texture;
  }
}

export const textureManager = new TextureManager();

export class Texture {
  clips = new Map<string, TextureClip>();

  constructor(public img: HTMLImageElement, public name: string) {}

  get width() { return this.img.naturalWidth; }
  get height() { return this.img.naturalHeight; }

  clip(clipArea: AABB) {
    return new TextureClip(this.img, clipArea);
  }

  defineClip(name: string, left: number, top: number, width: number, height: number) {
    this.clips.set(name, this.clip(AABB.offset(left, top, width, height)));
    return this;
  }

  defineClips(names: (string | null)[][], width: number, height: number, offsetX: number = 0, offsetY: number = 0) {
    names.forEach((row, y) => row.forEach((name, x) => {
      if (name !== null) {
        this.defineClip(name, offsetX + width * x, offsetY + height * y, width, height);
      }
    }));
  }

  getClip(name: string): TextureClip {
    const clip = this.clips.get(name);
    if (!clip)
      throw new Error(`texture clip not found: "${name}:${clip}"`);
    return clip;
  }

  drawTo(rctx: RendererContext, x: number, y: number, flipped = false) {
    rctx.run(({ ctx }) => {
      ctx.translate(x, y);
      if (flipped) ctx.scale(-1, 1);
      ctx.drawImage(this.img, 0, 0);
    });
  }
}

export class TextureClip {
  constructor(public img: HTMLImageElement, public clipArea: AABB) {
    if (!clipArea.inside(AABB.origin(img.width, img.height)))
      throw new Error("clipArea should be inside image box");
  }

  get width() { return this.clipArea.width; }
  get height() { return this.clipArea.height; }

  drawTo(rctx: RendererContext, x: number, y: number, flipped = false) {
    rctx.run(({ ctx }) => {
      const { left, top, width, height } = this.clipArea;
      ctx.translate(x, y);
      if (flipped) ctx.scale(-1, 1);
      ctx.drawImage(
        this.img,
        left, top, width, height,
        0, 0, width, height
      );
    });
  }
}
