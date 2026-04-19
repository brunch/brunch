describe('Plugin', function() {
  var plugin;

  beforeEach(function() {
    plugin = new Plugin({paths: {public: 'public/'}});
  });

  it('should be an object', function() {
    expect(plugin).to.be.ok;
  });

  it('should has #onCompile method', function() {
    expect(plugin.onCompile).to.be.an.instanceof(Function);
  });
});
