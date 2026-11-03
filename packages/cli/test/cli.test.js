import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { main, USAGE, VERSION } from '../src/cli.js';
import { createIo, removeDir, tempDir } from './helpers/util.js';

/** @type {string} */
let root;
beforeAll(async () => {
	root = await tempDir('shelfway-cli-main-');
});
afterAll(async () => {
	await removeDir(root);
});

/** @param {string[]} argv */
const shelfway = async (argv) => {
	const io = createIo();
	const code = await main(argv, { io: io.io, cwd: root });
	return { code, out: io.out(), err: io.err() };
};

describe('shelfway (main)', () => {
	it('prints help and version, rejects unknown commands and options', async () => {
		expect(await shelfway([])).toMatchObject({ code: 0, out: USAGE });
		for (const help of ['help', '--help', '-h']) expect(await shelfway([help])).toMatchObject({ code: 0, out: USAGE });
		expect(USAGE).toContain('shelfway --version, shelfway -v');
		for (const version of ['--version', '-v'])
			expect(await shelfway([version])).toMatchObject({ code: 0, out: `${VERSION}\n` });
		// the version is the package's own, not a copy kept by hand
		expect(VERSION).toBe(JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version);
		expect((await shelfway(['nope'])).code).toBe(2);
		expect((await shelfway(['app'])).code).toBe(2);
		expect((await shelfway(['app', 'nope'])).code).toBe(2);
		expect((await shelfway(['app', 'validate', '--bogus'])).code).toBe(2);
		expect((await shelfway(['app', 'init'])).code).toBe(2);
		expect((await shelfway(['app', 'init', 'x', '--id', 'x1'])).err).toContain('needs --id and --name');
	});

	it('inits, validates and regenerates assets with exit codes', async () => {
		const created = await shelfway([
			'app',
			'init',
			'demo',
			'--id',
			'demo',
			'--name',
			'Demo',
			'--base-url',
			'https://demo.example.com',
		]);
		expect(created).toMatchObject({ code: 0, out: expect.stringContaining("Created product 'demo' in demo") });
		expect(await shelfway(['app', 'validate', 'demo'])).toMatchObject({ code: 0, out: expect.stringContaining('✔ valid') });
		expect(JSON.parse((await shelfway(['app', 'validate', 'demo', '--json'])).out).ok).toBe(true);
		expect(await shelfway(['app', 'assets', 'demo', '--check'])).toMatchObject({
			code: 0,
			out: 'openapi.json is up to date\nserver/widget-script.js is up to date\n',
		});
		await writeFile(path.join(root, 'demo/server/widget-script.js'), '// stale\n');
		expect(await shelfway(['app', 'assets', 'demo', '--check'])).toMatchObject({
			code: 1,
			err: 'server/widget-script.js out of date: run shelfway app assets\n',
		});
		expect(await shelfway(['app', 'assets', 'demo'])).toMatchObject({
			code: 0,
			out: expect.stringContaining('server/widget-script.js written'),
		});
		expect((await shelfway(['app', 'init', 'demo', '--id', 'demo', '--name', 'Demo'])).code).toBe(1);
		expect((await shelfway(['app', 'init', 'other', '--id', 'Bad', '--name', 'Demo'])).err).toContain('--id must be');
		await writeFile(path.join(root, 'demo/core/extra.js'), "import '../ui/inbox.js';\n");
		const invalid = await shelfway(['app', 'validate', 'demo']);
		expect(invalid).toMatchObject({ code: 1, out: expect.stringContaining('imports.direction') });
	}, 60_000);
});
