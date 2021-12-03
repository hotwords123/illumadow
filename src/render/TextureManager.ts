import { AABB } from "../base";
import { RendererContext } from "./Renderer";

export class Texture {
  width: number;
  height: number;

  constructor(public img: HTMLImageElement) {
    this.width = img.naturalWidth;
    this.height = img.naturalHeight;
  }

  drawTo(rctx: RendererContext, x: number, y: number) {
    rctx.ctx.drawImage(this.img, x, y);
  }
}

export class TextureClip {
  constructor(public img: HTMLImageElement, public clipArea: AABB) {}

  drawTo(rctx: RendererContext, x: number, y: number) {
    const { left, top, width, height } = this.clipArea;
    rctx.ctx.drawImage(
      this.img,
      x, y, width, height,
      left, top, width, height
    );
  }
}

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

  untilAllLoaded(): Promise<void> {
    return Promise.all(this.tasks).then(() => {});
  }
}

export const textureManager = new TextureManager();
