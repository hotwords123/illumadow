import { Direction } from "../base";

export const MAP_GRID_SIZE = 8;

export interface MapEntry {
  id: string;
  class: string[];
}

export enum MapTerrainType {
  brick = "brick",
  spikes = "spikes",
  fragile = "fragile",
  supply = "supply"
}

export interface MapTerrain extends MapEntry {
  left: number;
  top: number;
  width: number;
  height: number;
  type: MapTerrainType;
  data?: any;
}

export interface MapTerrainBrick {
  texture: string;
}

export interface MapTerrainSpikes {
  side: Direction;
}

export interface MapTerrainFragile {
  texture: string;
}

export interface MapTerrainSupply {
}

export enum MapEntityType {
  player = "player",
  scout = "scout",
  guard = "guard",
  archer = "archer",
  wizard = "wizard",
  boss = "boss"
}

export interface MapEntity extends MapEntry {
  x: number;
  y: number;
  type: MapEntityType;
  data: any;
}

export interface MapEntityPlayer {
  health: number;
  maxHealth: number;
}

export interface MapEntityScout {
  health: number;
  maxHealth: number;
}

export interface MapTrigger extends MapEntry {
  criterion: null;
}

export interface MapData {
  id: string;
  width: number;
  height: number;
  terrains: MapTerrain[];
  entities: MapEntity[];
  triggers: MapTrigger[];
}
