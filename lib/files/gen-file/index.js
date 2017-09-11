'use strict';
const joinTo = require('./join-to');
const entryPoints = require('./entry-points');
const config = require('../../config');

// js - EP
// css - EP
// css - JT

comment: str => `// ${str}`
comment: str => `/* ${str} */`
