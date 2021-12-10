import { MapBackground, MapBackgroundAxis } from "../map/interfaces";
import { RendererContext } from "../render/Renderer";
import { TextureLike, textureManager } from "../render/TextureManager";
import LevelScene from "./LevelScene";
import { SCENE_HEIGHT, SCENE_WIDTH } from "./Scene";
import imgBgForest1 from "../assets/background/forest1.png";
import imgBgForest2 from "../assets/background/forest2.png";
import imgBgCloud from "../assets/background/cloud.png";

textureManager.loadTextures([
  ["bg/forest1", imgBgForest1],
  ["bg/forest2", imgBgForest2],
  ["bg/cloud", imgBgCloud]
]);

function lerp(a: number, b: number, k: number) {
  return a + (b - a) * k;
}

interface OffsetState {
  textureSize: number;
  cameraSize: number;
  sceneSize: number;
  cameraOffset: number;
}

interface BackgroundPosition {
  offset: number;
  start: number;
  end: number;
}

export default class Background {
  texture: TextureLike;
  opacity: number;
  horizontal: MapBackgroundAxis;
  vertical: MapBackgroundAxis;

  constructor(data: MapBackground) {
    this.texture = textureManager.get(data.picture)!;
    this.opacity = data.opacity;
    this.horizontal = data.horizontal;
    this.vertical = data.vertical;
  }

  getPosition(params: MapBackgroundAxis, state: OffsetState): BackgroundPosition {
    if (params.repeat) {
      let offset = Math.round(params.offset + state.cameraOffset * params.factor);
      let start = Math.floor(offset / state.textureSize);
      let end = Math.ceil((offset + state.cameraSize) / state.textureSize);
      return { offset, start, end };
    } else {
      let offset = Math.round(lerp(params.marginL,
        state.cameraSize - params.marginR - state.textureSize,
        state.cameraOffset / (state.sceneSize - state.cameraSize)));
      return { offset, start: 0, end: 1 };
    }
  }

  render(rctx: RendererContext, scene: LevelScene) {
    const { camera } = scene;

    let textureWidth = this.texture.width;
    let textureHeight = this.texture.height;

    let positionX = this.getPosition(this.horizontal, {
      textureSize: textureWidth,
      cameraSize: SCENE_WIDTH,
      sceneSize: scene.width,
      cameraOffset: camera.offset.x
    });
    let positionY = this.getPosition(this.vertical, {
      textureSize: textureHeight,
      cameraSize: SCENE_HEIGHT,
      sceneSize: scene.height,
      cameraOffset: camera.offset.y
    });

    rctx.run(({ ctx }) => {
      ctx.translate(-positionX.offset, -positionY.offset);
      ctx.globalAlpha = this.opacity;
      for (let x = positionX.start; x < positionX.end; x++) {
        for (let y = positionY.start; y < positionY.end; y++) {
          this.texture.drawTo(rctx, x * textureWidth, y * textureHeight);
        }
      }
    });
  }
}
