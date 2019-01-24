const fs = require('fs');
const chalk = require('chalk');
const _ = require('lodash');

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
    fs.writeFileSync('licenses.html', this.html);
    console.log(chalk.green('Wrote html licenses to licenses.html'));
  }

  _makeLink({ name, version }) {
    return `<a href='#${name}'>${name} ${version}</a>`;
  }

  _makeLicenseEntry({ name, version, text }) {
    return `<div><a id='${name}'>${name} ${version}</a></div><div>${text}</div>`;
  }
}

module.exports = { HTMLBuilder };
