const _ = require('lodash');
const xlsx = require('xlsx');

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

module.exports = { XLSXBuilder };
