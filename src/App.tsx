import React from 'react';
import './App.css';
import GameManager from './GameManager';

class App extends React.PureComponent {
  refCanvas: React.RefObject<HTMLCanvasElement> = React.createRef();
  gameManager!: GameManager;

  componentDidMount() {
    this.gameManager = new GameManager(this.refCanvas.current!);
  }

  componentWillUnmount() {
    this.gameManager.cleanup();
  }

  render() {
    return (
      <div className="App">
        <canvas ref={this.refCanvas}></canvas>
        <audio src="/music/bgm.mp3" style={{ display: "none" }} autoPlay={true} loop={true}></audio>
      </div>
    );
  }
}

export default App;
