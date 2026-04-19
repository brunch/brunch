import React from 'react';
import Counter from './Counter';

export default class App extends React.Component {
  render() {
    const widget = (
      <div id="content">
        <Counter />
      </div>
    );
    return widget;
  }
}
