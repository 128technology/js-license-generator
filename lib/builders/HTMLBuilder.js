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
      version: version === 'null' ? '--N/A--' : version,
      text,
      types: types ? types : '--N/A--'
    });
  }

  write(name) {
    this.html = Mustache.render(
      fs.readFileSync(path.join(__dirname, '../../templates/license-template.mst'), 'utf-8'),
      this.view
    );
    const outputName = name ? name : 'output';
    fs.writeFileSync(`${outputName}.html`, this.html);
    console.log(chalk.green(`Wrote html licenses to ${outputName}.html`));
  }
}

module.exports = { HTMLBuilder };
