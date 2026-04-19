const {checkDeps, installDeps} = require('.');

(async () => {
  const root = '/Developer/br/brunch'
  const packages = await checkDeps(root);
  if (packages.length > 0) await installDeps(root);
})();
