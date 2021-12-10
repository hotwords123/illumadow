import { AABB, Axis, Coord, Side, DIRECTION_VECTORS, Vector, Direction } from "../base";
import Sprite from "./Sprite";
import imgBrick from "../assets/terrain/brick.png";
import imgSpikes from "../assets/terrain/spikes.png";
import imgWater from "../assets/terrain/water.png";
import { Texture, TextureLike, textureManager } from "../render/TextureManager";
import { MapTerrain, MapTerrainBrick, MapTerrainFragile, MapTerrainSpikes, MapTerrainType, MapTerrainWater, TERRAIN_SIZE } from "../map/interfaces";
import Entity from "./Entity";
import LevelScene from "../scene/LevelScene";
import Player from "./Player";
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
  textureBrick.defineClips([['brick', 'dirt', 'grass']], TERRAIN_SIZE, TERRAIN_SIZE);
  textureSpikes.defineClips([['bottom', 'left', 'top', 'right']], TERRAIN_SIZE, TERRAIN_SIZE);
  textureWater.defineClips([['surface', 'under']], TERRAIN_SIZE, TERRAIN_SIZE);
});

export abstract class Terrain extends Sprite {
  constructor(position: Coord, public texture: TextureLike) {
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
        } else if (oldBox.left >= selfBox.right && newBox.left <= selfBox.right) {
          vel.x = 0;
          pos.x -= newBox.left - selfBox.right;
          this.onCollideEntity(scene, entity, Side.right);
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
        } else if (oldBox.top >= selfBox.bottom && newBox.top <= selfBox.bottom) {
          vel.y = 0;
          pos.y -= newBox.top - selfBox.bottom;
          this.onCollideEntity(scene, entity, Side.bottom);
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
    dirt: "terrain/brick:dirt",
    grass: "terrain/brick:grass",
    tree: "decoration/tree:platform"
  };

  constructor(position: Coord, public variant: string) {
    super(position, textureManager.get(TerrainBrick.TEXTURE_MAP[variant])!);
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
   * Returns the amount of damage entity will take if it touches `hurtBox`.
   */
  abstract hurtEntityAmount(entity: Entity): number;

  /**
   * Will hurt the entity if it touches `hurtBox`.
   */
  interactEntity(scene: LevelScene, entity: Entity) {
    const amount = this.hurtEntityAmount(entity);
    if (amount > 0 && this.hurtBox?.intersects(entity.hurtBox))
      entity.damage(scene, amount);
  }
}

export class TerrainSpikes extends HarmingTerrain {
  constructor(position: Coord, public side: Side) {
    super(position, textureSpikes.getClip(Side[side])!)
  }

  get hurtBox() {
    switch (this.side) {
      case Side.left:
        return this.center.plus2(-3, 0).expand(1, 3);
      case Side.top:
        return this.center.plus2(0, -3).expand(3, 1);
      case Side.right:
        return this.center.plus2(3, 0).expand(1, 3);
      case Side.bottom:
        return this.center.plus2(0, 3).expand(3, 1);
    }
  }

  hurtEntityAmount(entity: Entity) {
    if (entity instanceof Player)
      return 1;
    else
      return Infinity;
  }

  render(rctx: RendererContext) {
    super.render(rctx);
    if (rctx.debug) {
      const { ctx, pixelSize } = rctx;
      const { hurtBox: hbox } = this;
      ctx.lineWidth = 2 / pixelSize;
      ctx.strokeStyle = '#f00';
      ctx.strokeRect(hbox.left, hbox.top, hbox.width, hbox.height);
    }
  }
}

export class TerrainWater extends HarmingTerrain {
  constructor(position: Coord, public surface: boolean) {
    super(position, textureWater.getClip(surface ? "surface" : "under")!);
  }

  get hurtBox() {
    return this.center.expand(4, this.surface ? 2 : 4, 4, 4);
  }

  hurtEntityAmount(entity: Entity) {
    if (entity instanceof Player)
      return 1;
    else
      return Infinity;
  }
}

abstract class FragileTerrain extends Terrain {
  /** ticks complete destruction take */
  collapseTicks: number;
  /** ticks having been collapsing */
  collapsingTicks = -1;

  constructor(position: Coord, texture: TextureLike, collapseTicks: number) {
    super(position, texture);
    this.collapseTicks = collapseTicks;
  }

  onCollideEntity(scene: LevelScene, entity: Entity, side: Side) {
    if (side === Side.top && entity instanceof Player) {
      this.collapse();
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
      if (this.collapsingTicks === this.collapseTicks)
        scene.deleteTerrain(this.position);
    }
  }
}

export class TerrainFragile extends FragileTerrain {
  static TEXTURE_MAP: Record<string, string> = {
    tree: "decoration/tree:platform-fragile"
  };

  constructor(position: Coord, public variant: string) {
    super(position, textureManager.get(TerrainFragile.TEXTURE_MAP[variant])!, 60);
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
