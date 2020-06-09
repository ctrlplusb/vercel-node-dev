import execa from 'execa';
import { Context } from '../environment/get-context';
import { Ports } from '../ports';

export default async function startAPIDevProcess(
  context: Context,
  ports: Ports,
): Promise<{ childProcess: execa.ExecaChildProcess }> {
  // Start the api-server via ts-node-dev in order to support auto reloading
  // on any code changes to the APIs
  const childProcess = execa(
    'ts-node-dev',
    [
      '--respawn',
      '--exit-child',
      '--transpileOnly',
      '--project',
      context.targetTsConfigPath,
      context.debugApis ? `--inspect=${context.debugApisPort}` : '',
      '--preserve-symlinks',
      '--preserve-symlinks-main',
      '--',
      'src/servers/start-api-server',
    ].filter(Boolean),
    {
      cwd: process.cwd(),
      env: {
        ...context.env,
        PORT: ports.apiServer.toString(),
      },
      stdio: 'inherit',
      preferLocal: true,
    },
  );

  childProcess.catch((err) => {
    console.log('API Server failed');
    console.error(err);
  });

  return { childProcess };
}
