'use strict';
const Joi = require('joi');
const anymatch = require('./joi-anymatch');
const j = Joi.extend(anymatch);

j.set = items => {
  return j.array()
    .items(items || j.any())
    .single()
    .unique()
    .default([]);
};

j.hash = vals => {
  return j.object()
    .pattern(/(?:)/, vals || j.any())
    .default();
};

module.exports = j;
