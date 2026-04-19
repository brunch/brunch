var fusion = require('./../../lib/fusion');

var settings;
settings = fusion.loadSettingsFromFile('settings.yaml');
settings = fusion.loadDefaultSettings(settings);
// settings.watch = true;
fusion.run(settings);
