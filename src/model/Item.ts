import { AABB } from "../base/math";
import { MapEntityItem, MapItemType } from "../map/interfaces";
import Entity from "./Entity";
import imgFlower from "../assets/entity/flower.png";
import { Texture, textureManager } from "../render/TextureManager";
import LevelScene from "../scene/LevelScene";

let textureFlower: Texture;

textureManager.loadTextures([
  ["entity/flower", imgFlower]
]).then(textures => {
  [textureFlower] = textures;
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
        return new ItemFlower(data);
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
  get collisionBoxR() {
    return new AABB(-4, -8, 4, 0);
  }

  getRenderInfoR() {
    return {
      box: this.collisionBoxR,
      texture: textureFlower
    };
  }

  onPickup(scene: LevelScene) {
    if (scene.player.cure(scene, 2)) {
      super.onPickup(scene);
    }
  }
}