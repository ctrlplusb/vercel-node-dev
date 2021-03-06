import execa from 'execa';
import path from 'path';
import { Context } from '../get-context';
import { Ports } from '../ports';
import * as lib from '../lib';

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
      '--transpile-only',
      '--watch',
      [
        path.join(context.targetSymlinkCodePath, 'api'),
        path.join(context.targetSymlinkPath, 'vercel.json'),
        path.join(context.targetSymlinkCodePath, 'package.json'),
        path.join(context.targetSymlinkCodePath, 'tsconfig.json'),
        path.join(context.targetSymlinkPath, 'package.json'),
        path.join(context.targetSymlinkPath, 'tsconfig.json'),
      ]
        .map((x) => `"${x}"`)
        .join(','),
      '--project',
      context.targetTsConfigPath,
      context.debugApis ? `--inspect=${context.debugApisPort}` : '',
      '--preserve-symlinks',
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
    lib.log('API Server failed', err);
  });

  return { childProcess };
}
