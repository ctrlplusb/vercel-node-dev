/**
 * This file has been extract from the official vercel repo.
 *
 * packages/now-static-build/src/frameworks.ts
 */

import { readdir, stat, readFile, unlink } from 'fs';
import { promisify } from 'util';
import { join } from 'path';
import { readConfigFile } from '@vercel/build-utils';
import { Route } from '@vercel/routing-utils';
import NowFrameworks, {
  Framework as NowFramework,
  SettingValue,
} from '@vercel/frameworks';

const readirPromise = promisify(readdir);
const readFilePromise = promisify(readFile);
const statPromise = promisify(stat);
const unlinkPromise = promisify(unlink);
const isDir = async (file: string): Promise<boolean> =>
  (await statPromise(file)).isDirectory();

export interface Framework {
  name: string;
  slug: string;
  dependency?: string;
  getOutputDirName: (dirPrefix: string) => Promise<string>;
  defaultRoutes?: Route[] | ((dirPrefix: string) => Promise<Route[]>);
  cachePattern?: string;
  buildCommand?: string;
  devCommand?: string;
}

// Please note that is extremely important
// that the `dependency` property needs
// to reference a CLI. This is needed because
// you might want (for example) a Gatsby
// site that is powered by Preact, so you
// can't look for the `preact` dependency.
// Instead, you need to look for `preact-cli`
// when optimizing Preact CLI projects.

const frameworkList: Framework[] = [
  {
    name: 'Gatsby.js',
    slug: 'gatsby',
    dependency: 'gatsby',
    buildCommand: 'gatsby build',
    getOutputDirName: async () => 'public',
    defaultRoutes: async (dirPrefix: string) => {
      try {
        const nowRoutesPath = join(
          dirPrefix,
          'public',
          '__now_routes_g4t5bY.json',
        );
        const content = await readFilePromise(nowRoutesPath, 'utf8');
        const nowRoutes = JSON.parse(content);
        try {
          await unlinkPromise(nowRoutesPath);
        } catch (err) {
          // do nothing if deleting the file fails
        }
        return nowRoutes;
      } catch (err) {
        // if the file doesn't exist, we don't create routes
        return [];
      }
    },
    cachePattern: '{.cache,public}/**',
  },
  {
    name: 'Hexo',
    slug: 'hexo',
    dependency: 'hexo',
    buildCommand: 'hexo generate',
    getOutputDirName: async () => 'public',
  },
  {
    name: 'Eleventy',
    slug: 'eleventy',
    dependency: '@11ty/eleventy',
    buildCommand: 'npx @11ty/eleventy',
    getOutputDirName: async () => '_site',
  },
  {
    name: 'Docusaurus 2',
    slug: 'docusaurus-2',
    dependency: '@docusaurus/core',
    buildCommand: 'docusaurus build',
    getOutputDirName: async (dirPrefix: string) => {
      const base = 'build';
      const location = join(dirPrefix, base);
      const content = await readirPromise(location);

      // If there is only one file in it that is a dir we'll use it as dist dir
      if (content.length === 1 && (await isDir(join(location, content[0])))) {
        return join(base, content[0]);
      }

      return base;
    },
    defaultRoutes: [
      {
        src: '^/[^./]+\\.[0-9a-f]{8}\\.(css|js)',
        headers: { 'cache-control': 'max-age=31536000, immutable' },
        continue: true,
      },
      {
        handle: 'filesystem',
      },
      {
        src: '.*',
        status: 404,
        dest: '404.html',
      },
    ],
  },
  {
    name: 'Preact',
    slug: 'preact',
    dependency: 'preact-cli',
    buildCommand: 'preact build',
    getOutputDirName: async () => 'build',
    defaultRoutes: [
      {
        handle: 'filesystem',
      },
      {
        src: '/(.*)',
        dest: '/index.html',
      },
    ],
  },
  {
    name: 'Dojo',
    slug: 'dojo',
    dependency: '@dojo/cli',
    buildCommand: 'dojo build',
    getOutputDirName: async () => join('output', 'dist'),
    defaultRoutes: [
      {
        handle: 'filesystem',
      },
      {
        src: '/service-worker.js',
        headers: { 'cache-control': 's-maxage=0' },
        continue: true,
      },
      {
        src: '/(.*)',
        dest: '/index.html',
      },
    ],
  },
  {
    name: 'Ember',
    slug: 'ember',
    dependency: 'ember-cli',
    buildCommand: 'ember build',
    getOutputDirName: async () => 'dist',
    defaultRoutes: [
      {
        handle: 'filesystem',
      },
      {
        src: '/(.*)',
        dest: '/index.html',
      },
    ],
  },
  {
    name: 'Vue.js',
    slug: 'vue',
    dependency: '@vue/cli-service',
    buildCommand: 'vue-cli-service build',
    getOutputDirName: async () => 'dist',
    defaultRoutes: [
      {
        src: '^/[^/]*\\.(js|txt|ico|json)',
        headers: { 'cache-control': 'max-age=300' },
        continue: true,
      },
      {
        src: '^/(img|js|css|fonts|media)/.*',
        headers: { 'cache-control': 'max-age=31536000, immutable' },
        continue: true,
      },
      {
        handle: 'filesystem',
      },
      {
        src: '^.*',
        dest: '/index.html',
      },
    ],
  },
  {
    name: 'Scully',
    slug: 'scully',
    dependency: '@scullyio/init',
    buildCommand: 'ng build && scully',
    getOutputDirName: async () => 'dist/static',
  },
  {
    name: 'Ionic Angular',
    slug: 'ionic-angular',
    dependency: '@ionic/angular',
    buildCommand: 'ng build',
    getOutputDirName: async () => 'www',
    defaultRoutes: [
      {
        handle: 'filesystem',
      },
      {
        src: '/(.*)',
        dest: '/index.html',
      },
    ],
  },
  {
    name: 'Angular',
    slug: 'angular',
    dependency: '@angular/cli',
    buildCommand: 'ng build',
    getOutputDirName: async (dirPrefix: string) => {
      const base = 'dist';
      const location = join(dirPrefix, base);
      const content = await readirPromise(location);

      // If there is only one file in it that is a dir we'll use it as dist dir
      if (content.length === 1 && (await isDir(join(location, content[0])))) {
        return join(base, content[0]);
      }

      return base;
    },
    defaultRoutes: [
      {
        handle: 'filesystem',
      },
      {
        src: '/(.*)',
        dest: '/index.html',
      },
    ],
  },
  {
    name: 'Polymer',
    slug: 'polymer',
    dependency: 'polymer-cli',
    buildCommand: 'polymer build',
    getOutputDirName: async (dirPrefix: string) => {
      const base = 'build';
      const location = join(dirPrefix, base);
      const content = await readirPromise(location);
      const paths = content.filter((item) => !item.includes('.'));

      return join(base, paths[0]);
    },
    defaultRoutes: [
      {
        handle: 'filesystem',
      },
      {
        src: '/(.*)',
        dest: '/index.html',
      },
    ],
  },
  {
    name: 'Svelte',
    slug: 'svelte',
    dependency: 'sirv-cli',
    buildCommand: 'rollup -c',
    getOutputDirName: async () => 'public',
    defaultRoutes: [
      {
        handle: 'filesystem',
      },
      {
        src: '/(.*)',
        dest: '/index.html',
      },
    ],
  },
  {
    name: 'Ionic React',
    slug: 'ionic-react',
    dependency: '@ionic/react',
    buildCommand: 'react-scripts build',
    getOutputDirName: async () => 'build',
    defaultRoutes: [
      {
        src: '/static/(.*)',
        headers: { 'cache-control': 's-maxage=31536000, immutable' },
        continue: true,
      },
      {
        src: '/service-worker.js',
        headers: { 'cache-control': 's-maxage=0' },
        continue: true,
      },
      {
        src: '/sockjs-node/(.*)',
        dest: '/sockjs-node/$1',
      },
      {
        handle: 'filesystem',
      },
      {
        src: '/(.*)',
        headers: { 'cache-control': 's-maxage=0' },
        dest: '/index.html',
      },
    ],
  },
  {
    name: 'Create React App',
    slug: 'create-react-app',
    dependency: 'react-scripts',
    buildCommand: 'react-scripts build',
    getOutputDirName: async () => 'build',
    defaultRoutes: [
      {
        src: '/static/(.*)',
        headers: { 'cache-control': 's-maxage=31536000, immutable' },
        continue: true,
      },
      {
        src: '/service-worker.js',
        headers: { 'cache-control': 's-maxage=0' },
        continue: true,
      },
      {
        src: '/sockjs-node/(.*)',
        dest: '/sockjs-node/$1',
      },
      {
        handle: 'filesystem',
      },
      {
        src: '/(.*)',
        headers: { 'cache-control': 's-maxage=0' },
        dest: '/index.html',
      },
    ],
  },
  {
    name: 'Create React App (ejected)',
    slug: 'create-react-app',
    dependency: 'react-dev-utils',
    buildCommand: 'react-scripts build',
    getOutputDirName: async () => 'build',
    defaultRoutes: [
      {
        src: '/static/(.*)',
        headers: { 'cache-control': 's-maxage=31536000, immutable' },
        continue: true,
      },
      {
        src: '/service-worker.js',
        headers: { 'cache-control': 's-maxage=0' },
        continue: true,
      },
      {
        src: '/sockjs-node/(.*)',
        dest: '/sockjs-node/$1',
      },
      {
        handle: 'filesystem',
      },
      {
        src: '/(.*)',
        headers: { 'cache-control': 's-maxage=0' },
        dest: '/index.html',
      },
    ],
  },
  {
    name: 'Gridsome',
    slug: 'gridsome',
    dependency: 'gridsome',
    buildCommand: 'gridsome build',
    getOutputDirName: async () => 'dist',
  },
  {
    name: 'UmiJS',
    slug: 'umijs',
    dependency: 'umi',
    buildCommand: 'umi build',
    getOutputDirName: async () => 'dist',
    defaultRoutes: [
      {
        handle: 'filesystem',
      },
      {
        src: '/(.*)',
        dest: '/index.html',
      },
    ],
  },
  {
    name: 'Docusaurus 1.0',
    slug: 'docusaurus',
    dependency: 'docusaurus',
    buildCommand: 'docusaurus-build',
    getOutputDirName: async (dirPrefix: string) => {
      const base = 'build';
      const location = join(dirPrefix, base);
      const content = await readirPromise(location);

      // If there is only one file in it that is a dir we'll use it as dist dir
      if (content.length === 1 && (await isDir(join(location, content[0])))) {
        return join(base, content[0]);
      }

      return base;
    },
  },
  {
    name: 'Sapper',
    slug: 'sapper',
    dependency: 'sapper',
    buildCommand: 'sapper export',
    getOutputDirName: async () => '__sapper__/export',
  },
  {
    name: 'Saber',
    slug: 'saber',
    dependency: 'saber',
    buildCommand: 'saber build',
    getOutputDirName: async () => 'public',
    defaultRoutes: [
      {
        src: '/_saber/.*',
        headers: { 'cache-control': 'max-age=31536000, immutable' },
      },
      {
        handle: 'filesystem',
      },
      {
        src: '.*',
        status: 404,
        dest: '404.html',
      },
    ],
  },
  {
    name: 'Stencil',
    slug: 'stencil',
    dependency: '@stencil/core',
    buildCommand: 'stencil build',
    getOutputDirName: async () => 'www',
    defaultRoutes: [
      {
        src: '/assets/(.*)',
        headers: { 'cache-control': 'max-age=2592000' },
        continue: true,
      },
      {
        src: '/build/p-.*',
        headers: { 'cache-control': 'max-age=31536000, immutable' },
        continue: true,
      },
      {
        src: '/sw.js',
        headers: { 'cache-control': 'no-cache' },
        continue: true,
      },
      {
        handle: 'filesystem',
      },
      {
        src: '/(.*)',
        dest: '/index.html',
      },
    ],
  },
  {
    name: 'Nuxt.js',
    slug: 'nuxtjs',
    dependency: 'nuxt',
    buildCommand: 'nuxt generate',
    getOutputDirName: async () => 'dist',
  },
  {
    name: 'Hugo',
    slug: 'hugo',
    buildCommand: 'hugo -D --gc',
    getOutputDirName: async (dirPrefix: string): Promise<string> => {
      const config = await readConfigFile(
        ['config.json', 'config.yaml', 'config.toml'].map((fileName) => {
          return join(dirPrefix, fileName);
        }),
      );

      return (config && config.publishDir) || 'public';
    },
  },
  {
    name: 'Jekyll',
    slug: 'jekyll',
    buildCommand: 'jekyll build',
    getOutputDirName: async (dirPrefix: string): Promise<string> => {
      const config = await readConfigFile(join(dirPrefix, '_config.yml'));
      return (config && config.destination) || '_site';
    },
  },
  {
    name: 'Brunch',
    slug: 'brunch',
    buildCommand: 'brunch build --production',
    getOutputDirName: async () => 'public',
  },
  {
    name: 'Middleman',
    slug: 'middleman',
    buildCommand: 'bundle exec middleman build',
    getOutputDirName: async () => 'build',
  },
  {
    name: 'Zola',
    slug: 'zola',
    buildCommand: 'zola build',
    getOutputDirName: async () => 'public',
  },
];

function getValue(
  framework: NowFramework | undefined,
  name: keyof NowFramework['settings'],
) {
  const setting = framework && framework.settings && framework.settings[name];
  return setting && (setting as SettingValue).value;
}

export const frameworks: Framework[] = frameworkList.map((partialFramework) => {
  const frameworkItem = (NowFrameworks as NowFramework[]).find(
    (f) => f.slug === partialFramework.slug,
  );

  const devCommand = getValue(frameworkItem, 'devCommand');
  const buildCommand = getValue(frameworkItem, 'buildCommand');
  const outputDirectory = getValue(frameworkItem, 'outputDirectory');

  const getOutputDirName = partialFramework.getOutputDirName
    ? partialFramework.getOutputDirName
    : async () => outputDirectory || 'public';

  return {
    devCommand,
    buildCommand,
    ...partialFramework,
    getOutputDirName,
  };
});
