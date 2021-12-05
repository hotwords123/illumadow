import { MapData } from "./interfaces";
import levelTest from "../assets/levels/test.json";

class LevelManager {
  levels = new Map<string, MapData>();

  addLevel(map: MapData) {
    this.levels.set(map.id, map);
    return this;
  }

  addLevels(maps: MapData[]) {
    for (const map of maps) this.addLevel(map);
  }

  get(name: string) {
    return this.levels.get(name);
  }
}

const levelManager = new LevelManager();

levelManager.addLevels([
  levelTest
] as any);

export default levelManager;
