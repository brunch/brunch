exports.emptyShims = [
  'child_process', 'cluster', 'dgram', 'dns', 'fs', 'net', 'readline', 'repl', 'tls', 'tty'
];

exports.fileShims = {
  assert:               require.resolve('assert/'),
  buffer:               require.resolve('buffer/'),
  crypto:               require.resolve('crypto-browserify'),
  domain:               require.resolve('domain-browser'),
  events:               require.resolve('events/'),
  http:                 require.resolve('stream-http'),
  https:                require.resolve('https-browserify'),
  os:                   require.resolve('os-browserify/browser'),
  path:                 require.resolve('path-browserify'),
  process:              require.resolve('process/browser'),
  punycode:             require.resolve('punycode/'),
  querystring:          require.resolve('querystring-es3/'),
  stream:               require.resolve('stream-browserify'),
  string_decoder:       require.resolve('string_decoder/'),
  sys:                  require.resolve('util/'),
  timers:               require.resolve('timers-browserify'),
  tty:                  require.resolve('tty-browserify'),
  url:                  require.resolve('url/'),
  util:                 require.resolve('util/'),
  vm:                   require.resolve('vm-browserify'),

  _stream_duplex:       require.resolve('readable-stream/lib/_stream_duplex'),
  _stream_passthrough:  require.resolve('readable-stream/lib/_stream_passthrough'),
  _stream_readable:     require.resolve('readable-stream/lib/_stream_readable'),
  _stream_writable:     require.resolve('readable-stream/lib/_stream_writable'),
  _stream_transform:    require.resolve('readable-stream/lib/_stream_transform')
};
