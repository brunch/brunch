module.exports = {
  overrides: {
    test: {
      paths: {
        public: 'tmp'
      }
    },
    meh: {
      paths: {
        public: 'public'
      }
    }
  },
  files: {},
  paths: {
    watched: ['app', 'test']
  }
};
