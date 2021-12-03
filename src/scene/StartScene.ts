import { RendererContext } from "../render/Renderer";
import Scene from "./Scene";
import bg from "../assets/start-scene/bg.png";
import { Texture, textureManager } from "../render/TextureManager";
import GameManager from "../GameManager";

let textureBg: Texture;

textureManager.loadTexture(bg)
  .then(result => { textureBg = result; });

export default class StartScene extends Scene {
  constructor(gameManager: GameManager) {
    super(gameManager);

    this.listenKey("ui.confirm", (event: string) => {
      if (event === "down") {
        this.gameManager.startGame();
      }
    });
  }

  render(rctx: RendererContext) {
    textureBg.drawTo(rctx, 0, 0);
  }
}