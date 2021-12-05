import React from 'react';
import { AABB, Coord } from '../base';
import { MapData, MapDecoration, MapEntity, MapEntityType, MapSprite, MapTerrain, TERRAIN_SIZE } from '../map/interfaces';
import ItemEditor, { EditError, ItemEditorData, ItemEditorDataEntry } from './ItemEditor';
import './MapEditor.css';
import parseImage from './parseImage';
import TerrainCanvas from './TerrainCanvas';

/******** MapEditor ********/

type MapItem = {
  id: number;
  category: 'entity' | 'decoration';
  item: MapSprite;
}

type MapItemType = {
  category: 'entity';
  type: MapEntityType
} | {
  category: 'decoration';
};

const ENTITY_TEMPLATES = new Map([
  [MapEntityType.player, {
    health: 6,
    maxHealth: 6
  }],
  [MapEntityType.scout, {}],
  [MapEntityType.guard, {}],
  [MapEntityType.archer, {}],
  [MapEntityType.wizard, {}],
  [MapEntityType.boss, {}],
]);

const ENTITY_TYPES: MapEntityType[] = [...ENTITY_TEMPLATES.keys()];

interface MapEditorState {
  loaded: boolean;
  // used for rendering terrain
  mapCounter: number;
  mapId: string;
  // dimension of pixels
  width: number;
  height: number;
  // dimension of terrain
  mapWidth: number;
  mapHeight: number;
  terrains: (MapTerrain | null)[][];
  scale: number;
  pxAtom: number;
  pxGrid: number;
  items: MapItem[];
  selectedItems: MapItem[];
  itemDraft: ItemEditorData | null;
  currentTool: MapItemType;
  sidebarDock: 'l' | 'r';
  dragCorner: Coord | null;
  dragCorner2: Coord | null;
}

export default class MapEditor extends React.Component<{}, MapEditorState> {
  currentItemId = 0;

  refFileInput = React.createRef<HTMLInputElement>();
  refContainer = React.createRef<HTMLDivElement>();

  constructor(props: {}) {
    super(props);

    this.state = {
      loaded: false,
      mapCounter: 0,
      mapId: '',
      width: 0,
      height: 0,
      mapWidth: 0,
      mapHeight: 0,
      terrains: [],
      scale: 4,
      pxAtom: 4 / window.devicePixelRatio,
      pxGrid: 4 * TERRAIN_SIZE / window.devicePixelRatio,
      items: [],
      selectedItems: [],
      itemDraft: null,
      currentTool: {
        category: 'entity',
        type: MapEntityType.player
      },
      sidebarDock: 'r',
      dragCorner: null,
      dragCorner2: null
    };

    this.importHandler = this.importHandler.bind(this);
    this.exportHandler = this.exportHandler.bind(this);
    this.fileHandler = this.fileHandler.bind(this);
    this.mouseHandler = this.mouseHandler.bind(this);
    this.keyHandler = this.keyHandler.bind(this);
    this.itemMouseHandler = this.itemMouseHandler.bind(this);
    this.itemModifyHandler = this.itemModifyHandler.bind(this);
  }

  componentDidMount() {
    window.addEventListener("keydown", this.keyHandler, false);
  }

  componentWillUnmount() {
    window.removeEventListener("keydown", this.keyHandler, false);
  }

  importHandler() {
    this.refFileInput.current!.click();
  }

  async fileHandler(evt: React.FormEvent<HTMLInputElement>) {
    const input = evt.currentTarget;
    if (input.files?.length === 1) {
      const [file] = input.files;
      if (file.name.endsWith(".png")) {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        img.onload = () => {
          try {
            const map = parseImage(img, file.name.slice(0, file.name.indexOf('.')));
            this.loadMap(map);
          } catch (err: any) {
            console.error(err);
            alert(err.message);
          } finally {
            URL.revokeObjectURL(url);
          }
        };
      } else if (file.name.endsWith(".json")) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = JSON.parse(reader.result as string);
            this.loadMap(data);
          } catch (err: any) {
            console.error(err);
            alert(err.message);
          }
        };
        reader.readAsText(file);
      } else {
        alert("supports .png and .json files only");
      }
    }
  }

  createItem<T extends MapSprite>(category: MapItem["category"], item: T): MapItem {
    return { id: this.currentItemId++, category, item };
  }

  loadMap(map: MapData) {
    this.setState(state => ({
      loaded: true,
      mapCounter: state.mapCounter + 1,
      mapId: map.id,
      width: map.width * TERRAIN_SIZE,
      height: map.height * TERRAIN_SIZE,
      mapWidth: map.width,
      mapHeight: map.height,
      terrains: map.terrain,
      items: [
        ...map.entities.map(entity => this.createItem('entity', entity)),
        ...map.decorations.map(decoration => this.createItem('decoration', decoration))
      ],
      selectedItems: [],
      itemDraft: null
    }));
  }

  exportMap(): MapData {
    const {
      mapId, mapWidth, mapHeight,
      terrains, items
    } = this.state;
    return {
      id: mapId,
      width: mapWidth,
      height: mapHeight,
      terrain: terrains,
      entities: items.filter(x => x.category === 'entity').map(x => x.item as MapEntity),
      decorations: items.filter(x => x.category === 'decoration').map(x => x.item as MapDecoration),
      triggers: []
    };
  }

  exportHandler() {
    const map = this.exportMap();
    const blob = new Blob([JSON.stringify(map)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = map.id + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  toggleSidebarDock() {
    this.setState(({ sidebarDock }) => ({
      sidebarDock: sidebarDock === 'l' ? 'r' : 'l'
    }));
  }

  mouseHandler(evt: React.MouseEvent<HTMLDivElement>) {
    evt.preventDefault();
    const box = this.refContainer.current!.getBoundingClientRect();
    const offsetX = evt.clientX - box.left;
    const offsetY = evt.clientY - box.top;

    if (evt.type === 'mousedown') {
      if (evt.button === 0) {
        this.selectItems([]);
        this.setState({
          dragCorner: new Coord(offsetX, offsetY)
        });
      } else if (evt.button === 2) {
        const sceneX = Math.round(offsetX / this.state.pxAtom);
        const sceneY = Math.round(offsetY / this.state.pxAtom);
        this.placeItem(sceneX, sceneY);
      }
    } else if (evt.type === 'mousemove') {
      if (this.state.dragCorner) {
        this.setState({
          dragCorner2: new Coord(offsetX, offsetY)
        });
      }
    } else if (evt.type === 'mouseup') {
      if (evt.button === 0) {
        const { dragCorner: corner, dragCorner2: corner2 } = this.state;
        this.selectItems([]);
        if (corner) {
          if (corner2) {
            const rect = AABB.cornered(corner, corner2);
            this.selectItems(this.getItemsInRect(rect));
          }
          this.setState({
            dragCorner: null,
            dragCorner2: null
          });
        }
      }
    }
  }

  getItemsInRect(rect: AABB) {
    const { items, pxAtom } = this.state;
    return items.filter(({ item }) => new Coord(item.x * pxAtom, item.y * pxAtom).inside(rect));
  }

  keyHandler(evt: KeyboardEvent) {
    if (evt.target instanceof HTMLInputElement || evt.target instanceof HTMLTextAreaElement)
      return;  
    switch (evt.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'ArrowRight':
      case 'ArrowDown': {
        const [dx, dy] = {
          L: [-1, 0], R: [1, 0],
          U: [0, -1], D: [0, 1]
        }[evt.key[5]]!;
        const { selectedItems } = this.state;
        for (const { item } of selectedItems) {
          item.x += dx;
          item.y += dy;
        }
        this.setState({
          itemDraft: selectedItems.length === 1 ? this.makeItemDraft(selectedItems[0].item) : null
        });
        break;
      }
      case '1': case '2': case '3': case '4': {
        break;
      }
      case 'Delete': {
        const { selectedItems } = this.state;
        this.selectItems([]);
        this.setState(state => ({
          items: state.items.filter(x => !selectedItems.includes(x))
        }));
        break;
      }
      default: return;
    }
    evt.preventDefault();
  }

  update() {
    this.setState({}); // force React to update
  }

  getItemToPlace(x: number, y: number): MapItem | null {
    const tool = this.state.currentTool;
    switch (tool.category) {
      case 'entity':
        return this.createItem('entity', {
          tags: [], x, y,
          type: tool.type,
          ...(ENTITY_TEMPLATES.get(tool.type) ?? {})
        });
      case 'decoration':
        return this.createItem('decoration', {
          tags: [], x, y,
          variant: ''
        });
      default:
        return null;
    }
  }

  placeItem(x: number, y: number) {
    const item = this.getItemToPlace(x, y);
    if (item) {
      this.state.items.push(item);
      this.selectItems([item]);
    }
  }

  selectItems(items: MapItem[]) {
    let itemDraft: ItemEditorData | null = null;
    if (items.length === 1) {
      const [{ item }] = items;
      itemDraft = this.makeItemDraft(item);
    }
    this.setState({ selectedItems: items, itemDraft });
  }

  switchTool(tool: MapItemType) {
    this.setState({ currentTool: tool });
  }

  itemMouseHandler(evt: React.MouseEvent, item: MapItem) {
    if (evt.type === 'mousedown') {
      if (evt.button === 0) {
        if (evt.ctrlKey) {
          const items = new Set(this.state.selectedItems);
          if (items.has(item))
            items.delete(item);
          else
            items.add(item);
          this.selectItems([...items])
        } else {
          this.selectItems([item]);
        }
      }
      evt.stopPropagation();
    } else if (evt.type === 'mouseup') {
      evt.stopPropagation();
    }
  }

  makeItemDraft({ tags, ...more }: MapSprite): ItemEditorData {
    return [
      ['tags', tags.join(',')],
      ...Object.keys(more).map(key => [key, JSON.stringify((more as any)[key])] as ItemEditorDataEntry)
    ];
  }

  itemModifyHandler(field: string, value: string) {
    const entry = this.state.itemDraft!.find(x => x[0] === field);
    if (!entry)
      throw new EditError("field does not exist");
    entry[1] = value;
    this.update();

    let parsed: any;
    switch (field) {
      case 'tags':
        parsed = [...new Set(value.split(','))].filter(x => !!x);
        break;
      case 'x': case 'y':
        parsed = parseInt(value);
        if (isNaN(parsed))
          throw new EditError("coordinate should be number");
        break;
      default:
        try {
          parsed = JSON.parse(value);
        } catch (err: any) {
          throw new EditError(err.message);
        }
    }

    Object.assign(this.state.selectedItems[0].item, { [field]: parsed });
    this.update();
  }

  render() {
    return (
      <div className={`MapEditor dock-${this.state.sidebarDock}`}>
        <input ref={this.refFileInput} type="file" onInput={this.fileHandler} style={{ display: 'none' }} />
        <Toolbar parent={this} />
        <Sidebar parent={this} />
        <Container refMain={this.refContainer} parent={this} />
      </div>
    );
  }
}

interface EditorChildProps {
  parent: MapEditor;
}

/******** Toolbar ********/

function Toolbar({ parent }: EditorChildProps) {
  const { state } = parent;
  const { currentTool: tool } = state;

  return (
    <div className="Toolbar">
      <button onClick={parent.importHandler}>Import</button>
      <button onClick={parent.exportHandler}>Export</button>
      <span className="gap"></span>
      <button
        className={tool.category === "decoration" ? "tool selected" : "tool"}
        onClick={() => parent.switchTool({ category: 'decoration' })}
      >decoration</button>
      {ENTITY_TYPES.map(type => {
        const classList = ["tool"];
        if (tool.category === "entity" && tool.type === type)
          classList.push("selected");
        return (
          <button key={type}
            className={classList.join(' ')}
            onClick={() => parent.switchTool({ category: 'entity', type })}
          >
            {type}
          </button>
        );
      })}
    </div>
  );
}

/******** Sidebar ********/

function Sidebar({ parent }: EditorChildProps) {
  const { state } = parent;
  const { itemDraft, sidebarDock, selectedItems } = state;
  const toggledSide = { l: 'right', r: 'left' }[sidebarDock];

  return (
    <div className="Sidebar">
      <div>
        <strong>Sidebar</strong>&nbsp;
        <button onClick={() => parent.toggleSidebarDock()}>Dock to {toggledSide}</button>
      </div>
      <div>
        <div><strong>Map Information</strong></div>
        <div>Map: {state.mapWidth} x {state.mapHeight}</div>
        <div>Scene: {state.width} x {state.height}</div>
        <div>Entities: {state.items.filter(x => x.category === 'entity').length}</div>
        <div>Decorations: {state.items.filter(x => x.category === 'decoration').length}</div>
        {selectedItems.length > 0 &&
          <div>Selected: {`${selectedItems.length} ${selectedItems.length > 1 ? 'items' : 'item'}`}</div>
        }
      </div>
      {itemDraft &&
        <ItemEditor data={itemDraft} onModify={parent.itemModifyHandler} />
      }
    </div>
  );
}

/******** Container ********/

interface ContainerProps extends EditorChildProps {
  refMain: React.Ref<HTMLDivElement>;
}

function Container({ parent, refMain }: ContainerProps) {
  const { state } = parent;
  const { pxAtom, items, selectedItems, dragCorner, dragCorner2 } = state;
  const PX = (x: number) => x * pxAtom + 'px';
  const dragArea = dragCorner2 && AABB.cornered(dragCorner!, dragCorner2);

  return (
    <div className="Container"
      onMouseDown={parent.mouseHandler}
      onMouseUp={parent.mouseHandler}
      onMouseMove={parent.mouseHandler}
    >
      <div ref={refMain} className="ContainerBox"
        onContextMenu={evt => evt.preventDefault()}
      >
        <TerrainCanvas
          key={state.mapCounter}
          width={state.mapWidth}
          height={state.mapHeight}
          scale={state.scale}
          terrains={state.terrains}
        />
        {items.map((mapItem) => {
          const { id, category, item } = mapItem;
          const handler = (evt: React.MouseEvent) => parent.itemMouseHandler(evt, mapItem);
          const props = {
            key: id,
            style: {
              left: PX(item.x),
              top: PX(item.y),
              '--label': ''
            },
            onMouseDown: handler,
            onMouseUp: handler,
            onMouseMove: handler
          };
          const classList = ['sprite'];
          if (selectedItems.includes(mapItem))
            classList.push('selected');
          switch (category) {
            case 'entity': {
              const { type } = item as MapEntity;
              classList.push('entity', type);
              props.style['--label'] = `"${type}"`;
              break;
            }
            case 'decoration':
              const { variant } = item as MapDecoration;
              classList.push('decoration', variant);
              props.style['--label'] = `"${variant}"`;
              break;
          }
          console.info(props);
          return (
            <div className={classList.join(" ")} {...props}>
              <div className="box"></div>
            </div>
          );
        })}
        {dragArea &&
          <div className="drag-area" style={{
            left: dragArea.left + 'px',
            top: dragArea.top + 'px',
            width: dragArea.width + 'px',
            height: dragArea.height + 'px'
          }}></div>
        }
      </div>
    </div>
  );
}