'use strict';

const filterItems = (items, search, attributes) => {
  const searchRes = search
    .split(' ')
    .filter(expr => expr !== '')
    .map(expr => new RegExp(expr, 'i'));

  if (searchRes.length === 0) return items;

  return items.filter(item => {
    const itemString = attributes.map(attr => item[attr]).join(' ');
    return searchRes.every(searchRe => searchRe.test(itemString));
  });
};

const compare = (order, key) => (i1, i2) => {
  const id1 = order.indexOf(i1[key]);
  const id2 = order.indexOf(i2[key]);

  if (id1 !== -1 && id2 !== -1) {
    return id1 > id2 ? 1 : -1;
  }

  return id1 ? 1 : id2 ? -1 : i1[key].localeCompare(i2[key]);
};

module.exports = {
  filterItems,
  compare,
};
