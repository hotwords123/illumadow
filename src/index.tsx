import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import ImageParser from './ImageParser';
// import MapEditor from './MapEditor';
import reportWebVitals from './reportWebVitals';

const params = new URL(window.location.href).searchParams;

ReactDOM.render(
  <React.StrictMode>
    {
      params.has('imgparse') ? <ImageParser /> :
//    params.has('mapedit') ? <MapEditor /> :
      <App />
    }
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
