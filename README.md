# restore-npm-cache

[![npm version](https://img.shields.io/npm/v/restore-npm-cache.svg)](https://www.npmjs.com/package/restore-npm-cache)
[![Build Status](https://travis-ci.com/shinnn/restore-npm-cache.svg?branch=master)](https://travis-ci.com/shinnn/restore-npm-cache)
[![Coverage Status](https://img.shields.io/coveralls/shinnn/restore-npm-cache.svg)](https://coveralls.io/github/shinnn/restore-npm-cache?branch=master)

Restore contents from an [npm](https://docs.npmjs.com/getting-started/what-is-npm) [cache](https://docs.npmjs.com/cli/cache#details)

```javascript
const restoreNpmCache = require('restore-npm-cache');

(async () => {
  await restoreNpmCache('make-fetch-happen:request-cache:https://registry.npmjs.org/lodash/-/lodash-4.17.10.tgz');

  require('./package/package.json');
  //=> {name: 'lodash', version: '4.17.10', description: 'Lodash modular utilities.', ...}
})();
```

## Installation

[Use](https://docs.npmjs.com/cli/install) [npm](https://docs.npmjs.com/getting-started/what-is-npm).

```
npm install restore-npm-cache
```

## API

```javascript
const restoreNpmCache = require('restore-npm-cache');
```

### restoreNpmCache(*key* [, *options*])

*key*: `string`  
*options*: `Object` ([node-tar](https://github.com/npm/node-tar)'s [`Unpack`](https://github.com/npm/node-tar#class-tarunpack) constructor options with `strict` defaulting to `true`)  
Return: `Promise<Object>`

It finds an npm cache entry identified by the given key, extract its contents from the gzipped tarball to a directory where `cwd` option points (or `process.cwd()` if `cwd` is not provided), and returns a `Promise` for [information of the entry](https://github.com/zkat/cacache#--cacachegetinfocache-key---promise).

It automatically creates directories when the directory specified by `cwd` option doesn't exist.

```javascript
const {readdir} = require('fs').promises;
const restoreNpmCache = require('restore-npm-cache');

(async () => {
  const info = await restoreNpmCache('make-fetch-happen:request-cache:https://registry.npmjs.org/eslint/-/eslint-5.6.1.tgz', {
    cwd: 'new/dir',
    strip: 1
  });

  info.integrity; //=> 'sha512-hgrDtGWz368b7Wqf+ ... 5WRN1TAS6eo7AYA=='
  info.size; //=> 514066
  info.time; //=> 538368647819

  await readdir('new/dir');
  /*=> [
    'CHANGELOG.md',
    'LICENSE',
    'README.md',
    'bin',
    'conf',
    'lib',
    'messages',
    'package.json'
  ] */
})();
```

## License

[ISC License](./LICENSE) © 2018 Shinnosuke Watanabe
