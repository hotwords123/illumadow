import { MapTrigger, MapTriggerType } from "../map/interfaces";
import LevelScene from "./LevelScene";
import { STRINGS } from "./Subtitle";

export default abstract class Trigger {
  triggered = false;

  constructor(public id: string) {}

  static create(data: MapTrigger): Trigger {
    switch (data.condition.type) {
      case MapTriggerType.reachPlace:
        return new TriggerReachPlace(data.id, data.condition.landmarkTag);

      case MapTriggerType.entityKilled:
        return new TriggerEntityKilled(data.id, data.condition.entityTag);

      default:
        throw new Error(`unknown trigger type: id=${data.id}`);
    }
  }

  abstract checkCondition(scene: LevelScene): boolean;

  tick(scene: LevelScene) {
    if (!this.triggered && this.checkCondition(scene)) {
      this.triggered = true;
      this.execute(scene);
    }
  }

  execute(scene: LevelScene) {
    console.log(`triggered: ${this.id}`);
    switch (this.id) {
      case "level1:1":
        scene.boundary.right = scene.getLandmark("L2").box.right;
        scene.showSubtitle(STRINGS["first-enemy"], 150);
        break;
      case "level1:2":
        scene.boundary.right = scene.getLandmark("L4").box.right;
        break;
      case "level1:3": {
        const { box } = scene.getLandmark("L3");
        scene.boundary.left = box.left;
        scene.boundary.bottom = box.bottom;
        scene.boundary.right = scene.getLandmark("L5").box.right;
        break;
      }
      case "level1:4":
        scene.boundary.right = scene.getLandmark("L6").box.right;
        break;
      case "level1:5":
        scene.boundary.right = scene.getLandmark("L9").box.right;
        break;
      case "level1:6":
        scene.boundary.left = scene.getLandmark("L7").box.left;
        break;
      case "level1:7":
        scene.boundary.right = scene.width;
        break;
      case "level1:8":
        scene.levelComplete();
        break;
      case "level1:9":
        scene.showSubtitle(STRINGS["level1-start"], 180);
        break;
      case "level1:10":
        scene.showSubtitle(STRINGS["flower"], 120);
        break;
      case "level1:11":
        scene.showSubtitle(STRINGS["level1-end"], 240);
        break;

      default:
        console.warn(`unknown trigger id: ${this.id}`);
    }
  }
}

export class TriggerReachPlace extends Trigger {
  constructor(id: string, public landmarkTag: string) {
    super(id);
  }

  checkCondition(scene: LevelScene) {
    return scene.getLandmarksWithTag(this.landmarkTag)
      .some(landmark => scene.player.collisionBox.intersects(landmark.box));
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