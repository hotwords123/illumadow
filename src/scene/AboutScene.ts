import { RendererContext } from "../render/Renderer";
import Scene, { SCENE_HEIGHT, SCENE_WIDTH } from "./Scene";
import bg from "../assets/background/help.png";
import { Texture, textureManager } from "../render/TextureManager";
import GameManager from "../GameManager";
import { ForwardAnimation, GeneratorAnimation } from "../render/Animation";
import { STRINGS } from "./Subtitle";

let textureBg: Texture;

textureManager.loadTexture("background/help", bg)
  .then(result => { textureBg = result; });

export default class AboutScene extends Scene {
  constructor(gameManager: GameManager) {
    super(gameManager);

    this.listenKey("ui.pause", event => {
      if (event === "down")
        this.backToTitle();
    });
  }

  backToTitle() {
    this.gameManager.backToTitle();
  }

  render(rctx: RendererContext) {
    rctx.run(({ ctx }) => {
      textureBg.drawTo(rctx, 0, 0);

      ctx.font = "4.5px 'Noto Sans SC'";
      ctx.fillStyle = '#f7f7f7';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText("Esc 返回标题界面", 310, 172);

      ctx.font = "12px 'Noto Sans SC'";
      ctx.fillStyle = '#999';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 2;
      ctx.fillText("关于", 160, 35);

      let y = 55;
      ctx.font = "5px 'Noto Sans SC'";
      ctx.fillStyle = '#d7d7d7';
      for (let text of STRINGS["about"].split('\n')) {
        ctx.fillText(text, 160, y);
        y += 10;
      }
    });
  }
}