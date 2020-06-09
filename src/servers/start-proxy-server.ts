import http, { IncomingMessage } from 'http';
import httpProxy from 'http-proxy';
import * as lib from '../lib';
import { Context } from '../environment/get-context';
import { applyRouting } from '../routes/routing';
import { resolveAPIRoutes } from '../routes/api-routes';
import {
  writeHeaders,
  writeStatusCode,
  // eslint-disable-next-line
  // @ts-ignore
} from 'http-proxy/lib/http-proxy/passes/web-outgoing';
import { Ports } from '../ports';

export default async function startProxyServer(
  context: Context,
  ports: Ports,
): Promise<http.Server> {
  lib.debug(`Starting proxy server on port ${ports.proxyServer}`);

  const apiProxy = httpProxy.createProxyServer({
    changeOrigin: true,
    target: {
      host: 'localhost',
      port: ports.apiServer,
      protocol: 'http',
    },
    xfwd: true,
    secure: false,
    ws: true,
    preserveHeaderKeyCase: true,
  });

  apiProxy.on('econnreset', (err, _req, res) => {
    lib.log('API connection reset', err);
    res.statusCode = 500;
    res.end(err.message);
  });

  apiProxy.on('error', (err, _req, res) => {
    lib.log('API connection error', err);
    res.statusCode = 500;
    res.end(err.message);
  });

  apiProxy.on('proxyReq', (proxyReq, _req, _res) => {
    // Browsers may send Origin headers even with same-origin requests. To
    // prevent CORS issues, we have to change the Origin to match the target URL.
    if (proxyReq.getHeader('origin')) {
      proxyReq.setHeader('origin', `http://localhost:${ports.apiServer}`);
      _res.setHeader('origin', `http://localhost:${ports.apiServer}`);
    }
  });

  const uiProxy = httpProxy.createProxyServer({
    changeOrigin: true,
    target: `http://localhost:${ports.uiServer}`,
    ws: true,
  });

  // We create another UI proxy server. This version will be responsible for
  // passing on the response from the target "manually". It affords us the
  // opportunity with doing last minute adjustments to the response prior
  // to the user receiving it.
  // One example case being if we would like to 404 for an invalid API path but
  // then have the UI handle the body rendering, allowing for a custom 404 page
  // to be rendered.

  const selfHandleUIProxy = httpProxy.createProxyServer({
    changeOrigin: true,
    selfHandleResponse: true,
    target: `http://localhost:${ports.uiServer}`,
  });

  const selfHandleUIStatusOverrides = new Map<IncomingMessage, number>();

  selfHandleUIProxy.on('proxyRes', (proxyRes, req, res) => {
    // Ensure headers are mapped to response
    writeHeaders(req, res, proxyRes, {});

    // Override the status
    const overideStatus = selfHandleUIStatusOverrides.get(req);
    if (overideStatus != null) {
      lib.debug('Overriding status for response', overideStatus);
      res.statusCode = overideStatus;
      selfHandleUIStatusOverrides.delete(req);
    } else {
      lib.debug('No status override found, passing through original status');
      writeStatusCode(req, res, proxyRes);
    }

    // Ensure body is mapped to response
    proxyRes.pipe(res);
  });

  const handler = async (
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ) => {
    lib.debug(`Proxy server handling request: ${req.url}`);

    const apiRoutes = await resolveAPIRoutes(context, false);

    const routingResult = applyRouting(req, res, context, ports);

    switch (routingResult.type) {
      case 'redirect': {
        lib.debug('Responding with a redirect');
        res.statusCode = routingResult.status;
        res.end();
        break;
      }
      case 'applied': {
        const { pathname } = routingResult;
        if (pathname.match(/^\/api(\/.*)?$/) != null) {
          const apiResolveResult = apiRoutes.resolve(req);
          if (
            apiResolveResult.type === 'not_found' ||
            apiResolveResult.type === 'invalid'
          ) {
            lib.debug('API route is not valid, passing request to UI.');
            selfHandleUIStatusOverrides.set(req, 404);
            selfHandleUIProxy.web(req, res);
          } else {
            lib.debug(`Proxying request to API server: ${pathname}`);
            apiProxy.web(req, res);
          }
        } else {
          lib.debug(`Proxying request to UI server: ${pathname}`);
          uiProxy.web(req, res);
        }
      }
    }
  };

  const server = http.createServer(handler);

  server.on('upgrade', function (req, socket, head) {
    uiProxy.ws(req, socket, head);
  });

  server.listen(ports.proxyServer, () => {
    lib.log(`Server started on http://localhost:${ports.proxyServer}`);
  });

  return server;
}
