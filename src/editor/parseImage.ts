import { MapData, MapDecoration, MapTerrain, MapTerrainType, TERRAIN_SIZE } from "../map/interfaces";

const COLORS = {
  'none': '#ffffff',
  'brick': '#880015',
  'dirt': '#b97a57',
  'grass': '#22b14c',
  'spikes': '#ed1c24',
  'trunk': '#382b18',
  'branch': '#987849',
  'water': '#99d9ea',
};

function parseHexColor(hex: string) {
  return parseInt(hex.slice(1), 16);
}

function toHexColor(color: number) {
  return '#' + color.toString(16).padStart(6, '0');
}

interface PatternContent {
  terrain: MapTerrain | null;
  decoration?: {
    x: number;
    y: number;
    variant: string;
  };
}

interface RawMatchPattern extends PatternContent {
  pixels: (keyof typeof COLORS)[];
}

interface MatchPattern extends PatternContent {
  pixels: number[];
}

const PATTERNS_RAW: RawMatchPattern[] = [
  // Empty
  {
    terrain: null,
    pixels: [
      'none', 'none',
      'none', 'none'
    ]
  },

  // Bricks
  {
    terrain: {
      type: MapTerrainType.brick,
      variant: "brick"
    },
    pixels: [
      'brick', 'brick',
      'brick', 'brick'
    ]
  },
  {
    terrain: {
      type: MapTerrainType.brick,
      variant: "dirt"
    },
    pixels: [
      'dirt', 'dirt',
      'dirt', 'dirt'
    ]
  },
  {
    terrain: {
      type: MapTerrainType.brick,
      variant: "grass"
    },
    pixels: [
      'grass', 'grass',
      'grass', 'grass'
    ]
  },

  // Spikes
  {
    terrain: {
      type: MapTerrainType.spikes,
      side: 0
    },
    pixels: [
      'spikes', 'none',
      'spikes', 'none'
    ]
  },
  {
    terrain: {
      type: MapTerrainType.spikes,
      side: 1
    },
    pixels: [
      'spikes', 'spikes',
      'none', 'none'
    ]
  },
  {
    terrain: {
      type: MapTerrainType.spikes,
      side: 2
    },
    pixels: [
      'none', 'spikes',
      'none', 'spikes'
    ]
  },
  {
    terrain: {
      type: MapTerrainType.spikes,
      side: 3
    },
    pixels: [
      'none', 'none',
      'spikes', 'spikes'
    ]
  },

  // Trunk
  {
    terrain: null,
    decoration: {
      x: 4, y: 4,
      variant: "trunk"
    },
    pixels: [
      'trunk', 'trunk',
      'trunk', 'trunk'
    ]
  },
  {
    terrain: null,
    decoration: {
      x: 4, y: 4,
      variant: "trunk-branch-r"
    },
    pixels: [
      'trunk', 'trunk',
      'trunk', 'none'
    ]
  },
  {
    terrain: null,
    decoration: {
      x: 4, y: 4,
      variant: "trunk-branch-l"
    },
    pixels: [
      'trunk', 'trunk',
      'none', 'trunk'
    ]
  },

  // Branch
  {
    terrain: null,
    decoration: {
      x: 4, y: 4,
      variant: "branch"
    },
    pixels: [
      'branch', 'branch',
      'branch', 'branch'
    ]
  },
  {
    terrain: null,
    decoration: {
      x: 4, y: 4,
      variant: "branch-end-r"
    },
    pixels: [
      'branch', 'none',
      'branch', 'none'
    ]
  },
  {
    terrain: null,
    decoration: {
      x: 4, y: 4,
      variant: "branch-end-l"
    },
    pixels: [
      'none', 'branch',
      'none', 'branch'
    ]
  },

  // Tree platform
  {
    terrain: {
      type: MapTerrainType.brick,
      variant: "tree"
    },
    pixels: [
      'trunk', 'trunk',
      'branch', 'branch'
    ]
  },
  {
    terrain: {
      type: MapTerrainType.fragile,
      variant: "tree"
    },
    pixels: [
      'trunk', 'trunk',
      'none', 'none'
    ]
  },

  // Water
  {
    terrain: {
      type: MapTerrainType.water,
      surface: true
    },
    pixels: [
      'none', 'none',
      'water', 'water'
    ]
  },
  {
    terrain: {
      type: MapTerrainType.water,
      surface: false
    },
    pixels: [
      'water', 'water',
      'water', 'water'
    ]
  },
] as RawMatchPattern[];

const PATTERNS: MatchPattern[] = PATTERNS_RAW.map(({ pixels, ...more }) => ({
  ...more,
  pixels: pixels.map(s => parseHexColor(COLORS[s]))
}));

function parseImage(img: HTMLImageElement, name: string): MapData {
  const { naturalWidth: imgWidth, naturalHeight: imgHeight } = img;
  if (imgWidth % 2 !== 0 || imgHeight % 2 !== 0)
    throw new Error("image size should be even");

  const mapWidth = imgWidth / 2;
  const mapHeight = imgHeight / 2;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  canvas.width = imgWidth;
  canvas.height = imgHeight;
  ctx.clearRect(0, 0, imgWidth, imgHeight);
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, imgWidth, imgHeight);

  const pixelAt = (x: number, y: number) => {
    const offset = (y * imgWidth + x) * 4;
    return (imgData.data[offset] << 16) |
      (imgData.data[offset + 1] << 8) |
      imgData.data[offset + 2];
  };

  const mapDecorations: MapDecoration[] = [];

  const mapTerrain: (MapTerrain | null)[][] = new Array(mapHeight).fill(null)
    .map((_, y) => new Array(mapWidth).fill(null)
    .map((_, x) => {
      const A = pixelAt(2 * x, 2 * y);
      const B = pixelAt(2 * x + 1, 2 * y);
      const C = pixelAt(2 * x, 2 * y + 1);
      const D = pixelAt(2 * x + 1, 2 * y + 1);

      for (const { terrain, decoration, pixels } of PATTERNS) {
        if (pixels[0] === A && pixels[1] === B && pixels[2] === C && pixels[3] === D) {
          if (decoration) {
            mapDecorations.push({
              x: x * TERRAIN_SIZE + decoration.x,
              y: y * TERRAIN_SIZE + decoration.y,
              tags: [],
              variant: decoration.variant
            });
          }
          return terrain;
        }
      }

      console.warn(`unknown pixel at (${x}, ${y}): ${[A, B, C, D].map(x => toHexColor(x)).join(' ')}`);
      return null;
    }));

  const map: MapData = {
    id: name,
    width: mapWidth,
    height: mapHeight,
    terrain: mapTerrain,
    entities: [],
    decorations: mapDecorations,
    triggers: [],
    backgrounds: []
  };

  console.log(map);

  return map;
}

export default parseImage;
