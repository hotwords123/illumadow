import { Direction } from "../base";

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
}

/* ======== Terrain ======== */

/** 地形格子所占像素数 */
export const TERRAIN_SIZE = 8;

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

/** 实心方块 */
export interface MapTerrainBrick extends MapTerrain {
  /** 砖块的材质名 */
  texture: string;
}

/** 尖刺 */
export interface MapTerrainSpikes extends MapTerrain {
  /** 尖刺吸附的边 */
  side: Direction;
}

/** 通行后坍塌的方块 */
export interface MapTerrainFragile extends MapTerrain {
  texture: string;
}

/* ======== Entity ======== */

export enum MapEntityType {
  player = "player",
  scout = "scout",
  guard = "guard",
  archer = "archer",
  wizard = "wizard",
  boss = "boss"
}

export interface MapEntity extends MapSprite {
  type: MapEntityType;
  [key: string]: any;
}

export interface MapEntityPlayer extends MapEntity {
  health: number;
  maxHealth: number;
}

/* ======== Decoration ======== */

export interface MapDecoration extends MapSprite {
  variant: string;
}

/* ======== Trigger ======== */

export interface MapTrigger {
  id: string;
}