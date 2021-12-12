import { AABB } from "../base/math";
import { MapEntityItem, MapEntityItemFlower, MapItemType } from "../map/interfaces";
import Entity from "./Entity";
import imgFlower from "../assets/entity/flower.png";
import { Texture, TextureLike, textureManager } from "../render/TextureManager";
import LevelScene from "../scene/LevelScene";

let textureFlower: Texture;

textureManager.loadTextures([
  ["entity/flower", imgFlower]
]).then(textures => {
  [textureFlower] = textures;
  textureFlower.defineClips([["big", "small"]], 8, 8);
});

export default abstract class EntityItem extends Entity {
  item: MapItemType;

  constructor(data: MapEntityItem) {
    super(data);

    this.item = data.item;
  }

  isItem() { return true; }

  static create(data: MapEntityItem) {
    switch (data.item) {
      case MapItemType.flower:
        return new ItemFlower(data as MapEntityItemFlower);
    }
  }

  get underGravity() { return false; }

  tick(scene: LevelScene) {
    if (scene.player.collisionBox.intersects(this.collisionBox)) {
      this.onPickup(scene);
    }
  }

  /**
   * Called when the item will be picked up by the player.
   */
  onPickup(scene: LevelScene) {
    scene.deleteEntity(this);
  }
}

export class ItemFlower extends EntityItem {
  double: boolean;
  texture: TextureLike;

  constructor(data: MapEntityItemFlower) {
    super(data);
    this.double = data.double;
    this.texture = textureFlower.getClip(this.double ? "big" : "small");
  }

  get collisionBoxR() {
    return new AABB(-4, -8, 4, 0);
  }

  getRenderInfoR() {
    return {
      box: this.collisionBoxR,
      texture: this.texture
    };
  }

  onPickup(scene: LevelScene) {
    if (scene.player.cure(scene, this.double ? 2 : 1)) {
      super.onPickup(scene);
    }
  }
}