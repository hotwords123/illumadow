import { Coord } from "../base";
import Scene from "./Scene";
import Entity from "../model/Entity";
import Player from "../model/Player";
import { RendererContext } from "../render/Renderer";
import GameManager from "../GameManager";
import { MapData, MapTerrain, MapTerrainBrick, MapTerrainSpikes, MapTerrainType } from "../map/interfaces";
import { Terrain, TerrainBrick, TerrainSpikes, TERRAIN_SIZE } from "./Terrain";
import Camera from "./Camera";

export default class LevelScene extends Scene {
  width: number;
  height: number;

  camera: Camera;
  player: Player;
  terrains: (Terrain | null)[][];

  constructor(gameManager: GameManager, public map: MapData) {
    super(gameManager);

    this.width = map.width * TERRAIN_SIZE;
    this.height = map.height * TERRAIN_SIZE;

    this.camera = new Camera(this);

    this.player = new Player(new Coord(0, 0));
    this.terrains = map.terrain.map((row, y) => row.map((cell, x) => this.createTerrain(x, y, cell)));
  }

  createTerrain(x: number, y: number, cell: MapTerrain | null): Terrain | null {
    if (!cell) return null;
    const coord = new Coord(x, y);
    switch (cell.type) {
      case MapTerrainType.brick: {
        const c = cell as MapTerrainBrick;
        return new TerrainBrick(coord, c.texture);
      }
      case MapTerrainType.spikes: {
        const c = cell as MapTerrainSpikes;
        return new TerrainSpikes(coord, c.side);
      }
      default:
        console.warn(`terrain (${x}, ${y}): unknown type: ${cell.type}`);
        return null;
    }
  }

  tick() {
    //
  }

  render(rctx: RendererContext) {
    const { ctx, debug } = rctx;
    ctx.save();
    ctx.translate(-this.camera.offset.x, -this.camera.offset.y);
    this.renderTerrain(rctx);
    ctx.restore();
  }

  renderTerrain(rctx: RendererContext) {
    const box = this.camera.viewBox,
      left = Math.max(0, Math.floor(box.left / TERRAIN_SIZE)),
      top = Math.max(0, Math.floor(box.top / TERRAIN_SIZE)),
      right = Math.min(this.map.width, Math.ceil(box.right / TERRAIN_SIZE)),
      bottom = Math.min(this.map.height, Math.ceil(box.bottom / TERRAIN_SIZE));

    for (let y = top; y < bottom; y++) {
      const row = this.terrains[y];
      for (let x = left; x < right; x++) {
        row[x]?.render(rctx);
      }
    }
  }
}
