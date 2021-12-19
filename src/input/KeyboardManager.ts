import GameManager from "../GameManager";

function normalizeKey({ key }: KeyboardEvent) {
  return /^[A-Za-z]$/.test(key) ? key.toUpperCase() : key;
}

const COMMAND_MAP: Record<string, string[]> = {
  "ui.confirm":  ["C", "Enter"],
  "ui.cancel":   ["X"],
  "ui.pause":    ["Escape"],
  "move.up":     ["W", "ArrowUp"],
  "move.left":   ["A", "ArrowLeft"],
  "move.down":   ["S", "ArrowDown"],
  "move.right":  ["D", "ArrowRight"],
  "move.jump":   ["W", " "],
  "skill.melee": ["J"],
  "skill.dash":  ["K"],
  "debug.toggle": ["F3"],
  "debug.level":  ["F4"]
};

const COMMANDS = Object.keys(COMMAND_MAP);
const USED_KEYS = [...new Set(
  COMMANDS.map((command) => COMMAND_MAP[command]).flat()
)];
const KEY_MAP = new Map(USED_KEYS.map(
  key => [key, COMMANDS.filter(command => COMMAND_MAP[command].includes(key))]
));

export default class KeyboardManager {
  private pressedKeys: Set<string> = new Set();

  constructor(private gameManager: GameManager) {
    this.keydownHandler = this.keydownHandler.bind(this);
    this.keyupHandler = this.keyupHandler.bind(this);

    window.addEventListener("keydown", this.keydownHandler, false);
    window.addEventListener("keyup", this.keyupHandler, false);
  }

  cleanup() {
    window.removeEventListener("keydown", this.keydownHandler, false);
    window.removeEventListener("keyup", this.keyupHandler, false);
  }

  private keydownHandler(evt: KeyboardEvent) {
    const key = normalizeKey(evt);
    const commands = KEY_MAP.get(key);
    if (!commands) return;
    evt.preventDefault();
    this.pressedKeys.add(key);
    for (const command of commands)
      this.gameManager.onKeyEvent(command, evt.repeat ? "repeat" : "down");
  }

  private keyupHandler(evt: KeyboardEvent) {
    const key = normalizeKey(evt);
    const commands = KEY_MAP.get(key);
    if (!commands) return;
    evt.preventDefault();
    this.pressedKeys.delete(key);
    for (const command of commands)
      this.gameManager.onKeyEvent(command, "up");
  }

  isKeyPressed(command: string) {
    return command in COMMAND_MAP && COMMAND_MAP[command].some(key => this.pressedKeys.has(key));
  }
}