import React from 'react';
import { MapData, MapEntity, MapEntityType, MapTerrain, MapTerrainType } from './map/interfaces';
import './MapEditor.css';

/******** MapEditor ********/

type MapItem = {
  type: 'terrain',
  terrain: MapTerrain
} | {
  type: 'entity',
  entity: MapEntity
};

type MapItemType = {
  category: 'terrain',
  type: MapTerrainType
} | {
  category: 'entity',
  type: MapEntityType
};

interface MapEditorState {
  map: MapData;
  scale: number;
  currentTool: MapItemType;
  itemTemplates: Map<string, any>;
  selectedItem: MapItem | null;
}

class EditError extends Error {
  constructor(public field: string, public message: string) {
    super(message);
  }
}

const TERRAINS: MapTerrainType[] = [
  MapTerrainType.brick,
  MapTerrainType.spikes,
  MapTerrainType.fragile,
  MapTerrainType.supply,
];

const ENTITIES: MapEntityType[] = [
  MapEntityType.player,
  MapEntityType.scout,
  MapEntityType.guard,
  MapEntityType.archer,
  MapEntityType.wizard,
  MapEntityType.boss
];

export default class MapEditor extends React.Component<{}, MapEditorState> {
  idPool = new Map([...TERRAINS, ...ENTITIES].map(type => [type as string, { value: 0 }]));
  toolbar = React.createRef<Toolbar>();
  sidebar = React.createRef<Sidebar>();

  constructor(props: {}) {
    super(props);

    this.state = {
      map: {
        id: "level-untitled",
        width: 40,
        height: 24,
        terrains: [],
        entities: [],
        triggers: []
      },
      scale: 1.5,
      currentTool: {
        category: 'terrain',
        type: MapTerrainType.brick
      },
      itemTemplates: new Map<string, any>([
        [MapTerrainType.brick, {
          texture: "brick"
        }],
        [MapTerrainType.spikes, {
          side: 3
        }],
        [MapEntityType.player, {
          health: 6,
          maxHealth: 6
        }]
      ]),
      selectedItem: null
    };

    this.mouseHandler = this.mouseHandler.bind(this);
    this.keyHandler = this.keyHandler.bind(this);
    this.itemClickHandler = this.itemClickHandler.bind(this);
    this.itemModifyHandler = this.itemModifyHandler.bind(this);
  }

  componentDidMount() {
    window.addEventListener("keydown", this.keyHandler, false);
    window.addEventListener("keyup", this.keyHandler, false);
  }

  componentWillUnmount() {
    window.removeEventListener("keydown", this.keyHandler, false);
    window.removeEventListener("keyup", this.keyHandler, false);
  }

  mouseHandler(evt: React.MouseEvent<HTMLDivElement>) {
    evt.preventDefault();

    const [x, y] = evt.currentTarget
      .getAttribute("data-coord")!
      .split(",")
      .map(x => parseInt(x));

    switch (evt.type) {
      case 'mouseup': {
        if (evt.button === 0) {
          this.setState({ selectedItem: null });
        } else if (evt.button === 2) {
          this.placeItem(x, y);
        }
        break;
      }
    }
  }

  keyHandler(evt: KeyboardEvent) {
    if (evt.target instanceof HTMLInputElement || evt.target instanceof HTMLTextAreaElement)
      return;  
    if (evt.type === 'keydown') {
      switch (evt.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'ArrowRight':
        case 'ArrowDown': {
          const map = this.state.map;
          const item = this.state.selectedItem;
          if (!item) break;
          if (item.type === "terrain") {
            const { terrain } = item;
            if (evt.ctrlKey) {
              switch (evt.key) {
                case 'ArrowLeft':
                  if (evt.shiftKey) {
                    if (terrain.left > 0) {
                      terrain.left--; terrain.width++;
                    }
                  } else {
                    if (terrain.width > 1)
                      terrain.width--;
                  }
                  break;
                case 'ArrowRight':
                  if (evt.shiftKey) {
                    if (terrain.width > 1) {
                      terrain.left++; terrain.width--;
                    }
                  } else {
                    if (terrain.left + terrain.width < map.width)
                      terrain.width++;
                  }
                  break;
                case 'ArrowUp':
                  if (evt.shiftKey) {
                    if (terrain.top > 0) {
                      terrain.top--; terrain.height++;
                    }
                  } else {
                    if (terrain.height > 1)
                      terrain.height--;
                  }
                  break;
                case 'ArrowDown':
                  if (evt.shiftKey) {
                    if (terrain.height > 1) {
                      terrain.top++; terrain.height--;
                    }
                  } else {
                    if (terrain.top + terrain.height < map.height)
                      terrain.height++;
                  }
                  break;
              }
            } else {
              switch (evt.key) {
                case 'ArrowLeft':
                  if (terrain.left > 0)
                    terrain.left--;
                  break;
                case 'ArrowRight':
                  if (terrain.left + terrain.width < map.width)
                    terrain.left++;
                  break;
                case 'ArrowUp':
                  if (terrain.top > 0)
                    terrain.top--;
                  break;
                case 'ArrowDown':
                  if (terrain.top + terrain.height < map.height)
                    terrain.top++;
                  break;
              }
            }
            this.update();
          } else if (item.type === "entity") {
            const { entity } = item;
            let step = evt.altKey ? 1 / 8 : 1;
            switch (evt.key) {
              case 'ArrowLeft':
                entity.x -= step; break;
              case 'ArrowRight':
                entity.x += step; break;
              case 'ArrowUp':
                entity.y -= step; break;
              case 'ArrowDown':
                entity.y += step; break;
            }
            entity.x = Math.max(0, Math.min(map.width, entity.x));
            entity.y = Math.max(0, Math.min(map.height, entity.y));
            this.update();
          }
          break;
        }
        case 'r': case 'R': {
          const { selectedItem } = this.state;
          if (selectedItem?.type === 'terrain') {
            const { terrain } = selectedItem;
            if (terrain.type === MapTerrainType.spikes) {
              const { data } = terrain;
              data.side = ((data.side ?? 3) + (evt.key === 'R' ? 3 : 1)) % 4;
              this.update();
              this.sidebar.current!.itemEditor.current!.update();
            }
          }
          break;
        }
        case '1': case '2': case '3': case '4': {
          this.switchTool({
            category: 'terrain',
            type :[
              MapTerrainType.brick,
              MapTerrainType.spikes,
              MapTerrainType.fragile,
              MapTerrainType.supply
            ][parseInt(evt.key) - 1]
          });
          break;
        }
        case 'Delete': {
          const { map, selectedItem } = this.state;
          if (selectedItem?.type === 'terrain') {
            const { terrain } = selectedItem;
            map.terrains = map.terrains.filter(x => x !== terrain);
            this.setState({ selectedItem: null });
          } else if (selectedItem?.type === 'entity') {
            const { entity } = selectedItem;
            map.entities = map.entities.filter(x => x !== entity);
            this.setState({ selectedItem: null });
          }
          break;
        }
        default:
          return;
      }
    } else if (evt.type === 'keyup') {
      switch (evt.key) {
        default:
          return;
      }
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
    const tool = this.state.currentTool;

    if (tool.category === 'terrain') {
      const { type } = tool;
      this.state.map.terrains.push({
        id: this.generateItemId(type),
        class: [],
        type: type,
        left: x, top: y,
        width: 1, height: 1,
        data: JSON.parse(JSON.stringify(this.state.itemTemplates.get(type) ?? '{}'))
      });
      this.update();
    } else if (tool.category === 'entity') {
      const { type } = tool;
      this.state.map.entities.push({
        id: this.generateItemId(type),
        class: [],
        type: type,
        x: x + 0.5, y: y + 1,
        data: JSON.parse(JSON.stringify(this.state.itemTemplates.get(type) ?? '{}'))
      });
    }
  }

  switchTool(tool: MapItemType) {
    this.setState({ currentTool: tool });
  }

  itemClickHandler(item: MapItem) {
    this.setState({ selectedItem: item }, () => {
      this.sidebar.current!.itemEditor.current!.update();
    });
  }

  itemModifyHandler(data: ItemEditorData) {
    const item = this.state.selectedItem;
    if (item?.type === 'terrain') {
      const { terrain } = item;
      if (this.state.map.terrains.some(x => x !== terrain && x.id === data.id))
        throw new EditError('id', 'id already taken');
      Object.assign(terrain, data);
      this.update();
    } else if (item?.type === 'entity') {
      const { entity } = item;
      if (this.state.map.entities.some(x => x !== entity && x.id === data.id))
        throw new EditError('id', 'id already taken');
      Object.assign(entity, data);
      this.update();
    }
  }

  render() {
    const { state } = this;
    const { map, scale, selectedItem } = state;
    const PX = (px: number) => px * scale + 'em';

    return (
      <div className="MapEditor">
        <Toolbar ref={this.toolbar} parent={this} />
        <Sidebar ref={this.sidebar} parent={this} />
        <div className="container"
          style={{
            width: PX(map.width),
            height: PX(map.height)
          }}
          onContextMenu={evt => evt.preventDefault()}
        >
          <MapGrid parent={this} width={map.width} height={map.height} scale={scale} />
          {map.terrains.map(terrain => {
            const props: any = {
              key: terrain.id,
              style: {
                left: PX(terrain.left),
                top: PX(terrain.top),
                width: PX(terrain.width),
                height: PX(terrain.height)
              },
              onClick: () => this.itemClickHandler({ type: 'terrain', terrain })
            };

            const classList: string[] = ['terrain', terrain.type];
            if (selectedItem?.type === 'terrain' && terrain === selectedItem.terrain)
              classList.push('selected');
            if (terrain.type === MapTerrainType.spikes)
              classList.push(['left', 'top', 'right', 'bottom'][terrain.data.side ?? 3]);
            props.className = classList.join(' ');

            return <div {...props}></div>
          })}
          {map.entities.map(entity => {
            const props: any = {
              key: entity.id,
              style: {
                left: PX(entity.x),
                top: PX(entity.y)
              },
              onClick: () => this.itemClickHandler({ type: 'entity', entity })
            };
          })}
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
    const { map, currentTool: tool } = parent.state;

    return (
      <div className="toolbar">
        <button>{`Size: ${map.width} x ${map.height}`}</button>
        <span className="gap"></span>
        {TERRAINS.map((type) => (
          <button key={type}
            className={tool.category === 'terrain' && tool.type === type ? 'terrain active' : 'terrain'}
            onClick={() => parent.switchTool({ category: 'terrain', type })}
          >{type}</button>
        ))}
      </div>
    );
  }
}

/******** Sidebar ********/

interface SidebarState {
  leftDocked: boolean;
}

class Sidebar extends React.Component<EditorChildProps, SidebarState> {
  itemEditor = React.createRef<ItemEditor>();

  constructor(props: EditorChildProps) {
    super(props);

    this.state = {
      leftDocked: false
    };
  }

  render() {
    const { parent } = this.props;
    const { selectedItem } = parent.state;
    return (
      <div className={`sidebar ${this.state.leftDocked ? 'left' : 'right'}`}>
        <div>
          <strong>Toolbar</strong>
        </div>
        <div>
          <button onClick={() => this.setState({ leftDocked: !this.state.leftDocked })}>
            Dock to {this.state.leftDocked ? 'right' : 'left'}
          </button>
        </div>
        {selectedItem &&
          <ItemEditor ref={this.itemEditor} item={selectedItem} onModify={parent.itemModifyHandler} />
        }
      </div>
    );
  }
}

/******** ItemEditor ********/

interface ItemEditorData {
  id: string;
  class: string[];
  data: any;
}

interface ItemEditorProps {
  item: MapItem;
  onModify: (data: ItemEditorData) => void;
};

interface ItemEditorState {
  id: string;
  class: string;
  data: string;
  error: {
    fields: string[];
    message: string;
  } | null;
};

class ItemEditor extends React.Component<ItemEditorProps, ItemEditorState> {
  constructor(props: ItemEditorProps) {
    super(props);

    this.state = this.generateState();

    this.modifyHandler = this.modifyHandler.bind(this);
  }

  generateState() {
    const { item } = this.props;
    switch (item.type) {
      case 'terrain': {
        const { terrain } = item;
        return {
          id: terrain.id,
          class: terrain.class.join(','),
          data: JSON.stringify(terrain.data, null, 2),
          error: null
        };
      }
      case 'entity': {
        const { entity } = item;
        return {
          id: entity.id,
          class: entity.class.join(','),
          data: JSON.stringify(entity.data, null, 2),
          error: null
        };
      }
    }
  }

  update() {
    this.setState(this.generateState());
  }

  modifyHandler(o: any) {
    this.setState(o, () => {
      try {
        const { state } = this;
        const value = {
          id: state.id,
          class: [...new Set(state.class.split(',').filter(x => x !== ''))],
          data: null as any
        };
        if (value.id === "")
          throw new EditError("id", "id should not be empty");
        try {
          value.data = JSON.parse(state.data);
        } catch (err: any) {
          throw new EditError("data", err.message);
        }
        this.props.onModify(value);
        this.setState({ error: null });
      } catch (err: any) {
        if (err instanceof EditError) {
          this.setState({ error: { fields: [err.field], message: err.message} });
        } else {
          console.error(err);
          this.setState({ error: { fields: [], message: err.message} });
        }
      }
    });
  }

  render() {
    const { state } = this;
    return (
      <div className="TerrainEditor">
        <div>
          <strong>Selected {{ terrain: 'Terrain', entity: 'Entity' }[this.props.item.type]}</strong>
        </div>
        <div>
          <input type="text" value={state.id}
            className={state.error && state.error.fields.includes('id') ? 'error' : ''}
            onInput={evt => this.modifyHandler({ id: evt.currentTarget.value })} />
        </div>
        <div>
          <input type="text" value={state.class}
            className={state.error && state.error.fields.includes('class') ? 'error' : ''}
            onInput={evt => this.modifyHandler({ class: evt.currentTarget.value })} />
        </div>
        <div>
          <textarea value={state.data}
            className={state.error && state.error.fields.includes('data') ? 'error' : ''}
            onInput={evt => this.modifyHandler({ data: evt.currentTarget.value })} />
        </div>
        <div>
          <span style={{ fontSize: "smaller" }}>{state.error && state.error.message}</span>
        </div>
      </div>
    );
  }
}

/******** Grid ********/

interface MapGridProps extends EditorChildProps {
  width: number;
  height: number;
  scale: number;
}

class MapGrid extends React.PureComponent<MapGridProps> {
  render() {
    const { width, height, scale, parent } = this.props;
    const PX = (px: number) => px * scale + 'em';

    return (
      <table className="grid">
        <tbody>
          {new Array(height).fill(null).map((_, y) => (
            <tr key={y}>
              {new Array(width).fill(null).map((_, x) => (
                <td key={x}>
                  <div className="cell" style={{ "--size": PX(1) } as any}
                    data-coord={`${x},${y}`}
                    onMouseDown={parent.mouseHandler}
                    onMouseUp={parent.mouseHandler}
                    onMouseMove={parent.mouseHandler}
                  ></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
}
