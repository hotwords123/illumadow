import { RendererContext } from "../render/Renderer";
import Scene, { SCENE_HEIGHT, SCENE_WIDTH } from "./Scene";

export default class LoadingScene extends Scene {
  render(rctx: RendererContext) {
    const { ctx } = rctx;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#474d4e';
    ctx.fillText("Loading...", SCENE_WIDTH / 2, SCENE_HEIGHT / 2);
  }
}