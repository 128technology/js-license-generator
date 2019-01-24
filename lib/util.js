function exit(message) {
  console.error(message);
  process.exit(-1);
}

function formatLicenseText(text) {
  return text.trim().replace(/\r/g, '');
}

module.exports = { exit, formatLicenseText };
