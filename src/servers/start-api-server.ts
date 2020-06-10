import { createServer } from 'vercel-node-server';
import util from 'util';
import execa from 'execa';
import * as lib from '../lib';
import { resolveAPIRoutes } from '../routes/api-routes';
import getContext from '../get-context';

export default async function startAPIServer(): Promise<void> {
  const context = await getContext();

  if (context.packageJson?.scripts?.['now-build'] != null) {
    try {
      lib.log('Executing now-build script');
      await execa('npm', ['run', 'now-build'], {
        cwd: context.targetSymlinkPath,
      });
    } catch (err) {
      lib.log('Failed to execute now-build script', err);
    }
  }

  const server = createServer(async (req, res) => {
    lib.debug(`API server handling request: ${req.url}`);

    const apiRoutes = await resolveAPIRoutes(context, true);

    const resolveResult = apiRoutes.resolve(req);

    switch (resolveResult.type) {
      case 'error':
      case 'not_found':
      case 'invalid': {
        throw new Error(
          `Invalid state, these should have been handled by the proxy: ${req.url}`,
        );
      }
      case 'found': {
        const { query, handler } = resolveResult;
        Object.keys(query).forEach((key) => {
          req.query[key] = query[key];
        });
        Promise.resolve(handler(req, res)).catch((err) => {
          res.status(500).send(err.stack);
        });
      }
    }
  });

  const port = process.env.PORT;
  if (port == null) {
    throw new Error('PORT environment variable not provided to api-server');
  }

  lib.debug(`Starting API server on ${port}`);

  server.listen(parseInt(port, 10), () => {
    lib.debug(`API server listening on ${port}`);
  });

  const asyncClose = util.promisify(server.close);

  lib.bindProcessTermination(() => asyncClose());
}

startAPIServer();
