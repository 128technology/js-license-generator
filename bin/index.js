#!/usr/bin/env node

const fs = require('fs');
const minimist = require('minimist');
const _ = require('lodash');
const chalk = require('chalk');
const lc = require('license-checker');

const { TextBuilder, JSONBuilder } = require('../lib/builders');
const { exit, downloadLicenseFile, parseReadmeLicenseText } = require('../lib/util');

const argv = minimist(process.argv, {
  default: {
    directory: process.cwd()
  }
});

if (argv.help) {
  console.log('Usage:');
  console.log('license-generator [arguments]');
  console.log();
  console.log('Description:');
  console.log('Runs through a project containing node_modules and attempts to gather the license information.');
  console.log('Outputs a json and plain text version of all module licenses.');
  console.log();
  console.log('Arguments:');
  console.log('--directory=<dir>        The directory to search.');
  console.log('--cacheFile=<path>       An absolute path to a JSON cache file for looking up missing licenses.');
  console.log('--ignore=<name1, name2>  Comma separated package names to ignore.');
  console.log('--production             Search for licenses on production dependencies. Default is development.');
  console.log(
    '--links                  Check online for a reference of the license from the default github location and add it to the package output.'
  );
  console.log('--readme                 Use the readme as a fallback when LICENSE is not available.');
  console.log(
    '--readmeParse           Like --readme, but attempts to strip non-license info from known license types.'
  );
  console.log('--download               Attempt to download and save licence info from repository.');
  console.log('--help                   This help.');
  process.exit(0);
}

const production = !!argv.production;
const readmeParse = !!argv.readmeParse;
const readme = !!argv.readme;
const links = !!argv.links;
const download = !!argv.download;
const { directory, cacheFile, ignore } = argv;

const ignoreSet = ignore ? new Set(ignore.split(',')) : new Set();
const cache = cacheFile ? JSON.parse(fs.readFileSync(cacheFile, 'utf-8')) : null;

console.log(`Searching for ${production ? 'production' : 'development'} licenses in ${directory}`);

const SaveType = {
  ADD: 'ADD',
  CACHED: 'CACHED',
  EMPTY: 'EMPTY'
};

const parsePackage = async (rawPackage, packageID) => {
  const name = _.initial(packageID.split('@')).join('@');
  const version = _.last(packageID.split('@'));

  const npmPackage = {
    ...rawPackage,
    name: rawPackage.name || name,
    version: rawPackage.version || version
  };
  if (ignoreSet.has(name)) {
    return [];
  }

  const licenseFile = npmPackage.licenseFile || '';

  const licenseIsReadme = licenseFile.toLowerCase().indexOf('readme') > -1;

  const text = licenseFile.length > 0 ? fs.readFileSync(licenseFile, 'utf-8') : null;

  if (!licenseIsReadme && text) {
    return [SaveType.ADD, { ...npmPackage, text }];
  }
  if (cache && _.get(cache, [name, version], null)) {
    console.log(chalk.gray(`License found in cache for ${packageID}.`));

    const cachedDefinition = _.get(cache, [name, version], null);

    return [SaveType.CACHED, { name, version, cached: cachedDefinition }];
  }
  if (cache && _.get(cache, [name], null)) {
    console.log(chalk.yellow(`License found in cache for a different version of ${packageID}.`));

    const lastVersionDefinition = _.last(_.values(_.get(cache, [name], null)));

    return [SaveType.CACHED, { name, version, cached: lastVersionDefinition }];
  }
  if (download) {
    const val = await downloadLicenseFile(name, npmPackage);
    if (val) {
      console.log(chalk.cyan(`License downloaded from github - ${packageID}.`));
      return [SaveType.ADD, { ...npmPackage, text: val }];
    }
  }
  if (licenseIsReadme && readmeParse && text) {
    const { readmeText, licenseTypes } = parseReadmeLicenseText(npmPackage.licenses, text);
    if (readmeText) {
      console.log(chalk.magenta(`License found and parsed from ${packageID} README.`));
      return [SaveType.ADD, { ...npmPackage, text: readmeText, licenses: licenseTypes }];
    }
  }
  if (licenseIsReadme && readme && text) {
    console.log(chalk.hex('#cc22aa')(`License found and parsed from ${packageID} README.`));
    return [SaveType.ADD, { ...npmPackage, text }];
  }
  if (_.get(npmPackage, 'license', '').length > 0) {
    const packagelicenseFile = `${_.get(npmPackage, 'license')}`;

    console.log(
      chalk.red(
        `License source not found for ${packageID}, but the package specifies a license: ${packagelicenseFile}.`
      )
    );

    return [SaveType.EMPTY, { name, version }];
  }

  console.log(chalk.red(`License could not be detected for package ${packageID}.`));

  return [SaveType.EMPTY, { name, version }];
};

const runParser = async (err, npmPackages) => {
  if (err) {
    exit(err);
  }

  const jsonBuilder = new JSONBuilder();
  const builders = [new TextBuilder(), jsonBuilder];

  for (const packageID in npmPackages) {
    const npmPackage = npmPackages[packageID];
    const [type, data] = await parsePackage(npmPackage, packageID);

    if (data) {
      const { name, version, cached } = data;
      switch (type) {
        case SaveType.ADD:
          builders.forEach(builder => builder.add(data));
          break;
        case SaveType.CACHED:
          builders.forEach(builder => builder.addCached(name, version, cached));
          break;
        case SaveType.EMPTY:
          builders.forEach(builder => builder.addEmpty(name, version));
          break;
        default:
          throw `${type} is not a package build operation! - ${packageID}`;
      }

      if (links) {
        await jsonBuilder.buildLink(
          _.initial(packageID.split('@')).join('@'),
          npmPackage.repository,
          npmPackage.licenseFile
        );
      }
    }
  }

  builders.forEach(builder => {
    builder.write();
  });
};

lc.init({ start: directory, production }, runParser);
