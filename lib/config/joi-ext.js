'use strict';
const Joi = require('joi');
const anymatch = require('./joi-anymatch');
const j = Joi.extend(anymatch);

j.int = () => j.number().integer();
j.obj = keys => j.object(keys).default();
j.hash = vals => j.obj().pattern(/./, vals);
j.alt = (...vals) => j.compile(vals);

j.set = items => {
  return j.array()
    .items(items)
    .single()
    .unique()
    .default([]);
};

module.exports = j;
