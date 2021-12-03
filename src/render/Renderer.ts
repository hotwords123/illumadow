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

  private timer: number | null = null;

  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private pixelSize: number = 0;

  private debugMode: boolean = false;

  constructor(private gameManager: GameManager) {
    this.canvas = gameManager.getCanvas();
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

  renderHandler() {
    this.timer = null;
    this.render();
    this.timer = requestAnimationFrame(this.renderHandler);
  }

  render() {
    const scene = this.gameManager.getScene();
    this.memCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    this.memCtx.scale(this.pixelSize, this.pixelSize);
    scene.render({
      ctx: this.memCtx,
      pixelSize: this.pixelSize,
      debug: this.debugMode
    });
    this.memCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    this.ctx.drawImage(this.memCanvas, 0, 0);
  }

  setDebug(flag: boolean) {
    this.debugMode = flag;
  }
}