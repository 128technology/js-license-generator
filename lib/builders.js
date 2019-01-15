const fs = require('fs');
const chalk = require('chalk');
const request = require('request-promise');
_ = require('lodash');

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

    const licenseText = npmPackage.text ? formatLicenseText(npmPackage.text) : '';

    this.addCached(name, version, licenseText);
  }

  buildLink(name, repository, licenseFile) {
    return new Promise((resolve) => {
      let licenseLink;
      
      if (licenseFile && repository) {
        const licFileSegments = licenseFile.split('/');
        const repoSegments = repository.split('/');
        
        licenseLink = `${repository}/blob/master/${licFileSegments[licFileSegments.length - 1]}`;
        
        request.get(licenseLink).then(
          () => {
            this.output[name].repository = licenseLink;
            resolve(licenseLink);
          },
          (err) => {
            console.log('bad', licenseLink);
            resolve(null);
          }
        );
      } else {
        return resolve(null);
      }
    });
  }

  addEmpty(name, version) {
    this.addCached(name, version, '');
  }

  write() {
    this._notifyMissing();
    fs.writeFile('licenses.json', JSON.stringify(this.output, null, 2), error => {
      if (error) {
        exit(error);
      }

      console.log(chalk.green('Wrote JSON licenses to licenses.json'));
    });
  }

  _notifyMissing() {
    let empties = [], missingRepos = [];
    _.forEach(this.output, (pkg, pkgName) => {
      if (!pkg[_.keys(_.omit(pkg, 'repository'))[0]]) {
        empties.push(pkgName);
      } else if (!pkg.repository) {
        missingRepos.push(pkgName);
      }
    });

    if (!_.isEmpty(missingRepos)) {
      console.log(
        chalk.yellow(`The following packages did not have a verifiable online LICENSE link: ${missingRepos.toString().replace(',', '\n')}`),
      );
    }
    if (!_.isEmpty(empties)) {
      console.log(
        chalk.red(`The following packages did not have a local LICENSE file OR a LICENSE file/text in cache: ${empties.toString().replace(',', '\n')}`)
      );
    }
  }
}

module.exports = { JSONBuilder, TextBuilder };
