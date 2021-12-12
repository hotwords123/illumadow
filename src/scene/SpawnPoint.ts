import { Coord } from "../base/math";
import { MapSpawnPoint } from "../map/interfaces";
import { RendererContext } from "../render/Renderer";

export default class SpawnPoint {
  position: Coord;
  tags: string[];

  constructor(data: MapSpawnPoint) {
    this.position = new Coord(data.x, data.y);
    this.tags = data.tags;
  }

  get effectBox() {
    return this.position.expand(8, 40, 8, 8);
  }

  render(rctx: RendererContext) {
    rctx.run(({ ctx, pixelSize, debug }) => {
      if (debug) {
        const { effectBox: box } = this;
        ctx.lineWidth = 2 / pixelSize;
        ctx.strokeStyle = '#e345d7';
        ctx.strokeRect(box.left, box.top, box.width, box.height);
      }
    });
  }
}