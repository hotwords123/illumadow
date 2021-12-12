import { RendererContext } from "../render/Renderer";
import Scene, { SCENE_HEIGHT, SCENE_WIDTH } from "./Scene";
import bg from "../assets/background/start.png";
import { Texture, textureManager } from "../render/TextureManager";
import GameManager from "../GameManager";
import SelectMenu from "./SelectMenu";

let textureBg: Texture;

textureManager.loadTexture("background/start", bg)
  .then(result => { textureBg = result; });

interface Button {
  action: string;
  text: string;
  disabled: boolean;
}

export default class StartScene extends Scene {
  menu: SelectMenu<Button>;
  totalTicks = 0;

  constructor(gameManager: GameManager) {
    super(gameManager);

    this.buttonHandler = this.buttonHandler.bind(this);
    this.menu = new SelectMenu<Button>(this, [
      {
        action: "start",
        text: "开始游戏",
        disabled: false
      },
      {
        action: "help",
        text: "帮助",
        disabled: false
      },
      {
        action: "about",
        text: "关于",
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

  tick() {
    this.totalTicks++;
  }

  render(rctx: RendererContext) {
    rctx.run(({ ctx }) => {
      textureBg.drawTo(rctx, 0, 0);
      this.renderMenu(rctx);
    });
  }

  renderMenu(rctx: RendererContext) {
    rctx.run(({ ctx }) => {
      let x = SCENE_WIDTH / 2, y = 90;
      const { selectedItem } = this.menu;

      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 2;

      for (const item of this.menu.getItems()) {
        let header = item.action === "start";
        ctx.font = `${header ? 9 : 7}px 'Noto Sans SC'`;
        ctx.fillStyle = item === selectedItem ?
          (this.totalTicks % 12 < 6 ? '#90d060' : '#f0e080') :
          (item.disabled ? '#999' : '#eee');
        ctx.fillText(item.text, x, y);
        y += header ? 18 : 12;
      }
    });
  }
}