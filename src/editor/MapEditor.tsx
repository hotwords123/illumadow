import React from 'react';
import { MapData, MapDecoration, MapEntity, MapEntityType, MapTerrain, TERRAIN_SIZE } from '../map/interfaces';
import ItemEditor, { ItemEditorData } from './ItemEditor';
import './MapEditor.css';
import parseImage from './parseImage';
import TerrainCanvas from './TerrainCanvas';

/******** MapEditor ********/

type MapItem = {
  category: 'entity';
  item: MapEntity;
} | {
  category: 'decoration';
  item: MapDecoration;
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
  }]
]);

const ENTITIES: MapEntityType[] = [...ENTITY_TEMPLATES.keys()];

interface MapEditorState {
  loaded: boolean;
  // used for rendering terrain
  mapId: number;
  // dimension of pixels
  width: number;
  height: number;
  // dimension of terrain
  mapWidth: number;
  mapHeight: number;
  terrains: (MapTerrain | null)[][];
  scale: number;
  items: MapItem[];
  selectedItems: MapItem[];
  itemDraft: ItemEditorData | null;
  currentTool: MapItemType;
  sidebarDock: 'l' | 'r';
}

export default class MapEditor extends React.Component<{}, MapEditorState> {
  idPool = new Map([...ENTITIES, 'decoration'].map(type => [type, { value: 0 }]));

  refFileInput = React.createRef<HTMLInputElement>();
  refToolbar = React.createRef<Toolbar>();
  refSidebar = React.createRef<Sidebar>();

  constructor(props: {}) {
    super(props);

    this.state = {
      loaded: false,
      mapId: 0,
      width: 0,
      height: 0,
      mapWidth: 0,
      mapHeight: 0,
      terrains: [],
      scale: 4,
      items: [],
      selectedItems: [],
      itemDraft: null,
      currentTool: {
        category: 'entity',
        type: MapEntityType.player
      },
      sidebarDock: 'r'
    };

    this.importHandler = this.importHandler.bind(this);
    this.exportHandler = this.exportHandler.bind(this);
    this.fileHandler = this.fileHandler.bind(this);
    this.mouseHandler = this.mouseHandler.bind(this);
    this.keyHandler = this.keyHandler.bind(this);
    this.itemClickHandler = this.itemClickHandler.bind(this);
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

  loadMap(map: MapData) {
    this.setState(state => ({
      loaded: true,
      mapId: state.mapId + 1,
      width: map.width * TERRAIN_SIZE,
      height: map.height * TERRAIN_SIZE,
      mapWidth: map.width,
      mapHeight: map.height,
      terrains: map.terrain,
      items: [
        ...map.entities.map(entity =>
          ({ category: 'entity', item: entity } as MapItem)),
        ...map.decorations.map(decoration =>
          ({ category: 'decoration', item: decoration } as MapItem))
      ],
      selectedItems: [],
      itemDraft: null
    }));
  }

  exportHandler() {
    //
  }

  toggleSidebarDock() {
    this.setState(({ sidebarDock }) => ({
      sidebarDock: sidebarDock === 'l' ? 'r' : 'l'
    }));
  }

  mouseHandler(evt: React.MouseEvent<HTMLDivElement>) {
    evt.preventDefault();

    //
  }

  keyHandler(evt: KeyboardEvent) {
    if (evt.target instanceof HTMLInputElement || evt.target instanceof HTMLTextAreaElement)
      return;  
    switch (evt.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'ArrowRight':
      case 'ArrowDown': {
        break;
      }
      case '1': case '2': case '3': case '4': {
        break;
      }
      case 'Delete': {
        break;
      }
      default: return;
    }
    evt.preventDefault();
  }

  update() {
    this.setState({}); // force React to update
  }

  generateItemId(type: string) {
    return `${type}-${++this.idPool.get(type)!.value}`;
  }

  placeItem(x: number, y: number) {
  }

  switchTool(tool: MapItemType) {
    this.setState({ currentTool: tool });
  }

  itemClickHandler(item: MapItem) {
  }

  itemModifyHandler(field: string, value: string) {
  }

  render() {
    const { state } = this;
    const { scale, selectedItems } = state;
    const PX = (px: number) => px * scale + 'px';
    const GRID = (i: number) => i * scale * TERRAIN_SIZE + 'px';

    return (
      <div className={`MapEditor dock-${state.sidebarDock}`}>
        <input ref={this.refFileInput} type="file" onInput={this.fileHandler} style={{ display: 'none' }} />
        <Toolbar ref={this.refToolbar} parent={this} />
        <Sidebar ref={this.refSidebar} parent={this} />
        <div className="container"
          style={{
            width: PX(state.width),
            height: PX(state.height)
          }}
          onContextMenu={evt => evt.preventDefault()}
        >
          <TerrainCanvas
            key={state.mapId}
            width={state.mapWidth}
            height={state.mapHeight}
            scale={scale}
            terrains={state.terrains}
          />
          {}
        </div>
      </div>
    );
  }
}

interface EditorChildProps {
  parent: MapEditor;
}

/******** Toolbar ********/

class Toolbar extends React.Component<EditorChildProps> {
  render() {
    const { parent } = this.props;
    const { state } = parent;
    const { currentTool: tool } = parent.state;

    return (
      <div className="toolbar">
        <button onClick={parent.importHandler}>Import</button>
        <button onClick={parent.exportHandler}>Export</button>
        <button>{`Map: ${state.mapWidth} x ${state.mapHeight}`}</button>
        <button>{`Scene: ${state.width} x ${state.height}`}</button>
        <span className="gap"></span>
      </div>
    );
  }
}

/******** Sidebar ********/

class Sidebar extends React.Component<EditorChildProps> {
  constructor(props: EditorChildProps) {
    super(props);
  }

  render() {
    const { parent } = this.props;
    const { itemDraft, sidebarDock } = parent.state;
    const toggledSide = { l: 'right', r: 'left' }[sidebarDock];
    return (
      <div className="sidebar">
        <div>
          <strong>Toolbar</strong>
        </div>
        <div>
          <button onClick={() => parent.toggleSidebarDock()}>Dock to {toggledSide}</button>
        </div>
        {itemDraft &&
          <ItemEditor data={itemDraft} onModify={parent.itemModifyHandler} />
        }
      </div>
    );
  }
}
