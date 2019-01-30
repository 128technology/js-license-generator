const _ = require('lodash');
const xlsx = require('xlsx');

const MAX_CELL_CHARS = 31000;

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
    let safeText = text.slice(0, MAX_CELL_CHARS);
    this.rows.push({ name, version, text: safeText, licenses });
    safeText = text.slice(MAX_CELL_CHARS);
    while (safeText.length !== 0) {
      this.rows.push({
        name: `${name} (continued)`,
        version: '',
        licenses: '',
        text: safeText.slice(0, MAX_CELL_CHARS)
      });
      safeText = safeText.slice(MAX_CELL_CHARS);
    }
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

module.exports = { XLSXBuilder };
