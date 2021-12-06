import { Dimension } from "../base";
import GameManager from "../GameManager";
import { Drawable, RendererContext } from "../render/Renderer";

export const SCENE_WIDTH = 320;
export const SCENE_HEIGHT = 180;

type KeyHandler = (event: string) => void;

export default abstract class Scene implements Drawable {
  keyHandlers: Map<string, KeyHandler[]> = new Map();

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

  onKeyEvent(command: string, event: string) {
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