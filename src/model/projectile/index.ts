import { Coord, Side } from "../../base/math";
import { MapEntityType } from "../../map/interfaces";
import { RendererContext } from "../../render/Renderer";
import LevelScene from "../../scene/LevelScene";
import Entity, { EscapeBehaviour } from "../Entity";
import Mob from "../Mob";

export default abstract class Projectile extends Entity {
  constructor(position: Coord, type: MapEntityType, public owner: Mob | null) {
    super({ x: position.x, y: position.y, tags: [], type });
  }

  isProjectile() { return true; }

  get underGravity() { return false; }

  /**
   * Called when Projectile hits a Mob.
   * @returns whether Projectile should be destroyed
   */
  abstract onHitMob(scene: LevelScene, mob: Mob): boolean;

  /**
   * Destroy this Projectile and remove it from the world.
   */
  destroy(scene: LevelScene) {
    scene.deleteEntity(this);
  }

  tick(scene: LevelScene) {
    super.tick(scene);

    for (const entity of scene.entities) {
      if (entity.isMob()) {
        if (this.collisionBox.intersects(entity.hurtBox) && this.onHitMob(scene, entity)) {
          this.destroy(scene);
          break;
        }
      }
    }
  }

  onCrossBorder(scene: LevelScene, side: Side, fullOut: boolean) {
    switch (side) {
      case Side.top:
        return EscapeBehaviour.none;
      default:
        return EscapeBehaviour.delete;
    }
  }

  render(rctx: RendererContext) {
    super.render(rctx);
    rctx.run(({ ctx, pixelSize, debug }) => {
      if (debug) {
        const hbox = this.collisionBox;
        if (hbox) {
          ctx.lineWidth = 2 / pixelSize;
          ctx.strokeStyle = '#f00';
          ctx.strokeRect(hbox.left, hbox.top, hbox.width, hbox.height);
        }
      }
    });
  }
}