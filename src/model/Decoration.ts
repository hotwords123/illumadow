import { Coord } from "../base";
import { MapDecoration } from "../map/interfaces";
import Model from "./Model";

interface DecorationVariant {
  texture: string;
  clip: string;
  box: number[];
}

const VARIANTS = new Map<string, DecorationVariant>([
  ["tree-trunk", { texture: "tree", clip: "trunk", box: [-4, 8, 4, 0] }],
]);

export default class Decoration extends Model {
  variant: string;

  constructor({ variant, ...data }: MapDecoration) {
    super(data);

    this.variant = variant;
  }

  getRenderInfo() {
    return null;
  }
}
