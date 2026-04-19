#!/usr/bin/env bash

# Force a pipeline to produce a failure return code if any command errors
set -o pipefail

echo "$TRAVIS_BRANCH"

if [ "$TRAVIS_BRANCH" == "source" ] && [ "$TRAVIS_PULL_REQUEST" == "false" ]; then
  echo "Deploying!"
  npm run prod
  cd public
  git config --global user.email "brunch@paulmillr.com"
  git config --global user.name "Brunch"
  git init
  git add .
  git commit -m "Deploy at $(date)."
  git push --force "https://${GH_TOKEN}@github.com/brunch/brunch.github.io.git" master
else
  npm run prod
fi
