const fs = require('fs');
const chalk = require('chalk');
const _ = require('lodash');
const path = require('path');
const Mustache = require('mustache');

class HTMLBuilder {
  constructor() {
    this.html = '';
    this.view = {
      links: []
    };
  }

  addCached(name, version, text, types) {
    this.view.links.push({
      name,
      version: version === 'null' ? '' : version,
      text,
      types
    });
  }

  write(name) {
    this.html = Mustache.render(fs.readFileSync(path.resolve('templates/license-template.mst'), 'utf-8'), this.view);
    const outputName = name ? name : 'output';
    fs.writeFileSync(`${outputName}.html`, this.html);
    console.log(chalk.green(`Wrote html licenses to ${outputName}.html`));
  }

  _makeLink({ name, version }) {
    return `<a href='#${name}'>${name} ${version}</a>`;
  }

  _makeLicenseEntry({ name, version, text }) {
    return `<div><a id='${name}'>${name} ${version}</a></div><div>${text}</div>`;
  }
}

module.exports = { HTMLBuilder };
