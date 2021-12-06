import GameManager from "../GameManager";
import Scene, { SCENE_HEIGHT, SCENE_WIDTH } from "../scene/Scene";

export interface RendererContext {
  ctx: CanvasRenderingContext2D;
  pixelSize: number;
  debug: boolean;
}

export interface Drawable {
  render(ctx: RendererContext): void;
}

export default class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private memCanvas: HTMLCanvasElement;
  private memCtx: CanvasRenderingContext2D;

  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private pixelSize: number = 0;

  private scene: Scene | null = null;

  private timer: number | null = null;

  private debugMode: boolean = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext("2d")!;

    this.memCanvas = document.createElement("canvas");
    this.memCtx = this.memCanvas.getContext("2d")!;

    this.adjustSize();

    this.renderHandler = this.renderHandler.bind(this);
    this.start();
  }

  cleanup() {
    this.stop();
  }

  start() {
    if (this.timer === null) {
      this.timer = requestAnimationFrame(this.renderHandler);
    }
  }

  stop() {
    if (this.timer !== null) {
      cancelAnimationFrame(this.timer);
      this.timer = null;
    }
  }

  adjustSize() {
    const pixelRatio = window.devicePixelRatio;
    const logicWidth = document.body.clientWidth;
    const logicHeight = document.body.clientHeight;
    const deviceWidth = pixelRatio * logicWidth;
    const deviceHeight = pixelRatio * logicHeight;

    this.pixelSize = Math.max(1, Math.floor(Math.min(deviceWidth / SCENE_WIDTH, deviceHeight / SCENE_HEIGHT)));
    this.canvasWidth = this.pixelSize * SCENE_WIDTH;
    this.canvasHeight = this.pixelSize * SCENE_HEIGHT;

    this.canvas.width = this.canvasWidth;
    this.canvas.height = this.canvasHeight;

    this.memCanvas.width = this.canvasWidth;
    this.memCanvas.height = this.canvasHeight;
    this.memCtx.imageSmoothingEnabled = false;

    this.canvas.style.position = 'absolute';
    this.canvas.style.width = this.canvasWidth / pixelRatio + 'px';
    this.canvas.style.height = this.canvasHeight / pixelRatio + 'px';
    this.canvas.style.left = (logicWidth - this.canvasWidth / pixelRatio) / 2 + 'px';
    this.canvas.style.top = (logicHeight - this.canvasHeight / pixelRatio) / 2 + 'px';
  }

  setScene(scene: Scene) {
    this.scene = scene;
    this.render();
  }

  renderHandler() {
    this.timer = null;
    this.render();
    this.timer = requestAnimationFrame(this.renderHandler);
  }

  render() {
    if (!this.scene) return;
    const startTime = performance.now();
    this.memCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    this.memCtx.scale(this.pixelSize, this.pixelSize);
    this.scene.render({
      ctx: this.memCtx,
      pixelSize: this.pixelSize,
      debug: this.debugMode
    });
    this.memCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    this.ctx.drawImage(this.memCanvas, 0, 0);
    const endTime = performance.now();
    if (this.debugMode) {
      const debugText: string[] = [
        [
          `${this.canvasWidth}*${this.canvasHeight} ${this.pixelSize}x`,
          `[${(endTime - startTime).toFixed(1).padStart(4, ' ')} ms]`
        ].join(' '),
        ...this.scene.debugText
      ];
      this.ctx.font = '18px Consolas';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'top';
      this.ctx.fillStyle = '#333';

      let textY = 8;
      for (const text of debugText) {
        this.ctx.fillText(text, 8, textY);
        textY += 20;
      }

      this.ctx.strokeStyle = '#999';
      this.ctx.strokeRect(0, 0, this.canvasWidth, this.canvasHeight);
    }
  }

  setDebug(flag: boolean) {
    this.debugMode = flag;
    this.render();
  }

  toggleDebug() {
    this.setDebug(!this.debugMode);
  }
}