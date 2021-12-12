import React from 'react';
import { AABB, Coord } from '../base/math';
import { MapBackground, MapData, MapDecoration, MapEntity, MapEntityType, MapItemType, MapLandmark, MapSpawnPoint, MapSprite, MapTerrain, MapTrigger, MapTriggerType, TERRAIN_SIZE } from '../map/interfaces';
import ItemEditor, { EditError, ItemEditorData, ItemEditorDataEntry } from './ItemEditor';
import './MapEditor.css';
import parseImage from './parseImage';
import TerrainCanvas from './TerrainCanvas';

/******** MapEditor ********/

type MapItem = {
  id: number;
  category: 'entity' | 'decoration' | 'landmark' | 'spawnPoint';
  item: MapSprite;
}

type MapToolType = {
  category: 'entity';
  type: MapEntityType
} | {
  category: 'decoration';
} | {
  category: 'landmark';
} | {
  category: 'spawnPoint';
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
  [MapEntityType.item, {
    item: MapItemType.flower,
    double: false
  }],
]);

const ENTITY_TYPES: MapEntityType[] = [...ENTITY_TEMPLATES.keys()];

const TOOLS: MapToolType[] = [
  { category: 'decoration' },
  { category: 'landmark' },
  { category: 'spawnPoint' },
  ...ENTITY_TYPES.map(type => ({ category: 'entity', type } as MapToolType))
];

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
  backgrounds: MapBackground[];
  backgroundDrafts: ItemEditorData[];
  triggers: MapTrigger[];
  triggerDrafts: ItemEditorData[];
  scale: number;
  pxAtom: number;
  pxGrid: number;
  items: MapItem[];
  selectedItems: MapItem[];
  itemDraft: ItemEditorData | null;
  currentTool: MapToolType;
  sidebarDock: 'l' | 'r';
  dragCorner: Coord | null;
  dragCorner2: Coord | null;
  mouseCoord: Coord | null;
  debugRender: boolean;
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
      backgrounds: [],
      backgroundDrafts: [],
      triggers: [],
      triggerDrafts: [],
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
      dragCorner2: null,
      mouseCoord: null,
      debugRender: true
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
            this.loadMap(map, true);
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
            const data = JSON.parse(reader.result as string) as MapData;
            data.backgrounds = data.backgrounds ?? [];
            data.landmarks = data.landmarks ?? [];
            data.spawnPoints = data.spawnPoints ?? [];
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

  loadMap(map: MapData, keepItems = false) {
    this.setState(state => ({
      loaded: true,
      mapCounter: state.mapCounter + 1,
      mapId: map.id,
      width: map.width * TERRAIN_SIZE,
      height: map.height * TERRAIN_SIZE,
      mapWidth: map.width,
      mapHeight: map.height,
      terrains: map.terrain,
      backgrounds: keepItems ? state.backgrounds : map.backgrounds,
      backgroundDrafts: keepItems ? state.backgroundDrafts : map.backgrounds.map(x => this.makeBackgroundDraft(x)),
      triggers: keepItems ? state.triggers : map.triggers,
      triggerDrafts: keepItems ? state.triggerDrafts : map.triggers.map(x => this.makeTriggerDraft(x)),
      items: [
        ...map.entities.map(entity => this.createItem('entity', entity)),
        ...map.decorations.map(decoration => this.createItem('decoration', decoration)),
        ...map.landmarks.map(landmark => this.createItem('landmark', landmark)),
        ...map.spawnPoints.map(spawnPoint => this.createItem('spawnPoint', spawnPoint)),
        ...(keepItems ? [...state.items.filter(x => x.category !== 'decoration')] : [])
      ],
      selectedItems: [],
      itemDraft: null
    }));
  }

  exportMap(): MapData {
    const {
      mapId, mapWidth, mapHeight,
      terrains, items, backgrounds, triggers
    } = this.state;
    return {
      id: mapId,
      width: mapWidth,
      height: mapHeight,
      terrain: terrains,
      entities: items.filter(x => x.category === 'entity').map(x => x.item as MapEntity),
      decorations: items.filter(x => x.category === 'decoration').map(x => x.item as MapDecoration),
      triggers: triggers,
      backgrounds: backgrounds,
      landmarks: items.filter(x => x.category === 'landmark').map(x => x.item as MapLandmark),
      spawnPoints: items.filter(x => x.category === 'spawnPoint').map(x => x.item as MapSpawnPoint)
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

  editMapId() {
    let str = prompt("Enter map id:", this.state.mapId);
    if (str) this.setState({ mapId: str });
  }

  mouseHandler(evt: React.MouseEvent<HTMLDivElement>) {
    evt.preventDefault();
    const box = this.refContainer.current!.getBoundingClientRect();
    const offsetX = evt.clientX - box.left;
    const offsetY = evt.clientY - box.top;
    const sceneX = Math.round(offsetX / this.state.pxAtom);
    const sceneY = Math.round(offsetY / this.state.pxAtom);

    if (evt.type === 'mousedown') {
      if (evt.button === 0) {
        this.selectItems([]);
        this.setState({
          dragCorner: new Coord(offsetX, offsetY)
        });
      } else if (evt.button === 2) {
        this.placeItem(sceneX, sceneY);
      }
    } else if (evt.type === 'mousemove') {
      if (this.state.dragCorner) {
        this.setState({
          dragCorner2: new Coord(offsetX, offsetY)
        });
      }
      this.setState({
        mouseCoord: new Coord(sceneX, sceneY)
      });
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
    return items.filter(({ category, item }) => {
      switch (category) {
        case 'landmark': {
          const landmark = item as MapLandmark;
          return AABB.offset(landmark.x, landmark.y, landmark.width, landmark.height).inside(rect);
        }
        default: {
          const sprite = item as MapSprite;
          return new Coord(sprite.x * pxAtom, sprite.y * pxAtom).inside(rect);
        }
      }
    });
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
      case '1': case '2': case '3': case '4': case '5':
      case '6': case '7': case '8': case '9': {
        this.switchTool(TOOLS[parseInt(evt.key) - 1]);
        break;
      }
      case 'a': {
        if (evt.ctrlKey) {
          this.selectItems(this.state.items.slice(0));
        }
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
      case 'landmark':
        return this.createItem('landmark', {
          tags: [], x, y,
          width: 8, height: 8
        });
      case 'spawnPoint':
        return this.createItem('spawnPoint', {
          tags: [], x, y
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

  switchTool(tool: MapToolType) {
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
      case 'tags': {
        const tags = value === '' ? [] : value.split(',');
        if (tags.some(x => !x.length))
          throw new EditError("tag name should not be empty");
        if (tags.length !== new Set(tags).size)
          throw new EditError("duplicate tag");
        parsed = tags;
        break;
      }
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

  /* ======== Background ======== */

  makeBackgroundDraft(data: MapBackground): ItemEditorData {
    return Object.keys(data).map(key => [key, JSON.stringify((data as any)[key])] as ItemEditorDataEntry);
  }

  backgroundsEditHandler(index: number, field: string, value: string) {
    const item = this.state.backgrounds[index];
    const draft = this.state.backgroundDrafts[index];

    const entry = draft.find(x => x[0] === field);
    if (!entry)
      throw new EditError("field does not exist");
    entry[1] = value;
    this.update();

    let parsed: any = JSON.parse(value);
    switch (field) {
      case 'picture': {
        if (typeof parsed !== 'string')
          throw new EditError("picture name should be string");
        break;
      }
      case 'opacity':
        if (typeof parsed !== 'number')
          throw new EditError("opacity should be number");
        break;
      case 'horizontal': case 'vertical':
        if (!parsed || typeof parsed !== 'object')
          throw new EditError(`${field} should be object`);
        if (typeof parsed.repeat !== "boolean")
          throw new EditError(`${field}.repeat should be boolean`);
        if (parsed.repeat) {
          if (typeof parsed.factor !== "number")
            throw new EditError(`${field}.factor should be number`);
          if (typeof parsed.offset !== "number")
            throw new EditError(`${field}.offset should be number`);
        } else {
          if (typeof parsed.marginL !== "number")
            throw new EditError(`${field}.marginL should be number`);
          if (typeof parsed.marginR !== "number")
            throw new EditError(`${field}.marginR should be number`);
        }
        break;
    }

    Object.assign(item, { [field]: parsed });
    this.update();
  }

  backgroundAddHandler() {
    const data: MapBackground = {
      picture: "bg/",
      opacity: 1,
      horizontal: {
        repeat: true,
        factor: 0.5,
        offset: 0
      },
      vertical: {
        repeat: false,
        marginL: 0,
        marginR: 0
      }
    };
    this.state.backgrounds.push(data);
    this.state.backgroundDrafts.push(this.makeBackgroundDraft(data));
    this.update();
  }

  backgroundRemoveHandler(index: number) {
    this.state.backgrounds.splice(index, 1);
    this.state.backgroundDrafts.splice(index, 1);
    this.update();
  }

  /* ======== Trigger ======== */

  makeTriggerDraft(data: MapTrigger): ItemEditorData {
    return Object.keys(data).map(key => [key, JSON.stringify((data as any)[key])] as ItemEditorDataEntry);
  }

  triggersEditHandler(index: number, field: string, value: string) {
    const item = this.state.triggers[index];
    const draft = this.state.triggerDrafts[index];

    const entry = draft.find(x => x[0] === field);
    if (!entry)
      throw new EditError("field does not exist");
    entry[1] = value;
    this.update();

    let parsed: any = JSON.parse(value);

    Object.assign(item, { [field]: parsed });
    this.update();
  }

  triggerAddHandler() {
    const data: MapTrigger = {
      id: `${this.state.mapId}:`,
      condition: {
        type: MapTriggerType.entityKilled,
        entityTag: ''
      }
    };
    this.state.triggers.push(data);
    this.state.triggerDrafts.push(this.makeTriggerDraft(data));
    this.update();
  }

  triggerRemoveHandler(index: number) {
    this.state.triggers.splice(index, 1);
    this.state.triggerDrafts.splice(index, 1);
    this.update();
  }

  toggleDebugRender() {
    this.setState(({ mapCounter, debugRender }) => ({
      mapCounter: mapCounter + 1,
      debugRender: !debugRender
    }));
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
      <button onClick={() => parent.toggleDebugRender()}>
        Render: {state.debugRender ? "debug" : "normal"}
      </button>
      <span className="gap"></span>
      <button
        className={tool.category === "decoration" ? "tool selected" : "tool"}
        onClick={() => parent.switchTool({ category: 'decoration' })}
      >decoration</button>
      <button
        className={tool.category === "landmark" ? "tool selected" : "tool"}
        onClick={() => parent.switchTool({ category: 'landmark' })}
      >landmark</button>
      <button
        className={tool.category === "spawnPoint" ? "tool selected" : "tool"}
        onClick={() => parent.switchTool({ category: 'spawnPoint' })}
      >spawnPoint</button>
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
  const { itemDraft, sidebarDock, selectedItems, mouseCoord, dragCorner, pxAtom } = state;
  const toggledSide = { l: 'right', r: 'left' }[sidebarDock];

  const dragCoord = dragCorner && new Coord(dragCorner.x / pxAtom, dragCorner.y / pxAtom).round();

  return (
    <div className="Sidebar">
      <div>
        <strong>Sidebar</strong>&nbsp;
        <button onClick={() => parent.toggleSidebarDock()}>Dock to {toggledSide}</button>
      </div>
      <div>
        <div><strong>Map Information</strong></div>
        <div>ID: {state.mapId}&nbsp;<button onClick={() => parent.editMapId()}>Edit</button></div>
        <div>Map: {state.mapWidth} x {state.mapHeight}</div>
        <div>Scene: {state.width} x {state.height}</div>
        <div>Entities: {state.items.filter(x => x.category === 'entity').length}</div>
        <div>Decorations: {state.items.filter(x => x.category === 'decoration').length}</div>
        <div>Landmarks: {state.items.filter(x => x.category === 'landmark').length}</div>
        <div>Spawn Points: {state.items.filter(x => x.category === 'spawnPoint').length}</div>
        {mouseCoord &&
          <div>Cursor: ({mouseCoord.x}, {mouseCoord.y}) ({Math.floor(mouseCoord.x / TERRAIN_SIZE)}, {Math.floor(mouseCoord.y / TERRAIN_SIZE)})</div>
        }
        {dragCoord &&
          <div>Drag: ({dragCoord.x}, {dragCoord.y}) {Math.abs(mouseCoord!.x - dragCoord.x)}x{Math.abs(mouseCoord!.y - dragCoord.y)}</div>
        }
        {selectedItems.length > 0 &&
          <div>Selected: {`${selectedItems.length} ${selectedItems.length > 1 ? 'items' : 'item'}`}</div>
        }
      </div>
      {itemDraft &&
        <div>
          <strong>Selected Item</strong>
          <ItemEditor data={itemDraft} onModify={parent.itemModifyHandler} />
        </div>
      }
      {!itemDraft &&
        <div>
          <div>
            <strong>Map Triggers</strong>&nbsp;
            <button onClick={() => parent.triggerAddHandler()}>Add</button>
          </div>
          <div>
            {state.triggerDrafts.map((draft, index) => (
              <div key={index}>
                <div>
                  <span>Trigger #{index + 1}</span>&nbsp;
                  <button onClick={() => parent.triggerRemoveHandler(index)}>Remove</button>
                </div>
                <ItemEditor data={draft}
                  onModify={(field, value) => parent.triggersEditHandler(index, field, value)} />
              </div>
            ))}
          </div>
        </div>
      }
      {!itemDraft &&
        <div>
          <div>
            <strong>Map Backgrounds</strong>&nbsp;
            <button onClick={() => parent.backgroundAddHandler()}>Add</button>
          </div>
          <div>
            {state.backgroundDrafts.map((draft, index) => (
              <div key={index}>
                <div>
                  <span>Layer #{index + 1}</span>&nbsp;
                  <button onClick={() => parent.backgroundRemoveHandler(index)}>Remove</button>
                </div>
                <ItemEditor data={draft}
                  onModify={(field, value) => parent.backgroundsEditHandler(index, field, value)} />
              </div>
            ))}
          </div>
        </div>
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
          debug={state.debugRender}
        />
        {items.map((mapItem) => {
          const { id, category, item } = mapItem;
          const handler = (evt: React.MouseEvent) => parent.itemMouseHandler(evt, mapItem);
          const props = {
            key: id,
            style: {
              left: PX(item.x),
              top: PX(item.y),
              '--label': '""'
            },
            onMouseDown: handler,
            onMouseUp: handler,
            onMouseMove: handler
          } as any;
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

            case 'decoration': {
              const { variant } = item as MapDecoration;
              classList.push('decoration', variant);
              props.style['--label'] = `"${variant}"`;
              break;
            }

            case 'landmark': {
              const { width, height } = item as MapLandmark;
              classList.push('landmark');
              props.style['--label'] = `"${item.tags.join(',') || 'landmark'}"`;
              props.style.width = PX(width);
              props.style.height = PX(height);
              break;
            }

            case 'spawnPoint': {
              classList.push('spawnPoint');
              props.style['--label'] = '"spawn point"';
              break;
            }
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
