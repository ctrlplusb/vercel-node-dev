import { IncomingMessage, ServerResponse } from 'http';
import url, { URL, URLSearchParams } from 'url';
import * as lib from '../lib';
import { Context, Ports } from '../environment/get-context';

type RedirectCode = 301 | 302 | 303 | 307 | 308;

const redirectStatusCodes: RedirectCode[] = [
  301, // Moved Permanently
  302, // Found
  303, // See Other
  307, // Temporary Redirect
  308, // Permanent Redirect
];

export interface RoutingRedirect {
  type: 'redirect';
  status: RedirectCode;
}

export interface RoutingApplied {
  type: 'applied';
  pathname: string;
}

export type RoutingResult = RoutingRedirect | RoutingApplied;

export function applyRouting(
  req: IncomingMessage,
  res: ServerResponse,
  context: Context,
  ports: Ports,
): RoutingResult {
  let parts = url.parse(req.url || '/');
  let pathname = parts.pathname || '/';
  lib.debug(`Proxy server handling request: ${req.url}`);

  const routes = context.routes || [];

  for (let i = 0; i < routes.length; i += 1) {
    const _parts = url.parse(req.url || '/');
    const _pathname = _parts.pathname || '/';

    const route = routes[i];

    const { src } = route;
    if (src == null) {
      lib.log(`Skipping route as it does not have a "src" defined`);
      continue;
    }

    const srcRegex = new RegExp(src);

    const match = _pathname.match(srcRegex);
    if (match == null) {
      continue;
    }
    lib.debug('Processing route match', route);

    if ('methods' in route && Array.isArray(route.methods)) {
      if (!route.methods.includes(req.method || 'GET')) {
        lib.debug('Route does not satisfy the configured HTTP methods');
        if ('continue' in route && route.continue) {
          continue;
        } else {
          break;
        }
      }
    }

    parts = _parts;
    pathname = _pathname;

    const replaceRouteMatchBackReferences = (
      s: string,
      includeNamedGroups: boolean,
    ) => {
      if (match == null || s == null || s === '') {
        return s;
      }
      let result = s;
      if (includeNamedGroups && match.groups) {
        const groups = match.groups;
        result = Object.keys(groups).reduce((acc, cur) => {
          return lib.replaceAll(acc, `:${cur}`, groups[cur]);
        }, s);
      }
      if (match.length > 1) {
        // We reverse this loop to make it more specific.
        // e.g. match $14 before $1
        for (let i = match.length; i > 0; i -= 1) {
          result = lib.replaceAll(result, `$${i}`, match[i]);
        }
      }
      return result;
    };

    if ('headers' in route && route.headers != null) {
      const headers = route.headers;
      // Attach resolved headers to res
      Object.keys(headers).forEach((key) => {
        res.setHeader(
          key,
          replaceRouteMatchBackReferences(headers[key], false),
        );
      });
    }

    if ('status' in route && typeof route.status === 'number') {
      lib.debug('Setting status', route.status);
      // If it's a redirect status we'll immediately resolve
      if (redirectStatusCodes.includes(route.status as RedirectCode)) {
        lib.debug('Stopping route mapping as found redirect status code');
        return {
          type: 'redirect',
          status: route.status as RedirectCode,
        };
      }
    }

    if ('dest' in route && typeof route.dest === 'string') {
      const destURL = new URL(
        `http://localhost:${ports.proxyServer}${replaceRouteMatchBackReferences(
          route.dest,
          true,
        )}`,
      );
      new URLSearchParams(
        parts.search ? parts.search.slice(1) : undefined,
      ).forEach((value, name) => {
        destURL.searchParams.append(name, value);
      });
      req.url = url.format({
        pathname: destURL.pathname,
        search: destURL.searchParams.toString(),
      });
    }

    if ('continue' in route && route.continue) {
      continue;
    } else {
      break;
    }
  }

  // The request URL could have been modified by the route resolution, so
  // we should extract the pathname again before determining whether
  // to route this to the apis vs ui
  parts = url.parse(req.url || '/');
  pathname = parts.pathname || '/';

  lib.debug(`Routing applied. Url resolved to: ${req.url}`);

  return {
    type: 'applied',
    pathname,
  };
}
