import { MapData } from "./interfaces";
import levelTest from "../assets/levels/test.json";
import level1_1 from "../assets/levels/1-1.json";

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
  levelTest,
  level1_1
] as any);

export default levelManager;
