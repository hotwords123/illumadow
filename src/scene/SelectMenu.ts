import Scene from "./Scene";

interface MenuItem {
  disabled: boolean;
}

type MenuCallback<T extends MenuItem> = (item: T) => void;

export default class SelectMenu<T extends MenuItem> {
  selectedIndex = 0;

  constructor(private scene: Scene, private items: T[], private callback: MenuCallback<T>) {
    this.validateItems(items);
    this.selectedIndex = this.findFirstItem(0, 1, true);

    this.keyHandler = this.keyHandler.bind(this);
    this.scene.listenAllKeys(this.keyHandler);
  }

  cleanup() {
    this.scene.removeGlobalListener(this.keyHandler);
  }

  validateItems(items: T[]) {
    if (!items.filter(item => !item.disabled).length)
      throw new Error("menu should have at least one enabled item");
  }

  get selectedItem() {
    return this.items[this.selectedIndex];
  }

  getItems() {
    return this.items.slice(0);
  }

  setItems(items: T[], selectedIndex: number = 0) {
    this.validateItems(items);
    this.items = items;
    this.selectedIndex = selectedIndex;
  }

  findFirstItem(start: number, dir: number, includeFirst: boolean) {
    let index = start, isFirst = true;
    while (this.items[index].disabled || (isFirst && !includeFirst)) {
      index = (index + dir + this.items.length) % this.items.length;
      isFirst = false;
    }
    return index;
  }

  keyHandler(command: string, event: string) {
    switch (command) {
      case "move.up":
        if (event === "down" || event === "repeat")
          this.selectedIndex = this.findFirstItem(this.selectedIndex, -1, false);
        break;
      case "move.down":
        if (event === "down" || event === "repeat")
          this.selectedIndex = this.findFirstItem(this.selectedIndex, 1, false);
        break;
      case "ui.confirm":
        if (event === "down")
          this.callback(this.items[this.selectedIndex]);
        break;
    }
  }
}
