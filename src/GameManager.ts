import KeyboardManager from "./input/KeyboardManager";
import levelManager from "./map/LevelManager";
import Renderer from "./render/Renderer";
import { textureManager } from "./render/TextureManager";
import LevelScene from "./scene/LevelScene";
import LoadingScene from "./scene/LoadingScene";
import Scene from "./scene/Scene";
import StartScene from "./scene/StartScene";

export const TICK_ELAPSE = 1 / 60;

export default class GameManager {
  private scene: Scene;
  private renderer: Renderer;
  private keyboardManager: KeyboardManager;
  private timer: number | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    this.scene = new LoadingScene(this);
    this.renderer = new Renderer(canvas);
    this.keyboardManager = new KeyboardManager(this);

    this.renderer.setScene(this.scene);

    this.tickHandler = this.tickHandler.bind(this);
    this.resizeHandler = this.resizeHandler.bind(this);

    window.addEventListener("resize", this.resizeHandler, false);

    textureManager.untilAllLoaded().then(() => {
      this.switchScene(() => new StartScene(this));
    });

    this.start();
  }

  cleanup() {
    window.removeEventListener("resize", this.resizeHandler, false);
    this.keyboardManager.cleanup();
    this.renderer.cleanup();
  }

  getCanvas() { return this.canvas; }
  getScene() { return this.scene; }

  private resizeHandler() {
    this.renderer.adjustSize();
  }

  onKeyEvent(command: string, event: string) {
    switch (command) {
      case 'ui.debug':
        if (event === 'down')
          this.renderer.toggleDebug();
        break;
      default:
        this.scene.onKeyEvent(command, event);
    }
  }

  isKeyPressed(command: string) {
    return this.keyboardManager.isKeyPressed(command);
  }

  start() {
    if (this.timer === null) {
      this.timer = window.setInterval(this.tickHandler);
    }
  }

  stop() {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  tickHandler() {
    this.scene.tick();
  }

  switchScene(callback: () => Scene) {
    this.scene.cleanup();
    this.scene = callback();
    this.renderer.setScene(this.scene);
  }

  startGame() {
    this.switchScene(() => new LevelScene(this, levelManager.get('test')!));
  }
}