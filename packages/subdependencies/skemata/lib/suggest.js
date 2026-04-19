'use strict';

const lev = require('fast-levenshtein');

const bestSuggestions = (word, list) => {
  const dists = {};
  if (list.length === 0) return [];
  list.forEach(item => {
    const dist = lev.get(word, item);
    dists[item] = dist;
  });
  const _dists = Object.keys(dists).map(x => dists[x]);
  const minDist = Math.min.apply(null, _dists);
  if (minDist > 5) return [];
  return Object.keys(dists).filter(item => dists[item] === minDist);
};

module.exports = bestSuggestions;
