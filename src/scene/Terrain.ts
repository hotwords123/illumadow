import { AABB, Coord, Direction } from "../base";
import Sprite from "../model/Sprite";
import imgBrick from "../assets/terrain/brick.png";
import imgSpikes from "../assets/terrain/spikes.png";
import { Texture, TextureLike, textureManager } from "../render/TextureManager";

export const TERRAIN_SIZE = 8;

let textureBrick: Texture;
let textureSpikes: Texture

textureManager.loadTextures([imgBrick, imgSpikes]).then(textures => {
  [textureBrick, textureSpikes] = textures;
  textureBrick.defineClips([['brick', 'dirt', 'grass']], TERRAIN_SIZE, TERRAIN_SIZE);
  textureSpikes.defineClips([['bottom', 'left', 'top', 'right']], TERRAIN_SIZE, TERRAIN_SIZE);
});

export abstract class Terrain extends Sprite {
  constructor(position: Coord, protected texture: TextureLike) {
    super(position);
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
}

export class TerrainBrick extends Terrain {
  constructor(position: Coord, texture: string) {
    super(position, textureBrick.getClip(texture)!);
  }
}

export class TerrainSpikes extends Terrain {
  constructor(position: Coord, public side: Direction) {
    super(position, textureSpikes.getClip(Direction[side])!)
  }
}
