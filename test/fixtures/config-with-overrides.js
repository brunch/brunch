'use strict';
module.exports = {
  overrides: {
    test: {
      paths: {
        public: 'tmp',
      },
    },
  },
  files: {},
  paths: {
    watched: ['app', 'test'],
  },
};
