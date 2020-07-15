import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import { normalizeRoutes, Route } from '@vercel/routing-utils';
import { PackageJson } from '@vercel/build-utils/dist';
import loadJsonFile from 'load-json-file';
import { getFramework } from './frameworks/get-framework';
import { Framework } from './frameworks/frameworks';
import * as lib from './lib';

export interface Context {
  debug: boolean;
  debugApis: boolean;
  debugApisPort: number;
  devCommand?: string;
  env: { [key: string]: string };
  framework?: Framework;
  packageJson?: PackageJson;
  routes?: Route[];
  targetOriginalPath: string;
  targetName: string;
  targetRootPath: string;
  targetSymlinkPath: string;
  targetSymlinkCodePath: string;
  targetTsConfigPath: string;
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

const ensureEnv = (s?: string): string => {
  if (s == null) {
    throw new Error('Expected env var to exist');
  }
  return s;
};

export default async function getContext(): Promise<Context> {
  const targetOriginalPath = ensureEnv(process.env.VND_TARGET_ORIGINAL_PATH);
  const targetName = ensureEnv(process.env.VND_TARGET_NAME);
  const targetTsConfigPath = ensureEnv(process.env.VND_TARGET_TS_CONFIG_PATH);
  const targetSymlinkPath = ensureEnv(process.env.VND_TARGET_SYM_LINK_PATH);
  const targetRootPath = ensureEnv(process.env.VND_TARGET_ROOT_PATH);

  const packageJsonPath = path.join(targetOriginalPath, 'package.json');

  const vercelConfig = await tryGetVercelConfig(targetOriginalPath);

  const context: Context = {
    debug: process.env.VND_DEBUG != null,
    debugApis: process.env.VND_DEBUG_APIS != null,
    debugApisPort: process.env.VND_DEBUG_APIS_PORT
      ? parseInt(process.env.VND_DEBUG_APIS_PORT)
      : 9292,
    devCommand: process.env.VND_DEV_COMMAND,
    env: getEnv(targetOriginalPath),
    targetOriginalPath,
    targetName,
    targetTsConfigPath,
    targetRootPath,
    targetSymlinkPath,
    targetSymlinkCodePath: path.resolve(targetSymlinkPath, targetRootPath),
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
