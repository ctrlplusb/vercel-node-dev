import fs from 'fs-extra';
import path from 'path';
import execa from 'execa';
import { Server } from 'http';
import util from 'util';
import * as lib from './lib';
import startAPIDevProcess from './child-processes/start-api-dev-process';
import startUIDevProcess from './child-processes/start-ui-dev-process';
import startProxyServer from './servers/start-proxy-server';
import getContext from './get-context';
import { getPorts } from './ports';

let apiChildProcess: execa.ExecaChildProcess;
let uiChildProcess: execa.ExecaChildProcess;
let proxyServer: Server;

export async function startVercelNodeDev(): Promise<void> {
  const context = await getContext();
  const ports = await getPorts();

  // Fire up the API development process
  if (fs.existsSync(path.join(context.targetSymlinkCodePath, 'api'))) {
    const apiResult = await startAPIDevProcess(context, ports);
    apiChildProcess = apiResult.childProcess;
    await lib.waitForPortToRespond(ports.apiServer, 60 * 1000);
  } else {
    lib.debug('No api directory exists, skipping API server');
  }

  // Fire up the UI development process
  const uiResult = startUIDevProcess(context, ports);
  uiChildProcess = uiResult.childProcess;
  await lib.waitForPortToRespond(ports.uiServer, 60 * 1000);

  // Fire up the proxy server, which will proxy requests to the API/UI servers
  startProxyServer(context, ports);
}

lib.bindProcessTermination(async (signal: 'SIGINT' | 'SIGTERM') => {
  if (uiChildProcess) {
    uiChildProcess.kill(signal);
  }
  if (apiChildProcess) {
    apiChildProcess.kill(signal);
  }
  if (proxyServer) {
    const asyncClose = util.promisify(proxyServer.close);
    await asyncClose();
  }
});

startVercelNodeDev();
