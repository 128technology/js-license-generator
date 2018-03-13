const fs = require('fs');
const chalk = require('chalk');

const { exit } = require('./util');

function formatLicenseText(text) {
  return text.trim().replace(/\r/g, '');
}

class TextBuilder {
  constructor() {
    this.output = '';
  }

  static getPackageHeader(packageID) {
    let header = '';

    header += '=====================================================\n';
    header += `${packageID}\n`;
    header += '=====================================================\n';

    return header;
  }

  static getPackageIdentifier(npmPackage) {
    const { name, version } = npmPackage;

    return `${name}@${version}`;
  }

  addCached(name, version, text) {
    const packageID = TextBuilder.getPackageIdentifier({ name, version });

    this.output += TextBuilder.getPackageHeader(packageID);
    this.output += formatLicenseText(text);
    this.output += '\n\n';
  }

  add(npmPackage) {
    const packageID = TextBuilder.getPackageIdentifier(npmPackage);
    const sources = npmPackage.licenseSources.license.sources;

    this.output += TextBuilder.getPackageHeader(packageID);

    sources.forEach(({ text }) => {
      this.output += formatLicenseText(text);
    });

    this.output += '\n\n';
  }

  addEmpty(name, version) {
    this.addCached(name, version, '');
  }

  write() {
    fs.writeFile('licenses.txt', this.output, error => {
      if (error) {
        exit(error);
      }

      console.log(chalk.green('Wrote text licenses to licenses.txt'));
    });
  }
}

class JSONBuilder {
  constructor() {
    this.output = {};
  }

  addCached(name, version, text) {
    if (!this.output[name]) {
      this.output[name] = {};
    }

    this.output[name][version] = formatLicenseText(text);
  }

  add(npmPackage) {
    const { name, version } = npmPackage;
    const sources = npmPackage.licenseSources.license.sources;

    const licenseText = formatLicenseText(sources.reduce((acc, source) => `${acc}${source.text}`, ''));

    this.addCached(name, version, licenseText);
  }

  addEmpty(name, version) {
    this.addCached(name, version, '');
  }

  write() {
    fs.writeFile('licenses.json', JSON.stringify(this.output, null, 2), error => {
      if (error) {
        exit(error);
      }

      console.log(chalk.green('Wrote JSON licenses to licenses.json'));
    });
  }
}

module.exports = { JSONBuilder, TextBuilder };
