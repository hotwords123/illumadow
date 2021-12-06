import { Dimension } from "../base";
import GameManager from "../GameManager";
import { Drawable, RendererContext } from "../render/Renderer";

export const SCENE_WIDTH = 320;
export const SCENE_HEIGHT = 180;

type KeyHandler = (event: string) => void;
type KeyGlobalHandler = (command: string, event: string) => void;

export default abstract class Scene implements Drawable {
  keyHandlers: Map<string, KeyHandler[]> = new Map();
  globalKeyHandlers: KeyGlobalHandler[] = [];

  constructor(protected gameManager: GameManager) {}

  cleanup() {}

  listenKey(command: string, handler: KeyHandler) {
    let handlers = this.keyHandlers.get(command);
    if (!handlers) {
      handlers = [];
      this.keyHandlers.set(command, handlers);
    }
    handlers.push(handler);
  }

  listenAllKeys(handler: KeyGlobalHandler) {
    this.globalKeyHandlers.push(handler);
  }

  removeGlobalListener(handler: KeyGlobalHandler) {
    this.globalKeyHandlers = this.globalKeyHandlers.filter(fn => fn !== handler);
  }

  onKeyEvent(command: string, event: string) {
    for (const handler of this.globalKeyHandlers)
      handler(command, event);
    for (const handler of this.keyHandlers.get(command) ?? [])
      handler(event);
  }

  isKeyPressed(command: string) {
    return this.gameManager.isKeyPressed(command);
  }

  tick() {}

  abstract render(rctx: RendererContext): void;

  get debugText(): string[] { return []; }
}