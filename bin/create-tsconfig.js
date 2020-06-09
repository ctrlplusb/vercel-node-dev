/* eslint-disable @typescript-eslint/no-var-requires */

const writeJsonFile = require('write-json-file');
const fs = require('fs-extra');
const path = require('path');
const loadJsonFile = require('load-json-file');

async function createTSConfig({
  targetTsConfigPath,
  targetOriginalPath,
  targetSymlinkPath,
}) {
  const vndRootPath = path.resolve(__dirname, '../');

  const requiredCompilerOptions = {
    allowJs: false,
    allowSyntheticDefaultImports: true,
    alwaysStrict: false,
    baseUrl: './',
    emitDecoratorMetadata: true,
    esModuleInterop: true,
    experimentalDecorators: true,
    forceConsistentCasingInFileNames: true,
    isolatedModules: true,
    jsx: 'react',
    lib: ['ESNext'],
    module: 'CommonJS',
    moduleResolution: 'node',
    noEmit: true,
    noImplicitAny: false,
    noImplicitThis: false,
    paths: {
      micro: ['node_modules/micro/lib/index.js'],
    },
    preserveSymlinks: true,
    resolveJsonModule: true,
    skipLibCheck: true,
    strict: false,
    strictNullChecks: false,
    strictPropertyInitialization: false,
    target: 'ES2018',
  };

  let tsConfig;

  const targetOriginalTsConfig = path.join(targetOriginalPath, 'tsconfig.json');

  // If the target has a tsconfig, we'll use it to build a customised tsconfig
  if (fs.existsSync(targetOriginalTsConfig)) {
    const applicationTsConfig = await loadJsonFile(targetOriginalTsConfig);

    tsConfig = {
      ...applicationTsConfig,
      compilerOptions: {
        ...(applicationTsConfig.compilerOptions || {}),
        ...requiredCompilerOptions,
        lib: applicationTsConfig.compilerOptions.lib || [],
      },
    };

    // The vnd source needs at least ESNext
    if (
      !tsConfig.compilerOptions.lib.find((x) => x.match(/^esnext$/i) != null)
    ) {
      tsConfig.compilerOptions.lib.push('ESNext');
    }

    // Remap the excludes to the nested symlink path
    if (Array.isArray(tsConfig.exclude)) {
      tsConfig.exclude = tsConfig.exclude.map((x) =>
        path.relative(vndRootPath, path.join(targetSymlinkPath, x)),
      );
    }

    // Remap the includes to the nested symlink path
    if (Array.isArray(tsConfig.include)) {
      tsConfig.include = tsConfig.include.map((x) =>
        path.relative(vndRootPath, path.join(targetSymlinkPath, x)),
      );
    } else {
      tsConfig.include = [targetSymlinkPath];
    }

    tsConfig.include.push('src');
  } else {
    tsConfig = {
      compilerOptions: requiredCompilerOptions,
    };
  }

  await writeJsonFile(targetTsConfigPath, tsConfig);
}

module.exports = createTSConfig;
