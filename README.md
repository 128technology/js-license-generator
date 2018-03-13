# JS License Generator
An application to extract licenses from a JavaScript project.

## Usage

### Flags

- `--directory=<dir>` An absolute path to the project directory to search. This directory should contain a `node_modules` folder.
- `--cacheFile=<path>` An absolute path to a JSON cache file for looking up missing licenses. The JSON file output by `js-license-generator` can be fed back in as the cache file.
- `--ignore=<name1,name2>` Comma separated list of package names to ignore. (e.g. `gulp,lodash`)
- `--production` Search for licenses on production dependencies. Default is development.
- `--help` Display CLI help/usage.

### Output

The output of `js-license-generator` will flag dependencies that may need attention. If a package with an exact version match is found in the cache, it will be used and a message will be displayed in the console. If a package is found but there is no version match in the cache, the last cached version will be used and the user will be informed of this in the console.  Any other output signifies that a package's license was not found and the user must manually enter it. The output files will leave a black space for the package license to be entered.
