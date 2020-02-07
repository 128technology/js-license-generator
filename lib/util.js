const axios = require('axios');
const _ = require('lodash');

function exit(message) {
  console.error(message);
  process.exit(-1);
}

function parseReadmeLicenseText(licenses, text) {
  const licenseIndex = text ? text.toLowerCase().indexOf('license') : -1;
  const licenseText = licenseIndex > -1 ? text.substr(licenseIndex).trim() : '';

  const types = {
    MIT: licenseText.includes('MIT'),
    CC0: licenseText.includes('CC0'),
    'BSD-3-Clause': licenseText.includes('name of the copyright holder nor the names of its contributors'),
    'BSD-2-Clause': licenseText.includes('binary form must reproduce the above copyright notice'),
    ISC: licenseText.includes('SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS')
  };
  if (types['BSD-3-Clause']) {
    types['BSD-2-Clause'] = false;
  }
  const parsedLicenseTypeRaw = _.keys(_.pickBy(types))[0];
  const parsedLicenseType = typeof parsedLicenseTypeRaw === 'string' ? parsedLicenseTypeRaw : '';

  return { readmeText: licenseText, licenseTypes: (licenses || parsedLicenseType) + '**' };
}

function formatLicenseText(text) {
  return text.trim().replace(/\r/g, '');
}

async function downloadLicenseFile(name, npmPackage) {
  const { repository } = npmPackage;

  const [user, pkg] = repository.split('github.com/')[1].split('/');

  const licenseLinks = [
    `https://raw.githubusercontent.com/${user}/${pkg}/master/LICENSE`,
    `https://raw.githubusercontent.com/${user}/${pkg}/master/LICENSE.md`,
    `https://raw.githubusercontent.com/${user}/${pkg}/latest/LICENSE`,
    `https://raw.githubusercontent.com/${user}/${pkg}/latest/LICENSE.md`
  ];

  let val;
  for (const licenseLink of licenseLinks) {
    try {
      val = await axios.get(licenseLink);
      return val.data;
    } catch (e) {
      _.noop();
    }
  }
  return null;
}

module.exports = { exit, formatLicenseText, downloadLicenseFile, parseReadmeLicenseText };
