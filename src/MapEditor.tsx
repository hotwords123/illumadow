import React from 'react';
import { MapData, MapTerrain, MapTerrainType } from './map/interfaces';
import './MapEditor.css';

/******** MapEditor ********/

interface MapEditorState {
  map: MapData;
  scale: number;
  currentTerrain: MapTerrainType;
  terrainTemplates: Map<MapTerrainType, any>;
  selectedTerrain: MapTerrain | null;
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

export default class MapEditor extends React.Component<{}, MapEditorState> {
  terrainIds = new Map(TERRAINS.map(type => [type, { value: 0 }]));
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
      currentTerrain: MapTerrainType.brick,
      terrainTemplates: new Map([
        [MapTerrainType.brick, {
          texture: "brick"
        }],
        [MapTerrainType.spikes, {
          side: 3
        }]
      ]),
      selectedTerrain: null
    };

    this.mouseHandler = this.mouseHandler.bind(this);
    this.keyHandler = this.keyHandler.bind(this);
    this.terrainClickHandler = this.terrainClickHandler.bind(this);
    this.terrainModifyHandler = this.terrainModifyHandler.bind(this);
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
          this.setState({ selectedTerrain: null });
        } else if (evt.button === 2) {
          this.placeTerrain(x, y);
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
          const terrain = this.state.selectedTerrain;
          if (!terrain) break;
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
          break;
        }
        case 'r': case 'R': {
          const { selectedTerrain } = this.state;
          if (selectedTerrain && selectedTerrain.type === MapTerrainType.spikes) {
            const { data } = selectedTerrain;
            data.side = ((data.side ?? 3) + (evt.key === 'R' ? 3 : 1)) % 4;
            this.update();
            this.sidebar.current!.terrainEditor.current!.update();
          }
          break;
        }
        case '1': case '2': case '3': case '4': {
          this.switchTerrain([
            MapTerrainType.brick,
            MapTerrainType.spikes,
            MapTerrainType.fragile,
            MapTerrainType.supply
          ][parseInt(evt.key) - 1]);
          break;
        }
        case 'Delete': {
          const { map, selectedTerrain } = this.state;
          if (selectedTerrain) {
            map.terrains = map.terrains.filter(x => x !== selectedTerrain);
            this.setState({ selectedTerrain: null });
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

  generateTerrainId(type: MapTerrainType) {
    return `${type}-${++this.terrainIds.get(type)!.value}`;
  }

  placeTerrain(x: number, y: number) {
    const type = this.state.currentTerrain;

    this.state.map.terrains.push({
      id: this.generateTerrainId(type),
      class: [],
      type: type,
      left: x, top: y,
      width: 1, height: 1,
      data: JSON.parse(JSON.stringify(this.state.terrainTemplates.get(type)))
    });
    this.update();
  }

  switchTerrain(type: MapTerrainType) {
    this.setState({ currentTerrain: type });
  }

  terrainClickHandler(terrain: MapTerrain) {
    this.setState({ selectedTerrain: terrain }, () => {
      this.sidebar.current!.terrainEditor.current!.update();
    });
  }

  terrainModifyHandler(data: TerrainEditorData) {
    const terrain = this.state.selectedTerrain!;
    if (this.state.map.terrains.some(x => x !== terrain && x.id === data.id))
      throw new EditError('id', 'id already taken');
    Object.assign(terrain, data);
    this.update();
  }

  render() {
    const { state } = this;
    const { map, scale } = state;
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
              onClick: () => this.terrainClickHandler(terrain)
            };

            const classList: string[] = ['terrain', terrain.type];
            if (terrain === state.selectedTerrain)
              classList.push('selected');
            if (terrain.type === MapTerrainType.spikes)
              classList.push(['left', 'top', 'right', 'bottom'][terrain.data.side ?? 3]);
            props.className = classList.join(' ');

            return <div {...props}></div>
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
    const { map, currentTerrain } = parent.state;

    return (
      <div className="toolbar">
        <button>{`Size: ${map.width} x ${map.height}`}</button>
        <span className="gap"></span>
        {TERRAINS.map((type) => (
          <button key={type} className={type === currentTerrain ? 'terrain active' : 'terrain'}
            onClick={() => parent.switchTerrain(type)}
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
  terrainEditor = React.createRef<TerrainEditor>();

  constructor(props: EditorChildProps) {
    super(props);

    this.state = {
      leftDocked: false
    };
  }

  render() {
    const { parent } = this.props;
    const { selectedTerrain } = parent.state;
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
        {selectedTerrain &&
          <TerrainEditor ref={this.terrainEditor} terrain={selectedTerrain} onModify={parent.terrainModifyHandler} />
        }
      </div>
    );
  }
}

/******** TerrainEditor ********/

interface TerrainEditorData {
  id: string;
  class: string[];
  data: any;
}

interface TerrainEditorProps {
  terrain: MapTerrain;
  onModify: (data: TerrainEditorData) => void;
};

interface TerrainEditorState {
  id: string;
  class: string;
  data: string;
  error: {
    fields: string[];
    message: string;
  } | null;
};

class TerrainEditor extends React.Component<TerrainEditorProps, TerrainEditorState> {
  constructor(props: TerrainEditorProps) {
    super(props);

    this.state = this.generateState();

    this.modifyHandler = this.modifyHandler.bind(this);
  }

  generateState() {
    const { terrain } = this.props;
    return {
      id: terrain.id,
      class: terrain.class.join(','),
      data: JSON.stringify(terrain.data, null, 2),
      error: null
    };
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
          <strong>Selected Terrain</strong>
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
