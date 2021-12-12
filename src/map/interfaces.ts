import { Side } from "../base/math";

/* ======== Map ======== */

/**
 * 地图中非地形元素
 */
export interface MapSprite {
  /** 元素标签，用于查找指定元素 */
  tags: string[];
  x: number;
  y: number;
}

/**
 * 地图数据
 */
export interface MapData {
  id: string;
  width: number;
  height: number;

  /** 地形，terrain[y][x] */
  terrain: (MapTerrain | null)[][];
  /** 实体（包含玩家） */
  entities: MapEntity[];
  /** 装饰性元素 */
  decorations: MapDecoration[];
  /** 触发器 */
  triggers: MapTrigger[];
  /** 背景 */
  backgrounds: MapBackground[];
  /** 地标 */
  landmarks: MapLandmark[];
  /** 重生点 */
  spawnPoints: MapSpawnPoint[];
}

/* ======== Terrain ======== */

/** 地形格子所占像素数 */
export const TERRAIN_SIZE = 8;

export enum MapTerrainType {
  brick = "brick",
  spikes = "spikes",
  fragile = "fragile",
  water = "water"
}

export interface MapTerrain {
  type: MapTerrainType;
}

/** 实心方块 */
export interface MapTerrainBrick extends MapTerrain {
  /** 砖块的种类 */
  variant: string;
}

/** 尖刺 */
export interface MapTerrainSpikes extends MapTerrain {
  /** 尖刺吸附的边 */
  side: Side;
}

/** 通行后坍塌的方块 */
export interface MapTerrainFragile extends MapTerrain {
  variant: string;
}

/** 水体 */
export interface MapTerrainWater extends MapTerrain {
  /** 是否为水面 */
  surface: boolean;
}

/* ======== Entity ======== */

export enum MapEntityType {
  /** Mob */
  player = "player",
  scout = "scout",
  guard = "guard",
  archer = "archer",
  wizard = "wizard",
  boss = "boss",

  /** Projectile */
  arrow = "arrow",

  /** Item */
  item = "item"
}

export interface MapEntity extends MapSprite {
  type: MapEntityType;
  [key: string]: any;
}

export interface MapEntityPlayer extends MapEntity {
  health: number;
  maxHealth: number;
}

export enum MapItemType {
  flower = "flower"
}

export interface MapEntityItem extends MapEntity {
  item: MapItemType;
}

export interface MapEntityItemFlower extends MapEntityItem {
  double: boolean;
}

/* ======== Decoration ======== */

export interface MapDecoration extends MapSprite {
  variant: string;
}

/* ======== Trigger ======== */

export interface MapTrigger {
  id: string;
  condition: MapTriggerCondition;
}

export enum MapTriggerType {
  reachPlace = "reachPlace",
  entityKilled = "entityKilled"
}

export type MapTriggerCondition = {
  type: MapTriggerType.reachPlace,
  landmarkTag: string;
} | {
  type: MapTriggerType.entityKilled;
  entityTag: string;
};

/* ======== Background ======== */

export interface MapBackground {
  picture: string;
  opacity: number;
  horizontal: MapBackgroundAxis;
  vertical: MapBackgroundAxis;
}

export type MapBackgroundAxis = {
  repeat: true;
  factor: number;
  offset: number;
} | {
  repeat: false;
  marginL: number;
  marginR: number;
}

/* ======== Landmark ======== */

export interface MapLandmark extends MapSprite {
  width: number;
  height: number;
}

/* ======== Spawn Point ======== */

export interface MapSpawnPoint extends MapSprite {
}