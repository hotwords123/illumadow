import { RendererContext } from "../render/Renderer";
import LevelScene from "./LevelScene";

interface SubtitleContent {
  text: string;
}

export default class Subtitle {
  current: SubtitleContent | null = null;
  displayTicks: number = -1;

  constructor(private scene: LevelScene) {}

  show(content: SubtitleContent, ticks: number) {
    // TODO: fade in, queue
    this.current = content;
    this.displayTicks = ticks;
  }

  tick() {
    if (this.current) {
      this.displayTicks--;
      if (this.displayTicks < 0) {
        // TODO: fade out
        this.current = null;
      }
    }
  }

  render(rctx: RendererContext) {
    rctx.run(({ ctx }) => {
      if (this.current) {
        ctx.lineWidth = 1;
        ctx.fillStyle = '#333';
        ctx.strokeStyle = '#aaa';
        ctx.beginPath();
        ctx.rect(5, 5, 310, 20);
        ctx.fill();
        ctx.stroke();

        ctx.font = '4px sans-serif'; 
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.current.text, 25, 15);
      }
    });
  }
}