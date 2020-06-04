import chalk from 'chalk';
import prettyFormat from 'pretty-format';
import pTimeout, { TimeoutError } from 'p-timeout';
import waitForPort from 'wait-port';

export function bindProcessTermination(
  onTerminating: (signal: 'SIGTERM' | 'SIGINT') => void | Promise<void>,
): void {
  let disposing = false;
  const disposer = (sig: 'SIGTERM' | 'SIGINT') => async () => {
    if (disposing) {
      return;
    }
    debug('Disposing server');
    disposing = true;
    try {
      await Promise.resolve(onTerminating(sig));
      debug('Exiting server');
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', disposer('SIGTERM'));
  process.on('SIGINT', disposer('SIGINT'));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export function debug(msg: string, data?: any): void {
  if (process.env.VND_DEBUG) {
    console.log(`${chalk.bgBlue.white('[vercel-node-dev]')} - ${msg}`);
    if (data !== undefined) {
      console.log(prettyFormat(data));
    }
  }
}

export function escapeRegex(str: string): string {
  // https://stackoverflow.com/a/3561711/350933
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export function log(msg: string, data?: any): void {
  console.log(`${chalk.magentaBright('[vercel-node-dev]')} - ${msg}`);
  if (data !== undefined) {
    console.log(prettyFormat(data));
  }
}

export function replaceAll(
  original: string,
  match: string,
  replaceWith: string,
): string {
  return original.replace(new RegExp(escapeRegex(match), 'g'), replaceWith);
}

export async function waitForPortToRespond(
  port: number,
  waitMS: number,
): Promise<void> {
  try {
    debug(`Waiting for port ${port} to respond`);
    await pTimeout(
      waitForPort({
        host: 'localhost',
        output: 'silent',
        port,
      }),
      waitMS,
    );
    debug(`Port ${port} is responding`);
  } catch (err) {
    if (err instanceof TimeoutError) {
      console.log(`Timed out waiting for port ${port} to respond`);
    } else {
      throw err;
    }
  }
}
