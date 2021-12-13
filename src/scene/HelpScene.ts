import { RendererContext } from "../render/Renderer";
import Scene, { SCENE_HEIGHT, SCENE_WIDTH } from "./Scene";
import bg from "../assets/background/help.png";
import { Texture, textureManager } from "../render/TextureManager";
import GameManager from "../GameManager";
import { ForwardAnimation, GeneratorAnimation } from "../render/Animation";
import { STRINGS } from "./Subtitle";

let textureBg: Texture;

interface RenderLine {
  text: string;
  opacity: number;
  offset: number;
}

textureManager.loadTexture("background/help", bg)
  .then(result => { textureBg = result; });

export default class HelpScene extends Scene {
  animation: ForwardAnimation<void> | null = null;

  renderLines: RenderLine[] = [];

  constructor(gameManager: GameManager) {
    super(gameManager);

    this.listenKey("ui.pause", event => {
      if (event === "down")
        this.backToTitle();
    });

    this.animation = new GeneratorAnimation(this.animate());
  }

  backToTitle() {
    this.gameManager.backToTitle();
  }

  tick() {
    if (this.animation?.next())
      this.animation = null;
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
      ctx.fillText("帮助", 160, 35);

      let y = 60;
      ctx.font = "5.5px 'Noto Sans SC'";
      ctx.fillStyle = '#d7d7d7';
      for (let { text, opacity, offset } of this.renderLines) {
        ctx.globalAlpha = opacity;
        ctx.fillText(text, 160, y + offset);
        y += 20;
      }
    });
  }

  *animate() {
    const fadeIn = 45, wait = 90, firstWait = 45;
    let lines = STRINGS["help"].split('\n');
    let first = true;

    for (let line of lines) {
      let renderLine: RenderLine = {
        text: line,
        opacity: 0,
        offset: 0
      };
      this.renderLines.push(renderLine);

      for (let i = first ? firstWait : wait; i > 0; i--)
        yield;
      first = false;

      for (let i = 1; i <= fadeIn; i++) {
        renderLine.opacity = i / fadeIn;
        renderLine.offset = (1 - i / fadeIn) * 7;
        yield;
      }
    }
  }
}