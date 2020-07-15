import execa from 'execa';
import { Context } from '../get-context';
import * as lib from '../lib';
import { Ports } from '../ports';

export default function startUIDevProcess(
  context: Context,
  ports: Ports,
): { childProcess: execa.ExecaChildProcess } {
  // Resolve the development command
  const devCommand =
    context.devCommand ||
    context.packageJson?.scripts?.dev ||
    context.framework?.devCommand;
  if (devCommand == null) {
    throw new Error(
      '[vercel-node-dev] No develop command could be resolved for your project. Please specify one via the "dev" script.',
    );
  }
  lib.log('Using dev command:', devCommand);

  // Run the UI script
  const childProcess = execa.command(devCommand, {
    cwd: context.targetSymlinkCodePath,
    env: {
      ...context.env,
      PORT: ports.uiServer.toString(),
      SKIP_PREFLIGHT_CHECK: 'true',
      BROWSER: 'none',
      FORCE_COLOR: 'true',
    },
    shell: true,
    preferLocal: true,
  });

  childProcess.catch((err) => {
    lib.log('Failed to run develop command for UI', err);
  });

  if (process.env.VND_SILENT_UI == null) {
    childProcess.stdout?.on('data', (data: Buffer) => {
      let msg = String(data)
        // Remove any "clear screen" codes
        .replace(/\\033\[2J/g, '')
        // Remove unnecessary empty lines
        .replace(/\n$/, '');

      if (!context.debug) {
        // Replace ui server port with our proxy server port
        msg = msg.replace(
          new RegExp(ports.uiServer.toString(), 'g'),
          `${ports.proxyServer}`,
        );
      }

      console.log(msg);
    });

    childProcess.stderr?.pipe(process.stderr);
  }

  return { childProcess };
}
