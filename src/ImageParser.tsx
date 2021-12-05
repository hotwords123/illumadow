import React from "react";
import './ImageParser.tsx';
import { MapData, MapTerrain, MapTerrainType } from "./map/interfaces";

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

interface ImageParserState {
  map: MapData | null;
}

export default class ImageParser extends React.Component<{}, ImageParserState> {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  constructor(props: {}) {
    super(props);

    this.state = {
      map: null
    };

    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d")!;

    this.fileHandler = this.fileHandler.bind(this);
  }

  async fileHandler(evt: React.FormEvent<HTMLInputElement>) {
    const input = evt.currentTarget;
    if (input.files?.length === 1) {
      const [file] = input.files;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      img.onload = () => {
        const map = this.parseImage(img, file.name.slice(0, file.name.indexOf('.')));
        this.setState({ map });
        URL.revokeObjectURL(url);
      };
    }
  }

  parseImage(img: HTMLImageElement, name: string): MapData {
    const { naturalWidth: imgWidth, naturalHeight: imgHeight } = img;
    if (imgWidth % 2 !== 0 || imgHeight % 2 !== 0)
      throw new Error("image size should be even");

    const mapWidth = imgWidth / 2;
    const mapHeight = imgHeight / 2;

    this.canvas.width = imgWidth;
    this.canvas.height = imgHeight;
    this.ctx.clearRect(0, 0, imgWidth, imgHeight);
    this.ctx.drawImage(img, 0, 0);

    const imgData = this.ctx.getImageData(0, 0, imgWidth, imgHeight);

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

    const mapName = prompt("Map name:", name) ?? name;

    const map: MapData = {
      id: mapName,
      width: mapWidth,
      height: mapHeight,
      terrain: mapTerrain,
      entities: [],
      triggers: []
    };

    console.log(map);

    return map;
  }

  render() {
    return (
      <div className="ImageParser">
        <div>
          <input type="file" onInput={this.fileHandler} />
        </div>
        <div>
          <textarea value={JSON.stringify(this.state.map)} readOnly />
        </div>
      </div>
    );
  }
}