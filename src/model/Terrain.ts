import { AABB, Axis, Coord, Side, Vector } from "../base/math";
import Sprite from "./Sprite";
import imgBrick from "../assets/terrain/brick.png";
import imgSpikes from "../assets/terrain/spikes.png";
import imgWater from "../assets/terrain/water.png";
import { Texture, TextureLike, textureManager } from "../render/TextureManager";
import { MapEntityType, MapTerrain, MapTerrainBrick, MapTerrainFragile, MapTerrainSpikes, MapTerrainType, MapTerrainWater, TERRAIN_SIZE } from "../map/interfaces";
import Entity from "./Entity";
import LevelScene from "../scene/LevelScene";
import { RendererContext } from "../render/Renderer";

let textureBrick: Texture;
let textureSpikes: Texture;
let textureWater: Texture;

textureManager.loadTextures([
  ["terrain/brick", imgBrick],
  ["terrain/spikes", imgSpikes],
  ["terrain/water", imgWater],
]).then(textures => {
  [textureBrick, textureSpikes, textureWater] = textures;
  textureBrick.defineClips([['dirt', 'grass', 'wood','brick']], TERRAIN_SIZE, TERRAIN_SIZE);
  textureSpikes.defineClips([['bottom', 'left', 'top', 'right']], TERRAIN_SIZE, TERRAIN_SIZE);
  textureWater.defineClips([['surface', 'under']], TERRAIN_SIZE, TERRAIN_SIZE);
});

export abstract class Terrain extends Sprite {
  constructor(position: Coord, public type: MapTerrainType, public texture: TextureLike) {
    if (!texture)
      throw new Error("texture should not be null");
    super(position);
  }

  static create(x: number, y: number, cell: MapTerrain | null): Terrain | null {
    if (!cell) return null;
    const coord = new Coord(x, y);
    switch (cell.type) {
      case MapTerrainType.brick: {
        const c = cell as MapTerrainBrick;
        return new TerrainBrick(coord, c.variant);
      }

      case MapTerrainType.spikes: {
        const c = cell as MapTerrainSpikes;
        return new TerrainSpikes(coord, c.side);
      }

      case MapTerrainType.fragile: {
        const c = cell as MapTerrainFragile;
        return new TerrainFragile(coord, c.variant);
      }

      case MapTerrainType.water: {
        const c = cell as MapTerrainWater;
        return new TerrainWater(coord, c.surface);
      }

      default:
        console.warn(`terrain (${x}, ${y}): unknown type: ${cell.type}`);
        return null;
    }
  }

  get center() {
    return new Coord((this.x + 0.5) * TERRAIN_SIZE, (this.y + 0.5) * TERRAIN_SIZE);
  }

  get boundingBox() {
    return AABB.offset(this.x * TERRAIN_SIZE, this.y * TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SIZE);
  }

  canCollideWith(entity: Entity) {
    return true;
  }

  get collisionBox(): AABB | null {
    return null;
  }

  setTexture(texture: TextureLike) {
    this.texture = texture;
  }

  getRenderInfo() {
    return {
      box: AABB.offset(
        this.x * TERRAIN_SIZE,
        this.y * TERRAIN_SIZE,
        TERRAIN_SIZE, TERRAIN_SIZE
      ),
      texture: this.texture
    }
  }

  tick(scene: LevelScene) {}

  interactEntity(scene: LevelScene, entity: Entity) {}

  collideEntity(scene: LevelScene, entity: Entity, axis: Axis) {
    if (!this.canCollideWith(entity)) return;

    const selfBox = this.collisionBox;
    if (!selfBox) return;

    const
      vel = entity.velocity,
      pos = entity.position,
      oldBox = entity.oldCollisionBox,
      newBox = entity.collisionBox;

    if (axis === Axis.x) {
      // horizontal movement
      if (newBox.vertical.intersects(selfBox.vertical)) {
        if (oldBox.right <= selfBox.left && newBox.right >= selfBox.left) {
          vel.x = 0;
          pos.x -= newBox.right - selfBox.left;
          this.onCollideEntity(scene, entity, Side.left);
          entity.onCollideTerrain(scene, this, Side.right);
        } else if (oldBox.left >= selfBox.right && newBox.left <= selfBox.right) {
          vel.x = 0;
          pos.x -= newBox.left - selfBox.right;
          this.onCollideEntity(scene, entity, Side.right);
          entity.onCollideTerrain(scene, this, Side.left);
        }
      }
    } else {
      // vertical movement
      if (newBox.horizontal.intersects(selfBox.horizontal)) {
        if (oldBox.bottom <= selfBox.top && newBox.bottom >= selfBox.top) {
          vel.y = 0;
          pos.y -= newBox.bottom - selfBox.top;
          entity.onGround = true;
          this.onCollideEntity(scene, entity, Side.top);
          entity.onCollideTerrain(scene, this, Side.bottom);
        } else if (oldBox.top >= selfBox.bottom && newBox.top <= selfBox.bottom) {
          vel.y = 0;
          pos.y -= newBox.top - selfBox.bottom;
          this.onCollideEntity(scene, entity, Side.bottom);
          entity.onCollideTerrain(scene, this, Side.top);
        }
      }
    }
  }

  /**
   * Triggered when colliding with entities.
   */
  onCollideEntity(scene: LevelScene, entity: Entity, side: Side) {}
}

export class TerrainBrick extends Terrain {
  static TEXTURE_MAP: Record<string, string> = {
    brick: "terrain/brick:brick",
    wood: "terrain/brick:wood",
    dirt: "terrain/brick:dirt",
    grass: "terrain/brick:grass",
    tree: "decoration/tree:platform",
  };

  constructor(position: Coord, public variant: string) {
    super(position, MapTerrainType.brick, textureManager.get(TerrainBrick.TEXTURE_MAP[variant])!);
  }

  get collisionBox() {
    switch (this.variant) {
      case "tree":
        return this.center.expand(4, 4, 4, 2);
      default:
        return this.boundingBox;
    }
  }
}

abstract class HarmingTerrain extends Terrain {
  /**
   * Returns the hurting box of this block, `null` for no-hurting.
   */
  abstract get hurtBox(): AABB | null;

  /**
   * Called when the `collisionBox` of an Entity touches `hurtBox`.
   */
  abstract onHurtEntity(scene: LevelScene, entity: Entity): void;

  /**
   * Will hurt the entity if it touches `hurtBox`.
   */
  interactEntity(scene: LevelScene, entity: Entity) {
    if (entity.isMob()) {
      if (this.hurtBox?.intersects(entity.hurtBox))
        this.onHurtEntity(scene, entity);
    } else if (entity.isProjectile()) {
      if (this.hurtBox?.intersects(entity.collisionBox))
        this.onHurtEntity(scene, entity);
    }
  }

  render(rctx: RendererContext) {
    super.render(rctx);
    rctx.run(({ ctx, pixelSize, debug }) => {
      if (debug) {
        const hbox = this.hurtBox;
        if (hbox) {
          ctx.lineWidth = 2 / pixelSize;
          ctx.strokeStyle = '#f00';
          ctx.strokeRect(hbox.left, hbox.top, hbox.width, hbox.height);
        }
      }
    });
  }
}

export class TerrainSpikes extends HarmingTerrain {
  constructor(position: Coord, public side: Side) {
    super(position, MapTerrainType.spikes, textureSpikes.getClip(Side[side])!)
  }

  get hurtBox(): AABB {
    switch (this.side) {
      case Side.left:
        return this.center.plus2(-3, 0).expand(1, 3);
      case Side.top:
        return this.center.plus2(0, -3).expand(3, 1);
      case Side.right:
        return this.center.plus2(3, 0).expand(1, 3);
      case Side.bottom:
        return this.center.plus2(0, 3).expand(3, 1);
      default:
        throw new Error(`unknown side: ${this.side}`);
    }
  }

  onHurtEntity(scene: LevelScene, entity: Entity) {
    if (entity.isPlayer()) {
      entity.damage(scene, 1, this);
    } else if (entity.isMob()) {
      entity.damage(scene, entity.type === MapEntityType.witch ? 1 : Infinity, this);
    } else if (entity.isProjectile()) {
      entity.destroy(scene);
    }
  }
}

export class TerrainWater extends HarmingTerrain {
  constructor(position: Coord, public surface: boolean) {
    super(position, MapTerrainType.water, textureWater.getClip(surface ? "surface" : "under")!);
  }

  get hurtBox() {
    return this.center.expand(4, this.surface ? 2 : 4, 4, 4);
  }

  onHurtEntity(scene: LevelScene, entity: Entity) {
    if (entity.isPlayer()) {
      entity.damage(scene, 1, this);
    } else if (entity.isMob()) {
      entity.damage(scene, Infinity, this);
    } else if (entity.isProjectile()) {
      entity.destroy(scene);
    }
  }
}

abstract class FragileTerrain extends Terrain {
  /** ticks complete destruction take */
  collapseTicks: number;
  /** ticks having been collapsing */
  collapsingTicks = -1;

  collapsed = false;

  constructor(position: Coord, type: MapTerrainType, texture: TextureLike, collapseTicks: number) {
    super(position, type, texture);
    this.collapseTicks = collapseTicks;
  }

  onCollideEntity(scene: LevelScene, entity: Entity, side: Side) {
    if (side === Side.top && entity.isPlayer()) {
      this.collapse();
      for (let x = this.x - 1; x >= 0; x--) {
        const terrain = scene.terrains[this.y][x];
        if (!(terrain instanceof FragileTerrain)) break;
        terrain.collapse();
      }
      for (let x = this.x + 1; x < scene.mapWidth; x++) {
        const terrain = scene.terrains[this.y][x];
        if (!(terrain instanceof FragileTerrain)) break;
        terrain.collapse();
      }
    }
  }

  /**
   * Make the block start to collapse.
   */
  collapse() {
    if (this.collapsingTicks < 0)
      this.collapsingTicks = 0;
  }

  tick(scene: LevelScene) {
    if (this.collapsingTicks >= 0) {
      this.collapsingTicks++;
      if (this.collapsingTicks === this.collapseTicks) {
        this.collapsingTicks = -1;
        this.collapsed = true;
        this.onCollapsed(scene);
      }
    }
  }

  onCollapsed(scene: LevelScene) {
    scene.deleteTerrain(this.position);
  }
}

export class TerrainFragile extends FragileTerrain {
  collapseOffset = new Vector(0, 0);

  recoveringTicks = -1;
  recoverTicks = 180;

  static TEXTURE_MAP: Record<string, string> = {
    tree: "decoration/tree:platform-fragile"
  };

  constructor(position: Coord, public variant: string) {
    super(position, MapTerrainType.fragile, textureManager.get(TerrainFragile.TEXTURE_MAP[variant])!, 60);
  }

  get terrainBox() {
    switch (this.variant) {
      case "tree":
        return this.center.expand(4, 4, 4, 2);
      default:
        return this.boundingBox;
    }
  }

  get collisionBox() {
    return this.collapsed ? null : this.terrainBox;
  }

  tick(scene: LevelScene) {
    if (this.collapsed) {
      this.recoveringTicks++;
      if (this.recoveringTicks >= this.recoverTicks) {
        if (!scene.getEntitiesInArea(this.terrainBox).length) {
          this.recoveringTicks = -1;
          this.collapsed = false;
        }
      }
    } else if (this.collapsingTicks > 0 && this.collapsingTicks % 3 === 0) {
      this.collapseOffset.x = Math.floor(Math.random() * 3) - 1;
      this.collapseOffset.y = Math.floor(Math.random() * 3) - 1;
    }
    super.tick(scene);
  }

  onCollapsed(scene: LevelScene) {
    this.recoveringTicks = 0;
  }

  getRenderInfo() {
    let { box, texture } = super.getRenderInfo();
    if (this.collapsingTicks >= 0) {
      box = box.offset(this.collapseOffset);
    }
    return { box, texture };
  }

  render(rctx: RendererContext) {
    rctx.run(({ ctx }) => {
      if (this.collapsed)
        ctx.globalAlpha = 0.4;
      super.render(rctx);
    });
  }
}
