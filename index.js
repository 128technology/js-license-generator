#!/usr/bin/env node

const nlf = require('nlf');
const fs = require('fs');
const minimist = require('minimist');
const _ = require('lodash');
const chalk = require('chalk');

const { TextBuilder, JSONBuilder } = require('./lib/builders');
const { exit } = require('./lib/util');

const argv = minimist(process.argv, {
  default: {
    directory: process.cwd()
  }
});

if (argv.help) {
  console.log('Usage:');
  console.log('license-generator [arguments]');
  console.log();
  console.log('Arguments:');
  console.log('--directory=<dir>        The directory to search.');
  console.log('--cacheFile=<path>       An absolute path to a JSON cache file for looking up missing licenses.');
  console.log('--ignore=<name1, name2>  Comma separated package names to ignore.');
  console.log('--production             Search for licenses on production dependencies. Default is development.');
  console.log('--help                   This help.');
  process.exit(0);
}

const production = !!argv.production;
const { directory, cacheFile, ignore } = argv;

const ignoreSet = ignore ? new Set(ignore.split(',')) : new Set();
const cache = cacheFile ? JSON.parse(fs.readFileSync(cacheFile, 'utf-8')) : null;

console.log(`Searching for ${production ? 'production' : 'development'} licenses in ${directory}`);

nlf.find({ directory, production }, (err, npmPackages) => {
  if (err) {
    exit(err);
  }

  const builders = [new TextBuilder(), new JSONBuilder()];

  npmPackages.forEach(npmPackage => {
    const { name, version } = npmPackage;

    if (ignoreSet.has(name)) {
      return;
    }

    const packageID = TextBuilder.getPackageIdentifier(npmPackage);
    const sources = _.get(npmPackage, 'licenseSources.license.sources', []);

    if (sources.length > 0) {
      builders.forEach(builder => {
        builder.add(npmPackage);
      });
    } else if (cache && _.get(cache, [name, version], null)) {
      console.log(chalk.gray(`License found in cache for ${packageID}.`));

      const cachedDefinition = _.get(cache, [name, version], null);

      builders.forEach(builder => {
        builder.addCached(name, version, cachedDefinition);
      });
    } else if (cache && _.get(cache, [name], null)) {
      console.log(chalk.yellow(`License found in cache for a different version of ${packageID}.`));

      const lastVersionDefinition = _.last(_.values(_.get(cache, [name], null)));

      builders.forEach(builder => {
        builder.addCached(name, version, lastVersionDefinition);
      });
    } else if (_.get(npmPackage, 'licenseSources.package.sources', []).length > 0) {
      const packageSources = _.get(npmPackage, 'licenseSources.package.sources', [])
        .map(({ license }) => license)
        .join(', ');

      console.log(
        chalk.red(`License source not found for ${packageID}, derived license types are: ${packageSources}.`)
      );

      builders.forEach(builder => {
        builder.addEmpty(name, version);
      });
    } else {
      console.log(chalk.red(`License could not be detected for package ${packageID}.`));

      builders.forEach(builder => {
        builder.addEmpty(name, version);
      });
    }
  });

  builders.forEach(builder => {
    builder.write();
  });
});
