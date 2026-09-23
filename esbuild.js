const esbuild = require('esbuild');

const isProduction = process.argv.includes('--production');
const isWatch = process.argv.includes('--watch');

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: isProduction,
    sourcemap: !isProduction,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['vscode'],
    logLevel: 'info',
  });

  if (isWatch) {
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    const fs = require('fs');
    const path = require('path');
    const srcUi = path.join(__dirname, 'src', 'webview', 'ui');
    const distUi = path.join(__dirname, 'dist', 'ui');
    fs.mkdirSync(distUi, { recursive: true });
    for (const file of fs.readdirSync(srcUi)) {
      fs.copyFileSync(path.join(srcUi, file), path.join(distUi, file));
    }
    console.log('Build completed successfully.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
