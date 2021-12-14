import { Coord, Facing } from "../base/math";
import { MapTerrainType, TERRAIN_SIZE } from "../map/interfaces";
import Entity from "../model/Entity";
import Mob from "../model/Mob";
import { Terrain } from "../model/Terrain";
import LevelScene from "../scene/LevelScene";

export default class PlatformWalkGoal {
  constructor(private self: Mob) {}
  
  canPassThrough(terrain: Terrain | null) {
    return terrain === null;
  }
  canStandOn(terrain: Terrain | null) {
    return terrain && [MapTerrainType.brick, MapTerrainType.fragile].includes(terrain.type);
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
    let boxHeight = Math.ceil(this.self.collisionBox.height / TERRAIN_SIZE);
    for (let i = 1; i <= boxHeight && y - i >= 0; i++)
      if (!this.canPassThrough(scene.terrains[y - i][x]))
        return false;
    return true;
  }

  checkFoothold(scene: LevelScene, x: number, y: number) {
    return this.canStandOn(scene.terrains[y][x]) && this.checkEmptyArea(scene, x, y);
  }

  isConnected(scene: LevelScene, coord1: Coord, coord2: Coord) {
    // Check if they are at the same altitude
    let y = coord1.y;
    if (coord2.y !== y) return false;

    // Check if the platforms are connected
    let x1 = coord1.x, x2 = coord2.x;
    if (x1 > x2) [x1, x2] = [x2, x1];

    const ground = scene.terrains[y];
    const aboveGround = y < 1 ? null : scene.terrains[y - 1];

    for (let x = x1; x <= x2; x++) {
      let flag = this.canStandOn(ground[x]) &&
        (!aboveGround || this.canPassThrough(aboveGround[x]));
      if (!flag) return false;
    }
    return true;
  }

  keepDistance(scene: LevelScene, target: Entity, accel: number, maxSpeed: number, minDistance: number, maxDistance: number) {
    const { self } = this;
    let deltaX = target.x - self.x;

    // Update facing
    self.facing = deltaX > 0 ? Facing.right : Facing.left;

    // Check foothold
    const foothold = this.findFoothold(scene, self);
    if (!foothold) return;
    const footholdTarget = this.findFoothold(scene, target);
    if (!footholdTarget) return;

    // Check if on the same platform
    if (!this.isConnected(scene, foothold, footholdTarget))
      return;

    const box = self.collisionBox;
    let distance = Math.abs(deltaX);

    // Decide heading
    let heading: Facing;
    if (distance > maxDistance)
      heading = deltaX > 0 ? Facing.right : Facing.left;
    else if (distance < minDistance)
      heading = deltaX > 0 ? Facing.left : Facing.right;
    else
      return;

    const blockX = heading === Facing.right ?
      Math.ceil(box.right / TERRAIN_SIZE) - 1 :
      Math.floor(box.left / TERRAIN_SIZE);

    // Avoid getting out of the platform
    if (blockX >= 0 && blockX < scene.mapWidth && this.checkFoothold(scene, blockX, foothold.y)) {
      self.accelerate(heading, accel, maxSpeed);
    }
  }
}