import path from 'path';
import execa from 'execa';
import { Context } from '../environment/get-context';
import { Ports } from '../ports';

export default async function startAPIDevProcess(
  context: Context,
  ports: Ports,
): Promise<{ childProcess: execa.ExecaChildProcess }> {
  const tsConfigPath = path.resolve(__dirname, './tsconfig.json');

  /*
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

    tsConfig.extends = applicationTsConfigPath;

    tsConfigPath = tempy.file();

    await writeJsonFile(tsConfigPath, tsConfig);
  }
  */

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
