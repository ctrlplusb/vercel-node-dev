import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import { normalizeRoutes, Route } from '@vercel/routing-utils';
import { PackageJson } from '@vercel/build-utils/dist';
import loadJsonFile from 'load-json-file';
import { getFramework } from '../frameworks/get-framework';
import { Framework } from '../frameworks/frameworks';
import * as lib from '../lib';

export interface Context {
  debugApis: boolean;
  debugApisPort: number;
  env: { [key: string]: string };
  targetRootDir: string;
  framework?: Framework;
  routes?: Route[];
  packageJson?: PackageJson;
}

export interface Ports {
  apiServer: number;
  proxyServer: number;
  uiServer: number;
}

export interface VercelConfig {
  routes: Route[];
}

function getEnv(target: string): { [key: string]: string } {
  const envFilePath = path.join(target, '.env');
  const dotEnvLoadResult = fs.existsSync(envFilePath)
    ? dotenv.parse(fs.readFileSync(envFilePath, { encoding: 'utf-8' }))
    : undefined;
  return {
    ...(dotEnvLoadResult != null ? dotEnvLoadResult : {}),
    NODE_ENV: 'development',
  };
}

async function tryGetVercelConfig(
  target: string,
): Promise<VercelConfig | undefined> {
  const vercelJsonPath = path.join(target, 'vercel.json');
  if (fs.existsSync(vercelJsonPath)) {
    const result = await loadJsonFile(vercelJsonPath);
    return (result as unknown) as VercelConfig;
  }
  return undefined;
}

export default async function getContext(): Promise<Context> {
  const targetRootDir = process.env.VND_TARGET;
  if (targetRootDir == null) {
    throw new Error('Invalid state, expected VND_TARGET to be bound');
  }

  const packageJsonPath = path.join(targetRootDir, 'package.json');

  const vercelConfig = await tryGetVercelConfig(targetRootDir);

  const context: Context = {
    debugApis: process.env.VND_DEBUG_APIS != null,
    debugApisPort: process.env.VND_DEBUG_APIS_PORT
      ? parseInt(process.env.VND_DEBUG_APIS_PORT)
      : 9292,
    env: getEnv(targetRootDir),
    targetRootDir,
    packageJson: fs.existsSync(packageJsonPath)
      ? ((await loadJsonFile(packageJsonPath)) as PackageJson)
      : undefined,
  };

  if (context.packageJson) {
    context.framework = getFramework(context.packageJson);
    if (context.framework) {
      lib.debug(`Identified framework as ${context.framework.name}`);
    }
  }

  const { error, routes } = normalizeRoutes(vercelConfig?.routes || []);

  if (error) {
    throw error;
  }

  context.routes = routes || [];

  lib.debug('Context', context);

  return context;
}
