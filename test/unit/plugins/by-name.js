'use strict';
const init = require('./__plugins');
const trap = names => {
  return names.reduce((plugins, name) => {
    return Object.defineProperty(plugins, name, {
      get: () => {
        throw new Error(`Expected "${name}" not to be required.`);
      },
    });
  }, {});
};

describe('plugins: filtering by name', () => {
  it('does not require itself', () => {
    init({
      modules: trap([
        'brunch',
      ]),
    });
  });

  it('does not require dotfiles', () => {
    init({
      modules: trap([
        '.brunch-plugin',
      ]),
    });
  });

  it('does not require modules without "brunch" in name', () => {
    init({
      modules: trap([
        'plugin',
      ]),
    });
  });

  it('does not require deprecated plugins', () => {
    init({
      modules: trap([
        'javascript-brunch',
        'css-brunch',
      ]),
    });
  });

  it('does not require plugins listed in `config.plugins.off`', () => {
    const name = 'brunch-plugin';

    init({
      modules: trap([
        name,
      ]),
      config: {
        plugins: {
          off: name,
        },
      },
    });
  });

  it('requires only plugins listed in `config.plugins.only`', () => {
    init({
      modules: trap([
        'brunch-plugin',
      ]),
      config: {
        plugins: {
          only: 'brunch-other-plugin',
        },
      },
    });
  });
});
