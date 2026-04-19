#!/usr/bin/env node

'use strict';

const jsonPaths = ['./app/assets/plugins.json', './app/assets/manifest.json'];

jsonPaths.forEach(file => {
  try {
    const content = require(file);
    JSON.stringify(content);
  } catch(error) {
    error.message = `Failed parsing ${file}, make sure it has valid syntax\n`;
    throw error;
  }
});