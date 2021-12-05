import { AABB } from "../base";
import { RendererContext } from "./Renderer";

export class Texture {
  clips = new Map<string, TextureClip>();

  constructor(public img: HTMLImageElement) {}

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

  getClip(name: string) {
    return this.clips.get(name);
  }

  drawTo(rctx: RendererContext, x: number, y: number) {
    rctx.ctx.drawImage(this.img, x, y);
  }
}

export class TextureClip {
  constructor(public img: HTMLImageElement, public clipArea: AABB) {
    if (!clipArea.inside(AABB.origin(img.width, img.height)))
      throw new Error("clipArea should be inside image box");
  }

  get width() { return this.clipArea.width; }
  get height() { return this.clipArea.height; }

  drawTo(rctx: RendererContext, x: number, y: number) {
    const { left, top, width, height } = this.clipArea;
    rctx.ctx.drawImage(
      this.img,
      left, top, width, height,
      x, y, width, height
    );
  }
}

export type TextureLike = Texture | TextureClip;

class TextureManager {
  private tasks: Promise<Texture>[] = [];

  constructor() {}

  loadTexture(path: string): Promise<Texture> {
    const promise = new Promise<Texture>((resolve, reject) => {
      const img = new Image();
      img.src = path;
      img.onload = () => resolve(new Texture(img));
      img.onerror = ((evt: ErrorEvent) => reject(new Error(evt.message))) as any;
    });
    this.tasks.push(promise);
    return promise;
  }

  loadTextures(paths: string[]): Promise<Texture[]> {
    return Promise.all(paths.map(path => this.loadTexture(path)));
  }

  untilAllLoaded(): Promise<void> {
    return Promise.all(this.tasks).then(() => {});
  }
}

export const textureManager = new TextureManager();
