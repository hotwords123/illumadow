import React from "react";
import { MapTerrain, TERRAIN_SIZE } from "../map/interfaces";
import { RendererContext } from "../render/Renderer";
import { Terrain } from "../scene/Terrain";

interface TerrainCanvasProps {
  width: number;
  height: number;
  scale: number;
  terrains: (MapTerrain | null)[][];
}

export default class TerrainCanvas extends React.PureComponent<TerrainCanvasProps> {
  refCanvas = React.createRef<HTMLCanvasElement>();

  componentDidMount() {
    const { width, height, scale, terrains } = this.props;

    if (width === 0 || height === 0)
      return;

    const canvas = this.refCanvas.current!;

    const canvasWidth = width * TERRAIN_SIZE * scale;
    const canvasHeight = height * TERRAIN_SIZE * scale;
    const ratio = window.devicePixelRatio;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.imageRendering = 'pixelated';
    canvas.style.width = canvasWidth / ratio + 'px';
    canvas.style.height = canvasHeight / ratio + 'px';

    const ctx = canvas.getContext('2d')!;
    const rctx: RendererContext = {
      ctx, pixelSize: scale, debug: true
    }

    ctx.imageSmoothingEnabled = false;

    ctx.save();
    ctx.scale(scale, scale);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const terrain = Terrain.create(x, y, terrains[y][x]);
        terrain?.render(rctx);
      }
    }

    ctx.restore();
  }

  render() {
    return (
      <canvas ref={this.refCanvas}></canvas>
    );
  }
}