'use strict';
const logger = require('loggy');

const animatedProgress = (level, base) => {
  const charm = require('charm')(process);

  var num = 0;
  const nextNum = () => [1, 2, 3, 0][num];
  const infoOffset = logger.entryFormat.length + 3 + level.length;

  const farLeft = 1000;
  const animationInterval = 250;

  const writeWithDots = () => {
    charm.left(farLeft);
    charm.right(infoOffset);
    charm.erase('end');
    const line = base + '...'.slice(0, num);
    num = nextNum();
    process.stdout.write(line);
  };

  const exitCb = () => {
    charm.cursor(true);
    charm.end();
  };
  process.on('exit', exitCb);

  logger[level](base);

  charm.cursor(false);
  charm.up(1);
  charm.right(infoOffset);
  const inv = setInterval(writeWithDots, animationInterval);

  return () => {
    clearInterval(inv);
    process.removeListener('exit', exitCb);
    num = 3;
    writeWithDots();
    charm.cursor(true);
    charm.down(1);
    charm.left(farLeft);
    charm.end();
  };
};

exports.animatedProgress = animatedProgress;
