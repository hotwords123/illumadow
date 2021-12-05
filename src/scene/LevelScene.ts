import { AABB, Coord, Vector } from "../base";
import Scene from "./Scene";
import Entity from "../model/Entity";
import Player from "../model/Player";
import { RendererContext } from "../render/Renderer";
import GameManager from "../GameManager";
import { MapData, MapEntity, MapEntityType, MapTerrain, MapTerrainBrick, MapTerrainSpikes, MapTerrainType, TERRAIN_SIZE } from "../map/interfaces";
import { Terrain, TerrainBrick, TerrainSpikes } from "./Terrain";
import Camera from "./Camera";
import EnemyScout from "../model/enemy/Scout";

export default class LevelScene extends Scene {
  width: number;
  height: number;

  camera: Camera;
  terrains: (Terrain | null)[][];
  player: Player;
  entities: Entity[];

  ticks: number = 0;

  jumpPressed: number = -1;

  constructor(gameManager: GameManager, public map: MapData) {
    super(gameManager);

    this.width = map.width * TERRAIN_SIZE;
    this.height = map.height * TERRAIN_SIZE;

    this.camera = new Camera();

    this.terrains = map.terrain.map((row, y) => row.map((cell, x) => Terrain.create(x, y, cell)));

    let player: Player | null = null;
    this.entities = [];

    for (const data of map.entities) {
      const entity = this.createEntity(data);
      if (entity instanceof Player) {
        player = entity;
      } else if (entity) {
        this.entities.push(entity);
      }
    }

    this.listenKey("move.jump", event => {
      if (event === 'down')
        this.jumpPressed = this.ticks;
    })

    if (!player)
      throw new Error("player not found in map");
    this.player = player;
  }

  createEntity(data: MapEntity): Entity | null {
    const pos = new Coord(data.x, data.y);

    switch (data.type) {
      case MapEntityType.player:
        return new Player(pos, {
          health: data.health,
          maxHealth: data.maxHealth
        });

      case MapEntityType.scout:
        return new EnemyScout(pos);

      default:
        console.warn(`unknown entity type: ${data.type}`);
        return null;
    }
  }

  tick() {
    this.player.tick(this);
    for (const entity of this.entities)
      entity.tick(this);
    this.ticks++;
  }

  render(rctx: RendererContext) {
    const { ctx, debug } = rctx;
    ctx.save();
    ctx.translate(-this.camera.offset.x, -this.camera.offset.y);
    this.renderTerrain(rctx);
    this.player.render(rctx);
    ctx.restore();
  }

  fitTerrain(box: AABB) {
    return new AABB(
      Math.max(0, Math.floor(box.left / TERRAIN_SIZE)),
      Math.max(0, Math.floor(box.top / TERRAIN_SIZE)),
      Math.min(this.map.width, Math.ceil(box.right / TERRAIN_SIZE)),
      Math.min(this.map.height, Math.ceil(box.bottom / TERRAIN_SIZE))
    );
  }

  renderTerrain(rctx: RendererContext) {
    const box = this.fitTerrain(this.camera.viewBox);

    for (let y = box.top; y < box.bottom; y++) {
      const row = this.terrains[y];
      for (let x = box.left; x < box.right; x++) {
        row[x]?.render(rctx);
      }
    }
  }
}
