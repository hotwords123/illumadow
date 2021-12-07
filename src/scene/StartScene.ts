import { RendererContext } from "../render/Renderer";
import Scene, { SCENE_HEIGHT, SCENE_WIDTH } from "./Scene";
import bg from "../assets/start-scene/bg.png";
import { Texture, textureManager } from "../render/TextureManager";
import GameManager from "../GameManager";
import SelectMenu from "./SelectMenu";

let textureBg: Texture;

textureManager.loadTexture("start-scene/bg", bg)
  .then(result => { textureBg = result; });

interface Button {
  action: string;
  text: string;
  disabled: boolean;
}

export default class StartScene extends Scene {
  menu: SelectMenu<Button>;

  constructor(gameManager: GameManager) {
    super(gameManager);

    this.buttonHandler = this.buttonHandler.bind(this);
    this.menu = new SelectMenu<Button>(this, [
      {
        action: "start",
        text: "Start",
        disabled: false
      },
      {
        action: "help",
        text: "Help",
        disabled: false
      },
      {
        action: "about",
        text: "About",
        disabled: false
      }
    ], this.buttonHandler);
  }

  cleanup() {
    this.menu.cleanup();
  }

  buttonHandler(button: Button) {
    switch (button.action) {
      case "start":
        this.gameManager.startGame();
        break;

      case "help":
        break;

      case "about":
        break;
    }
  }

  render(rctx: RendererContext) {
    rctx.run(({ ctx }) => {
      textureBg.drawTo(rctx, 0, 0);
      ctx.font = "8px Consolas";
      ctx.textAlign = "center";
      ctx.fillStyle = "#000";
      ctx.fillText(this.menu.selectedItem.text, SCENE_WIDTH / 2, SCENE_HEIGHT * 2 / 3);
    });
  }
}