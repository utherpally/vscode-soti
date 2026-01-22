const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');


/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

/**
 * @type {import('esbuild').Plugin}
 */
const copyWasmPlugin = {
	name: 'copy-wasm',
	setup(build) {
		build.onEnd(() => {
			// Copy the onig.wasm file to the output directory
			const wasmSource = path.join(__dirname, 'node_modules', 'vscode-oniguruma', 'release', 'onig.wasm');
			const wasmDest = path.join(__dirname, 'out', 'onig.wasm');

			// Create directory if it doesn't exist
			fs.mkdirSync(path.dirname(wasmDest), { recursive: true });

			// Copy the file
			fs.copyFileSync(wasmSource, wasmDest);
			console.log('Copied onig.wasm to output directory');
		});
	},
};

async function main() {
	const ctx = await esbuild.context({
		entryPoints: ['src/extension.ts'],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'out/extension.js',
		external: ['vscode'],
		logLevel: 'info',
		plugins: [esbuildProblemMatcherPlugin, copyWasmPlugin],
	});

	if (watch) {
		await ctx.watch();
		console.log('Watching for changes...');
	} else {
		await ctx.rebuild();
		await ctx.dispose();
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
