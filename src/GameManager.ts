import KeyboardManager from "./input/KeyboardManager";
import levelManager from "./map/LevelManager";
import Renderer from "./render/Renderer";
import { textureManager } from "./render/TextureManager";
import AboutScene from "./scene/AboutScene";
import HelpScene from "./scene/HelpScene";
import LevelScene from "./scene/LevelScene";
import LoadingScene from "./scene/LoadingScene";
import Scene from "./scene/Scene";
import StartScene from "./scene/StartScene";

export const TICK_ELAPSE = 1000 / 60;

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
      case 'debug.toggle':
        if (event === 'down')
          this.renderer.toggleDebug();
        break;
      case 'debug.level':
        if (event === 'down') {
          const name = prompt("Enter level name to enter:");
          if (name) this.startLevel(name);
        }
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
      this.timer = window.setInterval(this.tickHandler, TICK_ELAPSE);
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

  startLevel(name: string) {
    const level = levelManager.get(name);
    if (!level)
      throw new Error(`level "${name}" can't be found`);
    this.switchScene(() => new LevelScene(this, level));
  }

  onLevelComplete(name: string) {
    switch (name) {
      case "level1":
        this.startLevel("level2");
        break;
      case "level2": case "test0": {
        const scene = this.scene as LevelScene;
        scene.gameComplete();
        break;
      }
      default:
        throw new Error(`unknown level: ${name}`);
    }
  }

  startGame() {
    this.startLevel("level1");
  }

  showHelp() {
    this.switchScene(() => new HelpScene(this));
  }

  showAbout() {
    this.switchScene(() => new AboutScene(this));
  }

  backToTitle() {
    this.switchScene(() => new StartScene(this));
  }
}
