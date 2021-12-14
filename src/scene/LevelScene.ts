import { AABB, Coord, Facing, Vector } from "../base/math";
import Scene, { SCENE_HEIGHT, SCENE_WIDTH } from "./Scene";
import Entity from "../model/Entity";
import Player from "../model/Player";
import { RendererContext } from "../render/Renderer";
import GameManager from "../GameManager";
import { MapData, MapEntity, MapEntityItem, MapEntityPlayer, MapEntityType, TERRAIN_SIZE } from "../map/interfaces";
import { Terrain } from "../model/Terrain";
import Camera from "./Camera";
import EnemyScout from "../model/enemy/Scout";
import EnemyGuard from "../model/enemy/Guard";
import SelectMenu from "./SelectMenu";
import Decoration from "../model/Decoration";
import Subtitle, { STRINGS } from "./Subtitle";
import EnemyArcher from "../model/enemy/Archer";
import imgHealth from "../assets/hud/health.png";
import { Texture, textureManager } from "../render/TextureManager";
import Background from "./Background";
import Landmark from "./Landmark";
import SpawnPoint from "./SpawnPoint";
import FocusCircle, { DespawningFocusCircle, OpeningFocusCircle, RespawningFocusCirle } from "./FocusCircle";
import { ForwardAnimation, GeneratorAnimation } from "../render/Animation";
import Trigger from "./Trigger";
import EntityItem from "../model/Item";
import Particle, { WitchTeleport } from "../model/Particle";
import EnemyWitch from "../model/enemy/Witch";
import Mob from "../model/Mob";

let textureHealth: Texture;

textureManager.loadTextures([
  ["hud/health", imgHealth]
]).then(textures => {
  [textureHealth] = textures;
  textureHealth.defineClips([['5', '4', '3', '2', '1', '0']], 32, 32);
});

interface MenuItem {
  action: string;
  text: string;
  disabled: boolean;
}

type TickEndHandler = (scene: LevelScene) => void;

export default class LevelScene extends Scene {
  /** Scene width (map.width * TERRAIN_SIZE) */
  width!: number;
  /** Scene height (map.height * TERRAIN_SIZE) */
  height!: number;

  terrains!: (Terrain | null)[][];
  player!: Player;
  entities!: Entity[];
  decorations!: Decoration[];
  backgrounds!: Background[];
  landmarks!: Landmark[];
  spawnPoints!: SpawnPoint[];
  spawnPoint!: Coord;
  triggers!: Trigger[];
  particles!: Particle[];

  tickEndHandlers: TickEndHandler[] = [];

  /** used for block player's move before tasks finished */
  boundary!: AABB;

  camera!: Camera;
  subtitle!: Subtitle;

  focusCircle: FocusCircle | null = null;

  /** whether the player is despawning */
  despawning = false;
  won = false;
  animation: ForwardAnimation<void> | null = null;

  /** Ticks passed since level started, reset when retry */
  ticks: number = 0;
  /** Ticks passed since scene created */
  totalTicks: number = 0;
  /** Ticks left to pause when trigger skills */
  pauseTicks: number = 0;

  tickTime = 0;

  skeletonSummoned = false;
  skeletonDroppedFlower = false;
  playerFallenIntoWater = false;

  paused = false;
  pauseMenu: SelectMenu<MenuItem> | null = null;
  gameOverMenu: SelectMenu<MenuItem> | null = null;
  gameCompletedMenu: SelectMenu<MenuItem> | null = null;

  constructor(gameManager: GameManager, private map: MapData) {
    super(gameManager);

    this.init();

    this.listenAllKeys((...args) => this.player.receiveInput(this, ...args));
    this.listenKey("ui.pause", event => {
      if (event === "down" && !this.gameOverMenu && !this.gameCompletedMenu) this.togglePause();
    });
  }

  cleanup() {
    this.pauseMenu?.cleanup();
  }

  get mapWidth() { return this.map.width; }
  get mapHeight() { return this.map.height; }

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
      if (entity) {
        this.entities.push(entity);
        if (entity.isPlayer())
          this.player = entity;
      }
    }
    if (!this.player)
      throw new Error("player not found in map");
    this.player.outOfControlTicks = 30;

    this.decorations = map.decorations.map(data => new Decoration(data));
    this.backgrounds = map.backgrounds.map(data => new Background(data));
    this.landmarks = map.landmarks.map(data => new Landmark(data));
    this.spawnPoints = map.spawnPoints.map(data => new SpawnPoint(data));
    this.spawnPoint = this.player.position.clone();
    this.triggers = map.triggers.map(data => Trigger.create(data));
    this.particles = [];

    this.tickEndHandlers = [];

    this.boundary = new AABB(0, 0, this.width, this.height);

    this.camera = new Camera(this);
    this.subtitle = new Subtitle(this);

    this.despawning = false;
    this.won = false;
    this.animation = new GeneratorAnimation(this.animateOpening());

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

      case MapEntityType.archer:
        return new EnemyArcher(data as MapEntity);

      case MapEntityType.witch:
        return new EnemyWitch(data as MapEntity);

      case MapEntityType.item:
        return EntityItem.create(data as MapEntityItem);

      default:
        console.warn(`unknown entity type: ${data.type}`);
        return null;
    }
  }

  getEntitiesWithTag(tag: string): Entity[] {
    return this.entities.filter(entity => entity.tags.includes(tag));
  }

  getEntitiesInArea(box: AABB): Entity[] {
    return this.entities.filter(entity => box.intersects(entity.collisionBox));
  }

  addEntity(entity: Entity) {
    this.entities.push(entity);
  }

  deleteEntity(entity: Entity) {
    this.entities = this.entities.filter(e => e !== entity);
  }

  shortPause(ticks: number) {
    this.pauseTicks = ticks;
  }

  deleteTerrain({ x, y }: Coord) {
    this.terrains[y][x] = null;
  }

  addParticle(particle: Particle) {
    this.particles.push(particle);
  }

  deleteParticle(particle: Particle) {
    this.particles = this.particles.filter(p => p !== particle);
  }

  getLandmark(tag: string) {
    const landmark = this.landmarks.find(x => x.tags.includes(tag));
    if (!landmark) throw new Error(`landmark not found: ${tag}`);
    return landmark;
  }

  getLandmarksWithTag(tag: string) {
    return this.landmarks.filter(landmark => landmark.tags.includes(tag));
  }

  setBoundary(box: AABB) {
    this.boundary = box;
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
          text: "继续游戏",
          disabled: false
        },
        {
          action: "retry",
          text: "重试",
          disabled: this.despawning || this.animation !== null || this.player.health <= 1
        },
        {
          action: "restart",
          text: "重新开始",
          disabled: false
        },
        {
          action: "title",
          text: "返回标题界面",
          disabled: false
        }
      ], ({ action }: MenuItem) => {
        switch (action) {
          case "retry":
            this.retry();
            break;
          case "restart":
            this.restart();
            break;
          case "title":
            this.gameManager.backToTitle();
            break;
        }
        this.togglePause();
      })
    }
  }

  *animateOpening() {
    this.focusCircle = new OpeningFocusCircle(this.player.collisionBox.center);
    do yield; while (!this.focusCircle.next());
    this.focusCircle = null;
  }

  showSubtitle(text: string, ticks: number) {
    this.subtitle.show({ text }, ticks);
  }

  rumble() {
    this.camera.rumble();
  }

  onTickEnd(handler: TickEndHandler) {
    this.tickEndHandlers.push(handler);
  }

  tick() {
    const startTime = performance.now();
    this.totalTicks++;
    if (!this.paused) {
      if (this.pauseTicks > 0) {
        this.pauseTicks--;
      } else {
        if (this.animation?.next())
          this.animation = null;

        if (!this.despawning) {
          // Terrain
          for (const row of this.terrains)
            for (const cell of row)
              cell?.tick(this);
  
          // Entities
          for (const entity of this.entities)
            if (entity.collisionBox.intersects(this.boundary))
              entity.tick(this);

          // Particle
          for (const particle of this.particles)
            particle.tick(this);
  
          // Spawn Point
          for (const spawnPoint of this.spawnPoints) {
            if (spawnPoint.effectBox.intersects(this.player.collisionBox)) {
              this.spawnPoint = spawnPoint.position.clone();
            }
          }

          // Triggers
          for (const trigger of this.triggers)
            trigger.tick(this);

          // Handlers
          for (const handler of this.tickEndHandlers)
            handler(this);
          this.tickEndHandlers = [];

          // Misc
          this.camera.update();
          this.ticks++;
        }

        this.subtitle.tick();
      }
    }
    const endTime = performance.now();
    this.tickTime = endTime - startTime;
  }

  onPlayerRespawn() {
    this.animation = new GeneratorAnimation(this.animateRespawn());
  }

  *animateRespawn() {
    this.despawning = true;
    this.focusCircle = new DespawningFocusCircle(this.player.collisionBox.center);
    do yield; while (!this.focusCircle.next());
    for (let i = 0; i < 30; i++) yield;
    this.player.respawn(this);
    this.camera.update(true);
    this.despawning = false;
    this.focusCircle = new RespawningFocusCirle(this.player.collisionBox.center);
    do yield; while (!this.focusCircle.next());
    this.focusCircle = null;

    if (this.won) {
      for (let i = 0; i < 60; i++) yield;
      yield* this.animateLevelComplete();
    }
  }

  onBossDie(boss: EnemyWitch) {
    this.won = true;
    this.animation = new GeneratorAnimation(this.animateBossDie(boss));
  }

  *animateBossDie(boss: EnemyWitch) {
    for (const entity of this.getEntitiesWithTag("witch-summon")) {
      const mob = entity as Mob;
      this.addParticle(new WitchTeleport(mob.collisionBox.center));
      mob.damage(this, Infinity, null, true);
    }

    let vector = this.player.position.diff(boss.position);
    this.player.knockback(this.player.position, vector.x > 0 ? Facing.right : Facing.left,
      250 / (50 + vector.length), 3);
    this.player.outOfControlTicks = 600;

    const center = boss.collisionBox.center;

    this.showSubtitle(STRINGS["level2-end"], 240);

    for (let i = 0; i < 8; i++) {
      let offset = i === 0 ? new Vector(0, 0) :
        new Vector(Math.random() * 10 - 5, Math.random() * 10 - 5);
      let particle = new WitchTeleport(center.plus(offset));
      particle.velocity.x = offset.x / 8;
      particle.velocity.y = offset.y / 8;
      this.addParticle(particle);
      for (let j = 0; j < 6; j++) yield;
    }

    while (this.subtitle.current) yield;
    for (let i = 0; i < 20; i++) yield;
    
    yield* this.animateLevelComplete();
  }

  retry() {
    this.player.damage(this, 1, null, true);
  }

  restart() {
    this.init();
  }

  levelComplete() {
    this.won = true;
    this.animation = new GeneratorAnimation(this.animateLevelComplete());
  }

  *animateLevelComplete() {
    this.despawning = true;
    this.focusCircle = new DespawningFocusCircle(this.player.collisionBox.center);
    do yield; while (!this.focusCircle.next());
    for (let i = 0; i < 30; i++) yield;
    this.gameManager.onLevelComplete(this.map.id);
  }

  gameOver() {
    this.animation = new GeneratorAnimation(this.animateGameOver());
  }

  *animateGameOver() {
    this.despawning = true;
    this.focusCircle = new DespawningFocusCircle(this.player.collisionBox.center);
    do yield; while (!this.focusCircle.next());
    for (let i = 0; i < 20; i++) yield;
    this.showSubtitle(STRINGS["game-over"], 180);
    while (this.subtitle.current) yield;
    for (let i = 0; i < 20; i++) yield;
    this.gameOverMenu = new SelectMenu<MenuItem>(this, [
      {
        action: "restart",
        text: "重玩本关",
        disabled: false
      },
      {
        action: "title",
        text: "返回标题界面",
        disabled: false
      }
    ], ({ action }) => {
      this.gameOverMenu!.cleanup();
      this.gameOverMenu = null;

      switch (action) {
        case "restart":
          this.restart();
          break;

        case "title":
          this.gameManager.backToTitle();
          break;
      }
    });
  }

  gameComplete() {
    this.gameCompletedMenu = new SelectMenu<MenuItem>(this, [
      {
        action: "restart",
        text: "重新开始",
        disabled: false
      },
      {
        action: "title",
        text: "返回标题界面",
        disabled: false
      }
    ], ({ action }) => {
      this.gameCompletedMenu!.cleanup();
      this.gameCompletedMenu = null;

      switch (action) {
        case "restart":
          this.gameManager.startGame();
          break;

        case "title":
          this.gameManager.backToTitle();
          break;
      }
    });
  }

  render(rctx: RendererContext) {
    const { viewBox } = this.camera;

    rctx.run(({ ctx }) => {
      rctx.run(() => {
        if (this.focusCircle) {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
          const { center, radius } = this.focusCircle.current();
          ctx.beginPath();
          center.setMinus(this.camera.offset);
          ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
          ctx.clip();
        }
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
        for (const background of this.backgrounds)
          background.render(rctx, this);
        this.camera.render(rctx, () => {
          this.renderTerrain(rctx);
          for (const decoration of this.decorations)
            if (decoration.getRenderInfo()?.box.intersects(viewBox))
              decoration.render(rctx);
          for (const spawnPoint of this.spawnPoints)
            spawnPoint.render(rctx);
          for (const entity of this.entities)
            entity.render(rctx);
          for (const particle of this.particles)
            particle.render(rctx);
        });
        this.renderHud(rctx);
      });
      this.subtitle.render(rctx);
      if (this.pauseMenu)
        this.renderMenu(rctx, this.pauseMenu, "暂停");
      if (this.gameOverMenu)
        this.renderMenu(rctx, this.gameOverMenu, "挑战失败");
      if (this.gameCompletedMenu)
        this.renderMenu(rctx, this.gameCompletedMenu, "挑战成功");
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

  renderHud(rctx: RendererContext) {
    rctx.run(({ ctx }) => {
      // Health
      let heartCount = Math.ceil(this.player.maxHealth / 5);
      for (let i = 0; i < heartCount; i++) {
        let value = Math.max(0, Math.min(5, this.player.health - 5 * i));
        const clip = textureHealth.getClip('' + value);
        clip.drawTo(rctx, 6 + 34 * i, 6);
      }
    });
  }

  renderMenu(rctx: RendererContext, menu: SelectMenu<MenuItem>, title: string) {
    rctx.run(({ ctx }) => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      ctx.fillRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);

      let x = SCENE_WIDTH / 2, y = 30;
      const { selectedItem } = menu;

      ctx.font = "12.5px 'Noto Sans SC'";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 2;
      ctx.fillStyle = "#999";
      ctx.fillText(title, x, y);
      y += 20;

      ctx.font = "5.25px 'Noto Sans SC'";
      for (const item of menu.getItems()) {
        ctx.fillStyle = item === selectedItem ?
          (this.totalTicks % 12 < 6 ? '#90d060' : '#f0e080') :
          (item.disabled ? '#999' : '#eee');
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
      `Health: ${this.player.health}/${this.player.maxHealth} Immune: ${this.player.immuneTicks}`,
      `Entities: ${this.entities.length}`
    ];
  }
}
