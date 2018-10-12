'use strict';

const {promisify} = require('util');
const {resolve} = require('path');

const {info, stream} = require('npcache').get;
const inspectWithKind = require('inspect-with-kind');
const isPlainObj = require('is-plain-obj');
const mkdirp = require('mkdirp');
const pump = require('pump');
const {Unpack} = require('tar');

const promisifiedMkdirp = promisify(mkdirp);
const promisifiedPump = promisify(pump);

module.exports = async function restoreNpmCache(...args) {
	const argLen = args.length;

	if (argLen !== 1 && argLen !== 2) {
		throw new RangeError(`Expected 1 or 2 arguments (<string>[, <Object>]), but got ${
			argLen === 0 ? 'no' : argLen
		} arguments.`);
	}

	const [key, options = {}] = args;

	if (typeof key !== 'string') {
		const error = new TypeError(`Expected a key (<string>) of an npm cache to restore its contents, but got a non-string value ${
			inspectWithKind(key)
		}.`);
		error.code = 'ERR_INVALID_ARG_TYPE';

		throw error;
	}

	if (argLen === 2) {
		if (!isPlainObj(options)) {
			const error = new TypeError(`Expected an node-tar's \`Unpack\` constructor options (<Object>), but got ${
				inspectWithKind(options)
			}.`);
			error.code = 'ERR_INVALID_ARG_TYPE';

			throw error;
		}

		if (options.cwd !== undefined && typeof options.cwd !== 'string') {
			const error = new TypeError(`Expected \`cwd\` option to be a <string> where the contents will be restored, but a non-string value ${
				inspectWithKind(options.cwd)
			} was provided.`);
			error.code = 'ERR_INVALID_OPT_VALUE';

			throw error;
		}

		if (options.filter !== undefined && typeof options.filter !== 'function') {
			const error = new TypeError(`Expected \`filter\` option to be a <Function>, but a non-function value ${
				inspectWithKind(options.cwd)
			} was provided.`);
			error.code = 'ERR_INVALID_OPT_VALUE';

			throw error;
		}
	}

	const cwd = process.cwd();
	const dir = options.cwd ? resolve(cwd, options.cwd) : cwd;
	const cacheInfo = await info(key);

	if (cacheInfo && dir !== cwd) {
		await promisifiedMkdirp(dir);
	}

	let noEntriesFound = true;
	const unpack = new Unpack({
		strict: true,
		...options,
		cwd: dir,
		filter: options.filter ? function filter(path, entry) {
			noEntriesFound = false;

			try {
				return options.filter(path, entry);
			} catch (err) {
				unpack.emit('error', err);
				return false;
			}
		} : function filter() {
			noEntriesFound = false;
			return true;
		}
	});

	await promisifiedPump(await stream(key), unpack);

	if (noEntriesFound) {
		throw new Error(`Tried to extract files from ${
			cacheInfo.path
		}, but coundn't because it contains nothing.`);
	}

	return cacheInfo;
};
