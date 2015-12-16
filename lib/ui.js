const charm = require('charm')(process);
const logger = require('loggy');

process.on('exit', () => charm.cursor(true));

const animatedProgress = (level, base) => {
  var num = 0;
  const nextNum = () => [1, 2, 3, 0][num];
  const infoOffset = logger.entryFormat.length + 3 + level.length;

  const writeWithDots = () => {
    charm.left(1000);
    charm.right(infoOffset);
    charm.erase('end');
    const line = base + '...'.slice(0, num);
    num = nextNum();
    process.stdout.write(line);
  };

  logger[level](base);

  charm.cursor(false);
  charm.up(1);
  charm.right(infoOffset);
  const inv = setInterval(writeWithDots, 250);

  return () => {
    clearInterval(inv);
    num = 3;
    writeWithDots();
    charm.cursor(true);
    charm.down(1);
    charm.left(1000);
  };
};

module.exports.animatedProgress = animatedProgress;
