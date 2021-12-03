import React from 'react';
import './App.css';

interface AppProps {}
interface AppState {}

class App extends React.PureComponent {
  state: AppState;
  refCanvas: React.RefObject<HTMLCanvasElement> = React.createRef();

  constructor(props: AppProps) {
    super(props);
    this.state = {};
  }

  render() {
    return (
      <div className="App">
        <canvas ref={this.refCanvas}></canvas>
      </div>
    );
  }
}

export default App;
