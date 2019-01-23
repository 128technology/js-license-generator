const fs = require('fs');
const chalk = require('chalk');
const axios = require('axios');
const _ = require('lodash');
const xlsx = require('xlsx');

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
    if (licenseFile && repository) {
      const licFileSegments = licenseFile.split('/');

      const licenseLink = `${repository}/blob/master/${licFileSegments[licFileSegments.length - 1]}`;

      try {
        await axios.get(licenseLink);
      } catch (err) {
        console.log('bad', licenseLink);
        return null;
      }

      this.output[name].repository = licenseLink;
      return licenseLink;
    } else {
      return null;
    }
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
          `The following packages did not have a local LICENSE file OR a LICENSE file/text in cache: ${empties
            .toString()
            .replace(',', '\n')}`
        )
      );
    }
  }
}

class HTMLBuilder {
  constructor() {
    this.html = '';
  }

  buildHTML(licenseDefs) {
    this.html = '<!DOCTYPE html><html><head></head><body>';
    let linkOutput = '<div>';
    let bodyOutput = '<div>';

    _.forEach(licenseDefs, pkg => {
      linkOutput += `<div>${this._makeLink(pkg)}</div>`;
      bodyOutput += `<div style="margin-bottom: 20px">${this._makeLicenseEntry(pkg)}</div>`;
    });

    linkOutput += '</div>';
    this.html += linkOutput;
    bodyOutput += '</div>';
    this.html += bodyOutput;
    this.html += '</body>';
    this.html += '</html>';
  }

  write() {
    fs.writeFile('licenses.html', this.html, error => {
      if (error) {
        exit(error);
      }

      console.log(chalk.green('Wrote html licenses to licenses.html'));
    });
  }

  _makeLink({ name, version }) {
    return `<a href='#${name}'>${name} ${version}</a>`;
  }

  _makeLicenseEntry({ name, version, text }) {
    return `<div><a id='${name}'>${name} ${version}</a></div><div>${text}</div>`;
  }
}

class XLSXBuilder {
  constructor() {
    this.rows = [];
    this.csvHeaders = ['name', 'version', 'licenses', 'text'];
  }

  add(pkg) {
    this.rows.push({
      name: pkg.name,
      version: pkg.version,
      licenses: pkg.licenses,
      text: pkg.text
    });
  }

  addCached(name, version, text, licenses) {
    this.rows.push({ name, version, text, licenses });
  }

  addEmpty(name, version) {
    this.rows.push({ name, version, text: '', licenses: '' });
  }

  setHeaders(headerArray) {
    this.csvHeaders = headerArray;
  }

  convertToRows(licenseDefs) {
    this.rows = _.map(licenseDefs, licenseDef => {
      return {
        name: licenseDef.name || '',
        version: licenseDef.version || '',
        licenses: licenseDef.licenses || '',
        text: licenseDef.text || ''
      };
    });
  }

  write(name) {
    const ws = xlsx.utils.json_to_sheet(this.rows, {
      header: this.csvHeaders
    });
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'sheet1');
    const outputName = name ? name : 'output';
    xlsx.writeFile(wb, `${outputName}.csv`, { bookType: 'csv' });
  }
}

module.exports = { JSONBuilder, TextBuilder, XLSXBuilder };
