import path from 'path';
import execa from 'execa';
import fs from 'fs';
import loadJsonFile from 'load-json-file';
import tempy from 'tempy';
import writeJsonFile from 'write-json-file';
import { Context } from '../environment/get-context';
import { Ports } from '../ports';
import * as lib from '../lib';

export default async function startAPIDevProcess(
  context: Context,
  ports: Ports,
): Promise<{ childProcess: execa.ExecaChildProcess }> {
  let tsConfigPath = path.resolve(__dirname, './tsconfig.json');

  // If the application has a tsconfig, we'll extend it
  const applicationTsConfigPath = path.join(
    context.targetRootDir,
    'tsconfig.json',
  );
  if (fs.existsSync(applicationTsConfigPath)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tsConfig = (await loadJsonFile(tsConfigPath)) as any;
    if (tsConfig == null) {
      throw new Error('Failed to load tsconfig.json');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applicationTsConfig = (await loadJsonFile(
      applicationTsConfigPath,
    )) as any;
    if (applicationTsConfig == null) {
      throw new Error('Failed to load tsconfig.json');
    }

    if (Array.isArray(applicationTsConfig.compilerOptions?.lib)) {
      tsConfig.compilerOptions.lib = applicationTsConfig.compilerOptions.lib;
      if (
        tsConfig.compilerOptions.lib.find(
          (x) => x.match(/^esnext$/i) != null,
        ) == null
      ) {
        tsConfig.compilerOptions.lib.push('ESNext');
      }
    }

    tsConfig.extends = applicationTsConfigPath;

    tsConfigPath = tempy.file();

    await writeJsonFile(tsConfigPath, tsConfig);

    lib.debug('Using custom tsconfig', tsConfig);
  }

  // Start the api-server via ts-node-dev in order to support auto reloading
  // on any code changes to the APIs
  const childProcess = execa(
    path.join(
      path.dirname(require.resolve('ts-node-dev/package.json')),
      'bin/ts-node-dev',
    ),
    [
      context.debugApis ? `--inspect=${context.debugApisPort}` : '',
      '--respawn',
      '--exit-child',
      '--transpileOnly',
      '--project',
      tsConfigPath,
      path.resolve(__dirname, '../servers/start-api-server'),
    ].filter(Boolean),
    {
      env: {
        ...context.env,
        PORT: ports.apiServer.toString(),
      },
      stdio: 'inherit',
    },
  );

  return { childProcess };
}
