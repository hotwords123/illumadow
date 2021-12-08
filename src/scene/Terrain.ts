import { AABB, Axis, Coord, Direction, DIRECTION_VECTORS, Vector } from "../base";
import Sprite from "../model/Sprite";
import imgBrick from "../assets/terrain/brick.png";
import imgSpikes from "../assets/terrain/spikes.png";
import { Texture, TextureLike, textureManager } from "../render/TextureManager";
import { MapTerrain, MapTerrainBrick, MapTerrainSpikes, MapTerrainType, TERRAIN_SIZE } from "../map/interfaces";
import Entity from "../model/Entity";
import LevelScene from "./LevelScene";
import Player from "../model/Player";
import { RendererContext } from "../render/Renderer";

let textureBrick: Texture;
let textureSpikes: Texture

textureManager.loadTextures([
  ["terrain/brick", imgBrick],
  ["terrain/spikes", imgSpikes]
]).then(textures => {
  [textureBrick, textureSpikes] = textures;
  textureBrick.defineClips([['brick', 'dirt', 'grass']], TERRAIN_SIZE, TERRAIN_SIZE);
  textureSpikes.defineClips([['bottom', 'left', 'top', 'right']], TERRAIN_SIZE, TERRAIN_SIZE);
});

export abstract class Terrain extends Sprite {
  constructor(position: Coord, public texture: TextureLike) {
    super(position);
  }

  static create(x: number, y: number, cell: MapTerrain | null): Terrain | null {
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
        } else if (oldBox.left >= selfBox.right && newBox.left <= selfBox.right) {
          vel.x = 0;
          pos.x -= newBox.left - selfBox.right;
        }
      }
    } else {
      // vertical movement
      if (newBox.horizontal.intersects(selfBox.horizontal)) {
        if (oldBox.bottom <= selfBox.top && newBox.bottom >= selfBox.top) {
          vel.y = 0;
          pos.y -= newBox.bottom - selfBox.top;
          entity.onGround = true;
        } else if (oldBox.top >= selfBox.bottom && newBox.top <= selfBox.bottom) {
          vel.y = 0;
          pos.y -= newBox.top - selfBox.bottom;
        }
      }
    }
  }
}

export class TerrainBrick extends Terrain {
  constructor(position: Coord, texture: string) {
    super(position, textureBrick.getClip(texture)!);
  }

  get collisionBox() {
    return this.boundingBox;
  }
}

export class TerrainSpikes extends Terrain {
  constructor(position: Coord, public side: Direction) {
    super(position, textureSpikes.getClip(Direction[side])!)
  }

  get hurtBox() {
    switch (this.side) {
      case Direction.left:
        return this.center.plus2(-3, 0).expand(1, 3);
      case Direction.top:
        return this.center.plus2(0, -3).expand(3, 1);
      case Direction.right:
        return this.center.plus2(3, 0).expand(1, 3);
      case Direction.bottom:
        return this.center.plus2(0, 3).expand(3, 1);
    }
  }

  hurtEntityAmount(entity: Entity) {
    if (entity instanceof Player)
      return 1;
    else
      return Infinity;
  }

  interactEntity(scene: LevelScene, entity: Entity) {
    const amount = this.hurtEntityAmount(entity);
    if (amount > 0 && this.hurtBox.intersects(entity.hurtBox))
      entity.damage(scene, amount);
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
