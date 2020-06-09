import { NowApiHandler } from '@vercel/node';
import path from 'path';
import globby from 'globby';
import url from 'url';
import { IncomingMessage } from 'http';
import prettyFormat from 'pretty-format';
import dedent from 'dedent';
import * as lib from '../lib';
import { Context } from '../environment/get-context';

export type Route = {
  filePath: string;
  handler: NowApiHandler;
  matcher: RegExp;
};

export interface ResolveError {
  type: 'error';
}

export interface ResolveNotFound {
  type: 'not_found';
}

export interface ResolveInvalid {
  type: 'invalid';
}

export interface ResolveFound {
  type: 'found';
  handler: NowApiHandler;
  query: { [key: string]: string };
}

export type ResolveResult =
  | ResolveError
  | ResolveNotFound
  | ResolveInvalid
  | ResolveFound;

export type Query = { [key: string]: string };

const indexFilenameRegex = /^index\.(t|j)s$/i;
const segmentFilenameRegex = /^\[\w+\]\.(t|j)s$/i;

const pathToRegex = (p: string): RegExp => {
  const filename = path.basename(p);
  const filenameMatch = filename.match(/^(?<name>.*)(?<ext>\.(t|j)s)$/i);
  if (filenameMatch == null || filenameMatch.groups == null) {
    throw new Error('Invalid path');
  }
  const { name, ext } = filenameMatch.groups;

  // Create the regex for the filename
  const filenameRegexWithSlugs = indexFilenameRegex.test(filename)
    ? `(\\/(index(\\.(t|j)s)?)?)?`
    : segmentFilenameRegex.test(filename)
    ? filename.replace(/^\[(\w+)\](\.(t|j)s)$/g, '\\/(?<$1>[^/\\.]+)($2)?')
    : `\\/${lib.escapeRegex(name)}(${lib.escapeRegex(ext)})?`;

  // Create the regex for the full directory based path
  const dirRegexWithSlugs = lib
    .escapeRegex(path.dirname(p))
    .replace(/\\\[(\w+)\\\]/gi, '(?<$1>[^/\\.]+)');

  return new RegExp(`^\\/${dirRegexWithSlugs}${filenameRegexWithSlugs}$`);
};

const resolveRoutes = async (
  context: Context,
  includeHandlers: boolean,
): Promise<Route[]> => {
  const routes: Route[] = [];

  const globs = [
    'api/**/*.(ts|js)',
    // "_" as a directory name prefix indicates that the dir should be ignored
    '!api/**/_*/*',
    // "." as a directory name prefix indicates that the dir should be ignored
    '!api/**/.*/*',
    // "." as a filename prefix indicates that the file should be ignored
    '!api/**/.*',
    // "_" as a filename prefix indicates that the file should be ignored
    '!api/**/_*',
  ];

  const paths = (
    await globby(globs, {
      cwd: context.targetOriginalPath,
    })
  )
    // We will sort so that the paths by length, descending, whilst ensuring all
    // "index" files are at the end and are sorted in ascending order. This will
    // ensure our matching will work as expected because the index filenames are
    // optional in terms of requests
    .sort((a, b) => {
      if (a.length < b.length || a.match(/index\.(t|j)s$/i) != null) {
        return 1;
      } else if (a.length > b.length) {
        return -1;
      }
      return 0;
    });

  if (paths.length > 0) {
    lib.debug('Identified the following API functions:', paths);
  } else {
    lib.debug('No API functions found.');
  }

  for (const p of paths) {
    let handler: NowApiHandler;

    if (includeHandlers) {
      try {
        const mod = await import(`${context.targetSymlinkPath}/${p}`);

        if (typeof mod !== 'object' || typeof mod.default !== 'function') {
          console.error(
            `[vercel-node-dev] Serverless function is not being exported from: ${p}`,
          );
        }

        handler = mod.default;
      } catch (err) {
        lib.log(`Failed to load function "${p}"`, err);

        handler = (_req, res) => {
          res.status(500).send(dedent`
        There is an error in the following function:
            - ${p}
        Error:
        ${prettyFormat(err)}
        `);
        };
      }
    } else {
      handler = (_req, res) => res.send(500).send('Route handler not resolved');
    }

    routes.push({
      filePath: p,
      handler,
      matcher: pathToRegex(p),
    });
  }

  lib.debug('Resolved routes', routes);

  return routes;
};

class APIRoutes {
  private routes: Route[];

  constructor(routes: Route[]) {
    this.routes = routes;
  }

  private forPathname = (
    pathname: string,
    caseInsensitive = false,
  ): { route: Route; match: RegExpMatchArray } | void => {
    let route: Route | null = null;
    let matcherResult: RegExpMatchArray | null = null;

    for (const r of this.routes) {
      matcherResult = pathname.match(
        caseInsensitive ? new RegExp(r.matcher.source, 'i') : r.matcher,
      );
      if (matcherResult != null) {
        route = r;
        break;
      }
    }

    if (route != null && matcherResult != null) {
      return {
        route,
        match: matcherResult,
      };
    }

    return undefined;
  };

  resolve = (req: IncomingMessage): ResolveResult => {
    const query: Query = {};

    const parts = url.parse(req.url || '/');

    if (parts.pathname == null || parts.pathname.match(/^\/api/i) == null) {
      lib.debug(`Invalid request received`, parts);
      return {
        type: 'error',
      };
    } else {
      const pathname = parts.pathname
        // We will remove the trailing slash as it's not needed, and will allow us
        // to match paths such as /api/hello-world for a function at
        // api/hello-world.js
        .replace(/\/$/, '')
        // Remove redundant /'s
        .replace(/\/+/g, '/');

      const routeFindResult = this.forPathname(pathname);

      if (routeFindResult != null) {
        const { route, match } = routeFindResult;

        // Check to see if we need to attach any matched segments to querystring
        if (match != null && match.groups != null) {
          const groups = match.groups;
          Object.keys(groups).forEach((key) => {
            query[key] = groups[key];
          });
        }

        return {
          type: 'found',
          handler: route.handler,
          query,
        };
      } else {
        // Vercel seems to have some "complex" logic regarding returning either
        // a 404 vs 405 depending on whether or not an api route could be matched.
        // If the path does not exist at all then it should return a 405.
        // If the path does not match a routes extension or casing then we
        // return a 404.
        // This distinction seems a bit strange to me, but our aim is to be
        // 100% the same as the Vercel cloud experience so we copy this logic.

        if (pathname.match(/\.(t|j)s$/)) {
          const pathNameWithoutExtension = pathname.replace(/\.(t|j)s$/, '');
          if (
            this.forPathname(pathNameWithoutExtension, true) ||
            this.forPathname(pathname, true)
          ) {
            lib.debug(`Invalid route extension: ${pathname}`);
            return {
              type: 'not_found',
            };
          }
        }

        lib.debug(`Invalid route: ${pathname}`);
        return { type: 'invalid' };
      }
    }
  };
}

export async function resolveAPIRoutes(
  context: Context,
  includeHandlers: boolean,
): Promise<APIRoutes> {
  const routes = await resolveRoutes(context, includeHandlers);
  return new APIRoutes(routes);
}
