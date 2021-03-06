#!/usr/bin/env node

const fs = require('fs');
const minimist = require('minimist');
const _ = require('lodash');
const chalk = require('chalk');
const semver = require('semver');
const { XLSXBuilder, CSVBuilder, HTMLBuilder } = require('../lib/builders');

const argv = minimist(process.argv);

if (argv.help) {
  console.log('Usage:');
  console.log('license-json-converter [arguments]');
  console.log();
  console.log('Description:');
  console.log('Converts a json license file into another supported format (default CSV).');
  console.log('Supported formats: CSV, XLSX, HTML');
  console.log(
    'The json license file should be formatted like the ones that js-license-generator or license-parser makes.'
  );
  console.log();
  console.log('Arguments:');
  console.log('--name=<string>                                    The name of the output file (default is "output".)');
  console.log(
    '--cacheFile=<path>                                 An absolute path to a text based license file, typically one generated by the license generator.'
  );
  console.log('--formats=<format1, format2...>                    Specify output format(s)');
  console.log('--help                                             This help.');
  process.exit(0);
}

const { name, cacheFile, formats } = argv;
const formatArray = formats ? formats.toLowerCase().split(',') : ['csv'];

const licenses = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
const builders = [];
if (formatArray.includes('xlsx')) {
  builders.push(new XLSXBuilder());
}
if (formatArray.includes('csv')) {
  builders.push(new CSVBuilder());
}
if (formatArray.includes('html')) {
  builders.push(new HTMLBuilder());
}

const outputName = name ? name : 'output';

_.forEach(licenses, (pkg, pkgName) => {
  const versionText = _.omit(pkg, ['repository', 'types']);
  const versions = _.keys(versionText);
  const version = _.reduce(versions, (result, value) => {
    if (semver.gt(result, value)) {
      return result;
    }
    return value;
  });
  const text = pkg[version];
  let types = pkg.types ? pkg.types : '';
  types = Array.isArray(types) ? types.join(',') : types;

  builders.forEach(builder => {
    builder.addCached(pkgName, version, text, types);
  });
});

builders.forEach(builder => {
  builder.write(outputName);
});
console.log(chalk.green(`Wrote files ${outputName} in the following formats: ${formatArray.join(',')}`));
