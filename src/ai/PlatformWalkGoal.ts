import { Coord, Facing } from "../base";
import { TERRAIN_SIZE } from "../map/interfaces";
import Entity, { EntityWithFacing } from "../model/Entity";
import { Terrain, TerrainBrick } from "../model/Terrain";
import LevelScene from "../scene/LevelScene";

export default class PlatformWalkGoal {
  constructor(private self: Entity) {}
  
  canPassThrough(terrain: Terrain | null) {
    return terrain === null;
  }
  canStandOn(terrain: Terrain | null) {
    return terrain instanceof TerrainBrick;
  }

  findFoothold(scene: LevelScene, entity: Entity): Coord | null {
    const box = entity.collisionBox;
    let startY = Math.max(0, Math.ceil(box.bottom / TERRAIN_SIZE));
    let left = Math.max(0, Math.floor(box.left / TERRAIN_SIZE));
    let right = Math.min(scene.mapWidth, Math.ceil(box.right / TERRAIN_SIZE));
    for (let y = startY; y < scene.mapHeight; y++) {
      const row = scene.terrains[y].slice(left, right);
      const cell = row.find(x => this.canStandOn(x));
      if (cell) return cell.position.clone();
    }
    return null;
  }

  checkEmptyArea(scene: LevelScene, x: number, y: number) {
    let boxHeight = this.self.collisionBox.height;
    for (let i = 1; i <= boxHeight && y - i >= 0; i++)
      if (!this.canPassThrough(scene.terrains[y - i][x]))
        return false;
    return true;
  }

  checkFoothold(scene: LevelScene, x: number, y: number) {
    return this.canStandOn(scene.terrains[y][x]) && this.checkEmptyArea(scene, x, y);
  }

  walkTowards(scene: LevelScene, target: Entity, accel: number, maxSpeed: number, minDistance: number) {
    const { self } = this;
    
    let deltaX = target.x - self.x;

    // Too close horizontally
    if (Math.abs(deltaX) < maxSpeed) return;

    // Update facing
    if (self instanceof EntityWithFacing)
      self.facing = deltaX > 0 ? Facing.right : Facing.left;

    // Already reached target
    if (target.position.diff(self.position).length <= minDistance)
      return;

    // Check foothold
    const foothold = this.findFoothold(scene, self);
    if (!foothold) return;

    const box = self.collisionBox;
    const blockX = deltaX > 0 ? Math.ceil(box.right / TERRAIN_SIZE) - 1 : Math.floor(box.left / TERRAIN_SIZE);

    // Avoid getting out of the platform
    if (blockX >= 0 && blockX < scene.mapWidth && this.checkFoothold(scene, blockX, foothold.y)) {
      self.accelerate(deltaX > 0 ? Facing.right : Facing.left, accel, maxSpeed);
    }
  }
}