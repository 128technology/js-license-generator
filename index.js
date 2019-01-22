#!/usr/bin/env node

const fs = require("fs");
const minimist = require("minimist");
const _ = require("lodash");
const chalk = require("chalk");
const lc = require("license-checker");

const { TextBuilder, JSONBuilder, XLSXBuilder } = require("./lib/builders");
const { exit } = require("./lib/util");

const argv = minimist(process.argv, {
  default: {
    directory: process.cwd()
  }
});

if (argv.help) {
  console.log("Usage:");
  console.log("license-generator [arguments]");
  console.log();
  console.log("Arguments:");
  console.log("--directory=<dir>        The directory to search.");
  console.log(
    "--cacheFile=<path>       An absolute path to a JSON cache file for looking up missing licenses."
  );
  console.log(
    "--ignore=<name1, name2>  Comma separated package names to ignore."
  );
  console.log(
    "--production             Search for licenses on production dependencies. Default is development."
  );
  console.log(
    "--links                  Check online for a reference of the license from the default github location and add it to the package output."
  );
  console.log(
    "--readme                 Use the readme as a fallback when LICENSE is not available."
  );
  console.log("--help                   This help.");
  process.exit(0);
}

const production = !!argv.production;
const readme = !!argv.readme;
const links = !!argv.links;
const { directory, cacheFile, ignore } = argv;

const ignoreSet = ignore ? new Set(ignore.split(",")) : new Set();
const cache = cacheFile
  ? JSON.parse(fs.readFileSync(cacheFile, "utf-8"))
  : null;

console.log(
  `Searching for ${
    production ? "production" : "development"
  } licenses in ${directory}`
);

let promises = [];

lc.init({ start: directory, production }, (err, npmPackages) => {
  if (err) {
    exit(err);
  }

  const jsonBuilder = new JSONBuilder();
  const builders = [new TextBuilder(), jsonBuilder];

  _.forEach(npmPackages, (npmPackage, nameVer) => {
    const name = _.initial(nameVer.split("@")).join("@");
    const version = _.last(nameVer.split("@"));

    npmPackage.name = npmPackage.name ? npmPackage.name : name;
    npmPackage.version = npmPackage.version ? npmPackage.version : version;
    if (ignoreSet.has(name)) {
      return;
    }

    const packageID = nameVer;
    const licenseFile = npmPackage.licenseFile || "";

    let hasReadme = false;
    if (!readme) {
      hasReadme = licenseFile.toLowerCase().indexOf("readme") > -1;
      if (hasReadme) {
        npmPackage.licenseFile = "";
      }
    }

    const text =
      licenseFile.length > 0 && (readme || !hasReadme)
        ? fs.readFileSync(licenseFile, "utf-8")
        : null;

    if (licenseFile.length > 0 && text) {
      builders.forEach(builder => {
        npmPackage.text = text;
        builder.add(npmPackage);
      });
    } else if (cache && _.get(cache, [name, version], null)) {
      console.log(chalk.gray(`License found in cache for ${packageID}.`));

      const cachedDefinition = _.get(cache, [name, version], null);

      builders.forEach(builder => {
        builder.addCached(name, version, cachedDefinition);
      });
    } else if (cache && _.get(cache, [name], null)) {
      console.log(
        chalk.yellow(
          `License found in cache for a different version of ${packageID}.`
        )
      );

      const lastVersionDefinition = _.last(
        _.values(_.get(cache, [name], null))
      );

      builders.forEach(builder => {
        builder.addCached(name, version, lastVersionDefinition);
      });
    } else if (_.get(npmPackage, "license", "").length > 0) {
      const packagelicenseFile = `${_.get(npmPackage, "license")}`;

      console.log(
        chalk.red(
          `License source not found for ${packageID}, derived license types are: ${packagelicenseFile}.`
        )
      );

      builders.forEach(builder => {
        builder.addEmpty(name, version);
      });
    } else {
      console.log(
        chalk.red(`License could not be detected for package ${packageID}.`)
      );

      builders.forEach(builder => {
        builder.addEmpty(name, version);
      });
    }
    if (links) {
      promises.push(
        jsonBuilder.buildLink(
          name,
          npmPackage.repository,
          npmPackage.licenseFile
        )
      );
    }
  });

  Promise.all(promises).then(() => {
    builders.forEach(builder => {
      builder.write();
    });
  });
});
