#!/usr/bin/env node

/* eslint no-console: "off"*/

const nlf = require('nlf');
const fs = require('fs');
const minimist = require('minimist');

function getPackageIdentifier(npmPackage) {
  return `${npmPackage.name}@${npmPackage.version}`;
}

function getPackageHeader(packageID) {
  let header = '';

  header += '=====================================================\n';
  header += `${packageID}\n`;
  header += '=====================================================\n';

  return header;
}

const argv = minimist(process.argv, {
  default: {
    directory: process.cwd(),
  },
});

if (argv.help) {
  console.log('Usage:');
  console.log('license-generator [arguments]');
  console.log();
  console.log('Arguments:');
  console.log('--directory=<dir>    The directory to search.');
  console.log('--production         Search for licenses on production dependencies. Default is development.');
  console.log('--help               This help.');
  process.exit(0);
}

const production = !!argv.production;
const directory = argv.directory;
console.log(`Searching for ${production ? 'production' : 'development'} licenses in ${directory}`);

nlf.find({ directory, production }, (err, npmPackages) => {
  if (err) {
    console.log('NLF Failed.');
    process.exit(-1);
    return;
  }

  let output = '';

  for (let i = 0, lenI = npmPackages.length; i < lenI; i += 1) {
    const npmPackage = npmPackages[i];
    const packageID = getPackageIdentifier(npmPackage);

    if (npmPackage.name === 'nlf') {
      console.log('License source for %s must be manually included.', packageID);
    } else {
      const sources = npmPackage.licenseSources.license.sources;

      output += getPackageHeader(packageID);

      if (sources.length > 0) {
        for (let j = 0, lenJ = sources.length; j < lenJ; j += 1) {
          const licenseText = sources[j].text;
          output += licenseText;
        }
      } else if (npmPackage.licenseSources.package.sources.length > 0) {
        const packageSources = npmPackage.licenseSources.package.sources.map(source => source.license).join(', ');

        console.log('License source not found for %s, derived license types are: %s.', packageID, packageSources);
      } else {
        console.log(`License could not be detected for package ${packageID}.`);
      }

      output += '\n\n';
    }
  }

  fs.writeFile('licenses.txt', output, (error) => {
    if (error) {
      console.error(error);
      process.exit(-1);
      return;
    }

    console.log('Wrote licenses.txt');
  });
});
