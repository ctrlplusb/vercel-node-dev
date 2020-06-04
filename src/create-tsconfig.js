/* eslint-disable @typescript-eslint/no-var-requires */

const writeJsonFile = require('write-json-file');
const tempy = require('tempy');
const fs = require('fs-extra');

function createTSConfig(extendsConfigPath) {
  // Create tsconfig with minimal required configuration
  const tsConfig = {
    compilerOptions: {
      allowJs: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      lib: ['ESNext'],
      module: 'CommonJS',
      moduleResolution: 'node',
      noEmit: true,
      skipLibCheck: true,
    },
  };

  // Create the tsconfig to a temp location
  const tsconfigPath = tempy.file();

  // If the provided tsconfig exists, we'll extend it
  if (fs.existsSync(extendsConfigPath)) {
    tsConfig.extends = extendsConfigPath;
  }

  writeJsonFile.sync(tsconfigPath, tsConfig);

  return tsconfigPath;
}

module.exports = createTSConfig;
