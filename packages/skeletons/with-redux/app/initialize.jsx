import ReactDOM from 'react-dom';
import React from 'react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import counterApp from './reducers';
import App from './components/App';

const store = createStore(counterApp, module.hot && module.hot.data && (module.hot.data.counter || 0));

if (module.hot) {
  module.hot.accept('./reducers', () => {
    store.replaceReducer(require('./reducers').default); // eslint-disable-line
  });
  module.hot.accept();

  module.hot.dispose((data) => {
    data.counter = store.getState(); // eslint-disable-line
    [].slice.apply(document.querySelector('#app').children).forEach(c => c.remove());
  });
}

const load = () => {
  ReactDOM.render(
    <Provider store={store}>
      <App />
    </Provider>,
    document.querySelector('#app')
  );
};

if (document.readyState !== 'complete') {
  document.addEventListener('DOMContentLoaded', load);
} else {
  load();
}
