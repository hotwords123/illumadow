
import { AABB, Coord, Vector } from "../base";
import { RendererContext } from "../render/Renderer";
import LevelScene from "./LevelScene";
import { SCENE_WIDTH, SCENE_HEIGHT } from "./Scene";

const ORIGIN_CENTER = new Coord(SCENE_WIDTH / 2, SCENE_HEIGHT / 2);
const ORIGIN_BOX = AABB.origin(SCENE_WIDTH, SCENE_HEIGHT);

const
  FOCUS_ANCHOR_L = 100,
  FOCUS_ANCHOR_R = 200,
  WINDOW_ANCHOR_L = 130,
  WINDOW_ANCHOR_R = 170,
  MAX_ACCEL = 3,
  MIN_SPEED = 0.03,
  MAX_SPEED = 4,
  LERP_PROPORTION = 0.08;

enum Facing { left, right }
enum CameraState { still, accelerating, decelerating }

export default class Camera {
  offset = new Vector(0, 0);
  velocity = new Vector(0, 0);
  facing = Facing.right;
  state = CameraState.still;

  constructor(private scene: LevelScene) {
    this.update(true);
  }

  get viewBox() {
    return ORIGIN_BOX.offset(this.offset.x, this.offset.y);
  }

  /**
   * Update the camera.
   * @param init Whether to ignore previous position and facing.
   */
  update(init = false) {
    /** Player position  */
    const playerPos = this.scene.player.position;
    const playerPosOld = this.scene.player.oldPosition;
    /** Player position relative to the camera */
    const playerOffset = playerPos.minus(this.offset);
    const playerOffsetOld = playerPosOld.minus(this.offset);
    const sceneWidth = this.scene.width, sceneHeight = this.scene.height;

    if (sceneWidth <= SCENE_WIDTH) {
      // Scene too small, just put it in the center
      this.offset.x = (SCENE_WIDTH - sceneWidth) / 2;
      this.state = CameraState.still;
    } else {
      // Decide facing
      if (init) {
        // Set facing to right initially
        this.facing = Facing.right;
      } else {
        // Change facing if player has crossed the focus anchor
        if (this.facing === Facing.right) {
          if (playerOffsetOld.x >= FOCUS_ANCHOR_L && playerOffset.x < FOCUS_ANCHOR_L)
            this.facing = Facing.left;
        } else {
          if (playerOffsetOld.x <= FOCUS_ANCHOR_R && playerOffset.x > FOCUS_ANCHOR_R)
            this.facing = Facing.right;
        }
      }

      /** Target absolute offset */
      const target = Math.max(0, Math.min(sceneWidth - SCENE_WIDTH,
        playerPos.x - (this.facing === Facing.right ? WINDOW_ANCHOR_L : WINDOW_ANCHOR_R)));

      if (init) {
        this.offset.x = target;
        this.state = CameraState.still;
      } else {
        const delta = target - this.offset.x;
        const signFacing = this.facing === Facing.right ? 1 : -1;
        const signDelta = Math.sign(delta);

        let speed = signFacing !== signDelta ? 0 : LERP_PROPORTION * delta;
        const accel = speed - this.velocity.x, signAccel = Math.sign(accel);

        if (Math.abs(accel) > MAX_ACCEL)
          speed = this.velocity.x + signAccel * MAX_ACCEL;

        if (Math.abs(speed) < MIN_SPEED) {
          if (speed !== 0) this.offset.x = target;
          this.velocity.x = 0;
          this.state = CameraState.still;
        } else {
          if (Math.abs(speed) > MAX_SPEED)
            speed = signAccel * MAX_SPEED;
          this.offset.x += speed;
          this.velocity.x = speed;
          this.state = signDelta === signAccel ? CameraState.accelerating : CameraState.decelerating;
        }
      }
    }

    this.offset.y = playerPos.y - 135;
  }

  render({ ctx, pixelSize, debug }: RendererContext, callback: () => void) {
    if (debug) {
      // Draw anchor lines
      ctx.strokeStyle =
        this.state === CameraState.accelerating ? '#afa' :
        this.state === CameraState.decelerating ? '#faa' : '#aaa';

      ctx.lineWidth = (this.facing === Facing.right ? 4 : 2) / pixelSize;
      ctx.beginPath();
      ctx.moveTo(FOCUS_ANCHOR_L, SCENE_HEIGHT * 0.3);
      ctx.lineTo(FOCUS_ANCHOR_L, SCENE_HEIGHT * 0.7);
      ctx.moveTo(WINDOW_ANCHOR_L, SCENE_HEIGHT * 0.25);
      ctx.lineTo(WINDOW_ANCHOR_L, SCENE_HEIGHT * 0.75);
      ctx.stroke();

      ctx.lineWidth = (this.facing === Facing.left ? 4 : 2) / pixelSize;
      ctx.beginPath();
      ctx.moveTo(FOCUS_ANCHOR_R, SCENE_HEIGHT * 0.3);
      ctx.lineTo(FOCUS_ANCHOR_R, SCENE_HEIGHT * 0.7);
      ctx.moveTo(WINDOW_ANCHOR_R, SCENE_HEIGHT * 0.25);
      ctx.lineTo(WINDOW_ANCHOR_R, SCENE_HEIGHT * 0.75);
      ctx.stroke();
    }
    ctx.save();
    const { x, y } = this.offset;
    ctx.translate(-Math.round(x * pixelSize) / pixelSize, -Math.round(y * pixelSize) / pixelSize);
    try {
      callback();
    } finally {
      ctx.restore();
    }
  }
}