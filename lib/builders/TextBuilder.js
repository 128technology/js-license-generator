const fs = require('fs');
const chalk = require('chalk');
const { formatLicenseText } = require('../util');

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
    if (text) {
      this.output += formatLicenseText(text);
    }
    this.output += '\n\n';
  }

  add(npmPackage) {
    const packageID = TextBuilder.getPackageIdentifier(npmPackage);

    this.output += TextBuilder.getPackageHeader(packageID);

    if (npmPackage.text) {
      this.output += formatLicenseText(npmPackage.text);
    }

    this.output += '\n\n';
  }

  addEmpty(name, version) {
    this.addCached(name, version, '');
  }

  write() {
    fs.writeFileSync('licenses.txt', this.output);
    console.log(chalk.green('Wrote text licenses to licenses.txt'));
  }
}

module.exports = { TextBuilder };
