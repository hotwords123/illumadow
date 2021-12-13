import { ForwardAnimation, GeneratorAnimation } from "../render/Animation";
import { RendererContext } from "../render/Renderer";
import LevelScene from "./LevelScene";
import { SCENE_WIDTH } from "./Scene";
import strings from "../assets/strings.json";

export const STRINGS = strings;

interface SubtitleContent {
  text: string;
}

export default class Subtitle {
  current: SubtitleContent | null = null;
  opacity = 0;
  animation: ForwardAnimation<void> | null = null;

  constructor(private scene: LevelScene) {}

  show(content: SubtitleContent, ticks: number) {
    this.animation = new GeneratorAnimation(this.animate(content, ticks));
  }

  *animate(content: SubtitleContent, ticks: number) {
    const fadeIn = 30, fadeOut = 45;
    this.current = content;
    for (let i = 0; i < fadeIn; i++) {
      this.opacity = i / fadeIn;
      yield;
    }
    for (let i = 0; i < ticks - fadeIn - fadeOut; i++) {
      yield;
    }
    for (let i = fadeOut; i > 0; i--) {
      this.opacity = i / fadeOut;
      yield;
    }
    this.current = null;
  }

  tick() {
    if (this.animation?.next()) {
      this.animation = null;
    }
  }

  render(rctx: RendererContext) {
    rctx.run(({ ctx }) => {
      if (this.current) {
        ctx.font = '4.8px sans-serif'; 
        ctx.fillStyle = '#f7f7f7';
        ctx.globalAlpha = this.opacity;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 3;
        ctx.fillText(this.current.text, SCENE_WIDTH / 2, 145);
      }
    });
  }
}