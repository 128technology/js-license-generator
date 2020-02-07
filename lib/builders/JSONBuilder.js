const fs = require('fs');
const chalk = require('chalk');
const axios = require('axios');
const _ = require('lodash');
const { formatLicenseText } = require('../util');

class JSONBuilder {
  constructor() {
    this.output = {};
    this.shouldNotifyLinks = false;
  }

  addCached(name, version, text, types) {
    if (!this.output[name]) {
      this.output[name] = {};
    }

    this.output[name] = {
      [version]: formatLicenseText(text),
      types
    };
  }

  add(npmPackage) {
    const { name, version } = npmPackage;

    const licenseText = npmPackage.text ? formatLicenseText(npmPackage.text) : '';

    const types = npmPackage.licenses ? npmPackage.licenses : '';

    this.addCached(name, version, licenseText, types);
  }

  async buildLink(name, repository, licenseFile) {
    this.shouldNotifyLinks = true;
    if (!licenseFile || !repository) {
      return null;
    }
    const licFileSegments = licenseFile.split('/');

    const licenseLink = `${repository}/blob/master/${licFileSegments[licFileSegments.length - 1]}`;

    try {
      await axios.get(licenseLink);
    } catch (err) {
      console.log('Could not resolve license file at the following location: ', licenseLink);
      return null;
    }

    this.output[name].repository = licenseLink;
    return licenseLink;
  }

  addEmpty(name, version) {
    this.addCached(name, version, '');
  }

  write() {
    this._notifyMissing();
    fs.writeFileSync('licenses.json', JSON.stringify(this.output, null, 2));
    console.log(chalk.green('Wrote JSON licenses to licenses.json'));
  }

  _notifyMissing() {
    let empties = [],
      missingRepos = [];
    _.forEach(this.output, (pkg, pkgName) => {
      if (!pkg[_.keys(_.omit(pkg, 'repository'))[0]]) {
        empties.push(pkgName);
      } else if (!pkg.repository) {
        missingRepos.push(pkgName);
      }
    });

    if (this.shouldNotifyLinks && !_.isEmpty(missingRepos)) {
      console.log(
        chalk.yellow(
          `The following packages did not have a verifiable online LICENSE link: ${missingRepos
            .toString()
            .replace(',', '\n')}`
        )
      );
    }
    if (!_.isEmpty(empties)) {
      console.log(
        chalk.red(
          `The following packages appear to have no license data: \n ${empties.toString().replace(/,/gi, '\n')}`
        )
      );
    }
  }
}

module.exports = { JSONBuilder };
