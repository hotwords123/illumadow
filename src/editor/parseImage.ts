import { MapData, MapTerrain, MapTerrainType } from "../map/interfaces";

const COLORS = {
  'none': '#ffffff',
  'brick': '#880015',
  'dirt': '#b97a57',
  'grass': '#22b14c',
  'spikes': '#ed1c24'
};

function parseHexColor(hex: string) {
  return parseInt(hex.slice(1), 16);
}

function toHexColor(color: number) {
  return '#' + color.toString(16).padStart(6, '0');
}

interface RawMatchPattern {
  terrain: MapTerrain | null;
  pixels: (keyof typeof COLORS)[];
}

interface MatchPattern {
  terrain: MapTerrain | null;
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
      texture: "brick"
    },
    pixels: [
      'brick', 'brick',
      'brick', 'brick'
    ]
  },
  {
    terrain: {
      type: MapTerrainType.brick,
      texture: "dirt"
    },
    pixels: [
      'dirt', 'dirt',
      'dirt', 'dirt'
    ]
  },
  {
    terrain: {
      type: MapTerrainType.brick,
      texture: "grass"
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
];

const PATTERNS: MatchPattern[] = PATTERNS_RAW.map(({ terrain, pixels }) => ({
  terrain,
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

  const mapTerrain: (MapTerrain | null)[][] = new Array(mapHeight).fill(null)
    .map((_, y) => new Array(mapWidth).fill(null)
    .map((_, x) => {
      const A = pixelAt(2 * x, 2 * y);
      const B = pixelAt(2 * x + 1, 2 * y);
      const C = pixelAt(2 * x, 2 * y + 1);
      const D = pixelAt(2 * x + 1, 2 * y + 1);

      for (const { terrain, pixels } of PATTERNS) {
        if (pixels[0] === A && pixels[1] === B && pixels[2] === C && pixels[3] === D)
          return terrain;
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
    decorations: [],
    triggers: []
  };

  console.log(map);

  return map;
}

export default parseImage;
