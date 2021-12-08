import { AABB, Coord, Vector } from "../base";
import Scene, { SCENE_HEIGHT, SCENE_WIDTH } from "./Scene";
import Entity from "../model/Entity";
import Player from "../model/Player";
import { RendererContext } from "../render/Renderer";
import GameManager from "../GameManager";
import { MapData, MapEntity, MapEntityPlayer, MapEntityType, TERRAIN_SIZE } from "../map/interfaces";
import { Terrain } from "./Terrain";
import Camera from "./Camera";
import EnemyScout from "../model/enemy/Scout";
import EnemyGuard from "../model/enemy/Guard";
import SelectMenu from "./SelectMenu";
import Decoration from "../model/Decoration";

interface MenuItem {
  action: string;
  text: string;
  disabled: boolean;
}

export default class LevelScene extends Scene {
  /** Scene width (map.width * TERRAIN_SIZE) */
  width!: number;
  /** Scene height (map.height * TERRAIN_SIZE) */
  height!: number;

  terrains!: (Terrain | null)[][];
  player!: Player;
  entities!: Entity[];
  decorations!: Decoration[];

  camera!: Camera;

  /** Ticks passed since level started, reset when retry */
  ticks: number = 0;
  /** Ticks passed since scene created */
  totalTicks: number = 0;

  tickTime = 0;

  paused = false;
  pauseMenu: SelectMenu<MenuItem> | null = null;

  constructor(gameManager: GameManager, private map: MapData) {
    super(gameManager);

    this.init();

    this.listenAllKeys((...args) => this.player.receiveInput(this, ...args));
    this.listenKey("ui.pause", event => {
      if (event === "down") this.togglePause();
    });
  }

  cleanup() {
    this.pauseMenu?.cleanup();
  }

  /**
   * Initialize scene using data specified in the level map.
   * Called on creation and retrials.
   */
  init() {
    const { map } = this;

    this.width = map.width * TERRAIN_SIZE;
    this.height = map.height * TERRAIN_SIZE;

    this.terrains = map.terrain.map((row, y) => row.map((cell, x) => Terrain.create(x, y, cell)));
    this.entities = [];
    for (const data of map.entities) {
      const entity = this.createEntity(data);
      if (entity instanceof Player) {
        this.player = entity;
      } else if (entity) {
        this.entities.push(entity);
      }
    }
    if (!this.player)
      throw new Error("player not found in map");
    this.decorations = map.decorations.map(data => new Decoration(data));

    this.camera = new Camera(this);

    this.ticks = 0;
  }

  createEntity(data: MapEntity): Entity | null {
    switch (data.type) {
      case MapEntityType.player:
        return new Player(data as MapEntityPlayer);

      case MapEntityType.scout:
        return new EnemyScout(data as MapEntity);

      case MapEntityType.guard:
        return new EnemyGuard(data as MapEntity);

      default:
        console.warn(`unknown entity type: ${data.type}`);
        return null;
    }
  }

  togglePause() {
    if (this.paused) {
      this.paused = false;
      this.pauseMenu!.cleanup();
      this.pauseMenu = null;
    } else {
      this.paused = true;
      this.pauseMenu = new SelectMenu<MenuItem>(this, [
        {
          action: "resume",
          text: "Back to Game",
          disabled: false
        },
        {
          action: "retry",
          text: "Retry",
          disabled: this.player.dead
        },
        {
          action: "title",
          text: "Return to Title",
          disabled: false
        }
      ], ({ action }: MenuItem) => {
        switch (action) {
          case "retry":
            this.retry();
            break;
          case "title":
            this.gameManager.backToTitle();
            break;
        }
        this.togglePause();
      })
    }
  }

  retry() {
    // TODO: animation
    this.init();
  }

  tick() {
    const startTime = performance.now();
    this.totalTicks++;
    if (!this.paused) {
      this.player.tick(this);
      for (const entity of this.entities)
        entity.tick(this);
      this.camera.update();
      this.ticks++;
    }
    const endTime = performance.now();
    this.tickTime = endTime - startTime;
  }

  render(rctx: RendererContext) {
    rctx.run(() => {
      this.camera.render(rctx, () => {
        this.renderTerrain(rctx);
        for (const decoration of this.decorations)
          decoration.render(rctx);
        for (const entity of this.entities)
          entity.render(rctx);
        this.player.render(rctx);
      });
      this.renderPauseMenu(rctx);
    });
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

  renderPauseMenu(rctx: RendererContext) {
    rctx.run(({ ctx }) => {
      if (!this.pauseMenu) return;

      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);

      let x = SCENE_WIDTH / 2, y = 30;
      const { selectedItem } = this.pauseMenu;

      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 1;
      ctx.fillStyle = "#999";
      ctx.fillText("Paused", x, y);
      y += 20;

      ctx.font = "5px sans-serif";
      for (const item of this.pauseMenu.getItems()) {
        ctx.fillStyle = item !== selectedItem ? '#fff':
          this.totalTicks % 12 < 6 ? '#90d060' : '#f0e080';
        ctx.fillText(item.text, x, y);
        y += 10;
      }
    });
  }

  get debugText() {
    return [
      `Tick: ${this.tickTime.toFixed(1)} ms`,
      `${this.width}*${this.height} | ${this.map.width}*${this.map.height} ${this.map.id}`,
      `X: ${this.player.x.toFixed(1)} Y: ${this.player.y.toFixed(1)}`,
      `Camera: (${this.camera.offset.x.toFixed(0)}, ${this.camera.offset.y.toFixed(0)})`,
      `Health: ${this.player.health}/${this.player.maxHealth} Immune: ${this.player.immuneTicks}`
    ];
  }
}
