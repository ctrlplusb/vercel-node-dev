import execa from 'execa';
import path from 'path';
import { Context } from '../environment/get-context';
import * as lib from '../lib';
import { Ports } from '../ports';

export default function startUIDevProcess(
  context: Context,
  ports: Ports,
): { childProcess: execa.ExecaChildProcess } {
  // Resolve the development command
  const devCommand =
    context.packageJson?.scripts?.dev || context.framework?.devCommand;
  if (devCommand == null) {
    throw new Error(
      '[vercel-node-dev] No develop command could be resolved for your project. Please specify one via the "dev" script.',
    );
  }
  lib.debug('Using dev command:', devCommand);

  // We need to run our dev command through this util so that any locally
  // installed binaries referenced by the devCommand will be resolved
  const npmRunPath = path.join(
    path.dirname(require.resolve('npm-run/package.json')),
    'bin/npm-run.js',
  );

  // Run the UI script
  const childProcess = execa.command(
    `${npmRunPath} ${devCommand.replace('$PORT', ports.uiServer.toString())}`,
    {
      cwd: context.targetRootDir,
      env: {
        ...context.env,
        PORT: ports.uiServer.toString(),
        SKIP_PREFLIGHT_CHECK: 'true',
        BROWSER: 'none',
        FORCE_COLOR: 'true',
      },
      extendEnv: true,
    },
  );

  childProcess.catch((err) => {
    lib.log('Failed to run develop command for UI');
    console.log(err);
  });

  if (process.env.VND_SILENT_UI == null) {
    childProcess.stdout?.on('data', (data: Buffer) => {
      console.log(
        String(data)
          // Remove any "clear screen" codes
          .replace(/\\033\[2J/g, '')
          // Remove unnecessary empty lines
          .replace(/\n$/, '')
          // Replace ui server port with our proxy server port
          .replace(
            new RegExp(ports.uiServer.toString(), 'g'),
            `${ports.proxyServer}`,
          ),
      );
    });

    childProcess.stderr?.pipe(process.stderr);
  }

  return { childProcess };
}
