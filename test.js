'use strict';

const {join} = require('path');

const npmCachePath = require('npm-cache-path');
const {put} = require('npcache');
const restoreNpmCache = require('.');
const rmfr = require('rmfr');
const test = require('tape');

const broken = 'H4sIAAAAAAAAE4vXZ6A5MDAwMDc1VQDTZmZg2sDIBEJDgAKqekNDMzOgelPaO42BobS4JLEI6JTijMy8vDzyzYF5BJuHBggYGhubGRiYGZsbmyGx6RKq';
const tmp = join(__dirname, 'tmp');
function pkgKey(id) {
	return `make-fetch-happen:request-cache:https://registry.npmjs.org/${id}/-/${id}-${
		require(`${id}/package.json`).version
	}.tgz`;
}

test('restoreNpmCache()', async t => {
	await rmfr(tmp);
	await Promise.all([
		(async () => {
			const key = pkgKey('tape');

			t.equal(
				(await restoreNpmCache(key, {
					cwd: tmp,
					strip: 1,
					filter(path, entry) {
						if (path.endsWith('readme.markdown')) {
							t.equal(
								entry.type,
								'File',
								'should pass two arguments to `filter` option.'
							);

							return false;
						}

						return true;
					}
				})).key,
				key,
				'should get information of the cache.'
			);

			t.equal(
				require(join(tmp, 'package.json')).name,
				'tape',
				'should restore the npm cache.'
			);

			try {
				require.resolve(join(tmp, 'readme.markdown'));
				t.fail('Unexpectedly succeeded.');
			} catch ({code}) {
				t.equal(
					code,
					'MODULE_NOT_FOUND',
					'should support tar.Unpack options.'
				);
			}
		})(),
		(async () => {
			const key = '__uNkNoWn__';

			try {
				await restoreNpmCache(key);
				t.fail('Unexpectedly succeeded.');
			} catch ({message}) {
				t.equal(
					message,
					`No cache entry for ${key} found in ${join(await npmCachePath(), '_cacache')}`,
					'should fail when it cannot find the cache.'
				);
			}
		})(),
		(async () => {
			const error = new Error('this error should be handled');
			const key = pkgKey('lodash');

			try {
				await restoreNpmCache(key, {
					cwd: tmp,
					filter() {
						throw error;
					}
				});
				t.fail('Unexpectedly succeeded.');
			} catch (err) {
				t.equal(
					err,
					error,
					'should fail when an error is thrown inside a filter function.'
				);
			}
		})()
	]);

	process.env.npm_config_cache = tmp; // eslint-disable-line camelcase

	await Promise.all([
		(async () => {
			await put('fixture-empty', Buffer.alloc(0));

			try {
				await restoreNpmCache('fixture-empty');
				t.fail('Unexpectedly succeeded.');
			} catch ({message}) {
				t.ok(
					/^Tried to extract files from .*, but coundn't because it contains nothing\.$/u.test(message),
					'should fail when the archive contains no entries.'
				);
			}
		})(),
		(async () => {
			await put('fixture-broken-tgz', Buffer.from(broken, 'base64'));

			try {
				await restoreNpmCache('fixture-broken-tgz', {cwd: tmp});
				t.fail('Unexpectedly succeeded.');
			} catch ({code}) {
				t.equal(
					code,
					'Z_BUF_ERROR',
					'should fail when the archive is broken.'
				);
			}
		})()
	]);

	t.end();
});

test('Argument validation', async t => {
	async function getError(...args) {
		try {
			return await restoreNpmCache(...args);
		} catch (err) {
			return err;
		}
	}

	t.equal(
		(await getError(null)).toString(),
		'TypeError: Expected a key (<string>) of an npm cache to restore its contents, but got a non-string value null.',
		'should fail when the first argument is not a string.'
	);

	t.equal(
		(await getError('!', new Set())).toString(),
		'TypeError: Expected an node-tar\'s `Unpack` constructor options (<Object>), but got Set {}.',
		'should fail when the second argument is not a plain object.'
	);

	t.equal(
		(await getError('!', {cwd: -0})).toString(),
		'TypeError: Expected `cwd` option to be a <string> where the contents will be restored, but a non-string value -0 (number) was provided.',
		'should fail when `cwd` option is not a string.'
	);

	t.equal(
		(await getError('?', {filter: new Map()})).toString(),
		'TypeError: Expected `filter` option to be a <Function>, but a non-function value undefined was provided.',
		'should fail when `filter` option is not a function.'
	);

	t.equal(
		(await getError()).toString(),
		'RangeError: Expected 1 or 2 arguments (<string>[, <Object>]), but got no arguments.',
		'should fail when it takes no arguments.'
	);

	t.equal(
		(await getError('_', {}, '_')).toString(),
		'RangeError: Expected 1 or 2 arguments (<string>[, <Object>]), but got 3 arguments.',
		'should fail when it takes too many arguments.'
	);

	t.end();
});
