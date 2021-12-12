import { AABB } from "../base/math";
import { MapTrigger, MapTriggerType } from "../map/interfaces";
import LevelScene from "./LevelScene";

export default abstract class Trigger {
  triggered = false;

  constructor(public id: string) {}

  static create(data: MapTrigger): Trigger {
    switch (data.condition.type) {
      case MapTriggerType.reachPlace:
        return new TriggerReachPlace(data.id, AABB.offset(...data.condition.place));

      case MapTriggerType.entityKilled:
        return new TriggerEntityKilled(data.id, data.condition.entityTag);

      default:
        throw new Error(`unknown trigger type: id=${data.id}`);
    }
  }

  abstract checkCondition(scene: LevelScene): boolean;

  tick(scene: LevelScene) {
    if (!this.triggered && this.checkCondition(scene)) {
      this.execute(scene);
    }
  }

  execute(scene: LevelScene) {
    switch (this.id) {
      default:
        console.warn(`unknown trigger id: ${this.id}`);
    }
  }
}

export class TriggerReachPlace extends Trigger {
  constructor(id: string, public box: AABB) {
    super(id);
  }

  checkCondition(scene: LevelScene) {
    return scene.player.collisionBox.intersects(this.box);
  }
}

export class TriggerEntityKilled extends Trigger {
  constructor(id: string, public entityTag: string) {
    super(id);
  }

  checkCondition(scene: LevelScene) {
    return scene.getEntitiesWithTag(this.entityTag).length === 0;
  }
}