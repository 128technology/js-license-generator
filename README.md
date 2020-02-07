# JS License Generator
An application to extract licenses from a JavaScript project.

## Usage

### Flags

- `--directory=<dir>` An absolute path to the project directory to search. This directory should contain a `node_modules` folder.
- `--cacheFile=<path>` An absolute path to a JSON cache file for looking up missing licenses. The JSON file output by `js-license-generator` can be fed back in as the cache file.
- `--ignore=<name1,name2>` Comma separated list of package names to ignore. (e.g. `gulp,lodash`)
- `--production` Search for licenses on production dependencies. Default is development.
- `--readme` Use entire readme as license text (see Priority section).
- `--readmeParse` Try to grab a section of the readme if it appears license info is contained within (see Priority section).
- `--download` Attempt to grab the raw license text from known storage URLs via github.
- `--help` Display CLI help/usage.

### Priority for fallbacks

Currently, there is no way to specify priority for what flags should take precedence, so here is a breakdown of the order of operations.

1. Read information from the stored license file in `node_modules`.
2. Read information from cache for the specified package version.
3. Read information from cache for the package, under a different version.
4. Attempt to download the license file from github (`--download` flag).
5. Attempt to parse license information from the README body of the package (`--readmeParse` flag).
6. Attempt to store the entire README as the license information (`--readme` flag).
7. Save the package name/version and license type (if available) with no license body (fail case).

These steps attempt to minimize clobbering existing cache or better license information when available. The cache is hit only if the raw license data, via the local `node_modules` package directory, is not available, so that any license information that was previously entered into the cache file does not get replaced by fallbacks.

### Output

The output of `js-license-generator` will flag dependencies that may need attention. If a package with an exact version match is found in the cache, it will be used and a message will be displayed in the console. If a package was found in the cache under a different version, it will be used and a message will be displayed in the console. Using the flags above will also notify (in color!) if a package was obtained using the specified method.

The console will output any packages that have empty license bodies in the output - you can fix these manually in the output `<name>.json` file and rerun the license generator with `--cacheFile=<name.json>` until all errors are gone, as a sanity check.
