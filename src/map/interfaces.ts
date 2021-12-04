import { Direction } from "../base";

export const MAP_GRID_SIZE = 8;

export enum MapTerrainType {
  brick = "brick",
  spikes = "spikes",
  fragile = "fragile",
  supply = "supply"
}

export interface MapTerrain {
  type: MapTerrainType;
  [key: string]: any;
}

export interface MapTerrainBrick extends MapTerrain {
  texture: string;
}

export interface MapTerrainSpikes extends MapTerrain {
  side: Direction;
}

export interface MapTerrainFragile extends MapTerrain {
  texture: string;
}

export enum MapEntityType {
  player = "player",
  scout = "scout",
  guard = "guard",
  archer = "archer",
  wizard = "wizard",
  boss = "boss"
}

export interface MapEntity {
  tags: string[];
  x: number;
  y: number;
  type: MapEntityType;
  [key: string]: any;
}

export interface MapEntityPlayer extends MapEntity {
  health: number;
  maxHealth: number;
}

export interface MapTrigger {
  id: string;
}

export interface MapData {
  id: string;
  width: number;
  height: number;
  terrain: (MapTerrain | null)[][];
  entities: MapEntity[];
  triggers: MapTrigger[];
}
