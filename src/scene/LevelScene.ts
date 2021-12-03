import { Coord } from "../base";
import Scene from "./Scene";
import LevelMap from "../map/LevelMap";
import Entity from "../model/Entity";
import Player from "../model/Player";
import { RendererContext } from "../render/Renderer";
import GameManager from "../GameManager";

export default class LevelScene extends Scene {
  player: Player;

  constructor(gameManager: GameManager, protected map: LevelMap) {
    super(gameManager);
    this.player = new Player(new Coord(0, 0));
  }

  render(rctx: RendererContext) {
    //
  }
}