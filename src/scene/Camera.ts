
import { AABB, Coord, Vector, Facing } from "../base";
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
  WINDOW_ANCHOR_Y = 120,
  MAX_ACCEL = 3,
  MIN_SPEED = 0.3,
  MAX_SPEED = 4,
  LERP_PROPORTION = 0.08;

enum CameraState { still, accelerating, decelerating }

export default class Camera {
  offset = new Vector(0, 0);
  velocity = new Vector(0, 0);
  facing = Facing.right;
  stateX = CameraState.still;
  stateY = CameraState.still;
  snappedY: number;

  constructor(private scene: LevelScene) {
    this.snappedY = this.scene.player.y;
    this.update(true);
  }

  get viewBox() {
    return ORIGIN_BOX.offset2(this.offset.x, this.offset.y);
  }

  /**
   * Update the camera.
   * @param init Whether to ignore previous position and facing.
   */
  update(init = false) {
    const player = this.scene.player;
    /** Player position  */
    const playerPos = player.position;
    const playerPosOld = player.oldPosition;
    /** Player position relative to the camera */
    const playerOffset = playerPos.minus(this.offset);
    const playerOffsetOld = playerPosOld.minus(this.offset);
    const sceneWidth = this.scene.width, sceneHeight = this.scene.height;

    if (sceneWidth <= SCENE_WIDTH) {
      // Scene too small, just put it in the center
      this.offset.x = (SCENE_WIDTH - sceneWidth) / 2;
      this.stateX = CameraState.still;
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
        this.stateX = CameraState.still;
      } else {
        const delta = target - this.offset.x;
        const signFacing = this.facing === Facing.right ? 1 : -1;
        const signDelta = Math.sign(delta);

        let speed = signFacing !== signDelta ? 0 : LERP_PROPORTION * delta;
        const accel = speed - this.velocity.x, signAccel = Math.sign(accel);

        if (Math.abs(accel) > MAX_ACCEL)
          speed = this.velocity.x + signAccel * MAX_ACCEL;

        if (Math.abs(delta) < MIN_SPEED) {
          if (speed !== 0)
            this.offset.x = target;
          this.velocity.x = 0;
          this.stateX = CameraState.still;
        } else  {
          speed = Math.sign(speed) * Math.max(MIN_SPEED, Math.min(MAX_SPEED, Math.abs(speed)));
          this.offset.x += speed;
          this.velocity.x = speed;
          this.stateX = signDelta === signAccel ? CameraState.accelerating : CameraState.decelerating;
        }
      }
    }

    if (sceneHeight <= SCENE_HEIGHT) {
      this.offset.y = (SCENE_HEIGHT - sceneHeight) / 2;
      this.stateY = CameraState.still;
    } else {
      if (player.onGround)
        this.snappedY = playerPos.y;

      const target = Math.max(0, Math.min(sceneHeight - SCENE_HEIGHT, this.snappedY - WINDOW_ANCHOR_Y));

      if (init) {
        this.offset.y = target;
        this.stateY = CameraState.still;
      } else {
        const delta = target - this.offset.y;
        let speed = delta * LERP_PROPORTION;

        if (Math.abs(delta) < MIN_SPEED) {
          this.offset.y = target;
          this.stateY = CameraState.still;
        } else {
          speed = Math.sign(speed) * Math.max(MIN_SPEED, Math.min(MAX_SPEED, Math.abs(speed)));
          this.offset.y += speed;
          this.stateY = CameraState.accelerating;
        }
      }
    }
  }

  render(rctx: RendererContext, callback: () => void) {
    rctx.run(({ ctx }) => {
      const { x, y } = this.offset;
      ctx.translate(-Math.round(x), -Math.round(y));
      callback();
    });

    if (rctx.debug) {
      rctx.run(({ ctx, pixelSize }) => {
        // Draw anchor lines

        ctx.strokeStyle =
        this.stateX === CameraState.accelerating ? '#afa' :
        this.stateX === CameraState.decelerating ? '#faa' : '#aaa';

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

        ctx.strokeStyle =
          this.stateY === CameraState.accelerating ? '#7bf' : '#aaa';

        ctx.lineWidth = 3 / pixelSize;
        ctx.beginPath();
        ctx.moveTo(SCENE_WIDTH * 0.3, WINDOW_ANCHOR_Y);
        ctx.lineTo(SCENE_WIDTH * 0.64, WINDOW_ANCHOR_Y);
        ctx.stroke();
      });
    }
  }
}