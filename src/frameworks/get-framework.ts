/**
 * This file has been extract from the official vercel repo.
 *
 * packages/now-static-build/src/index.ts
 */

import { PackageJson } from '@vercel/build-utils';
import { frameworks, Framework } from './frameworks';

export function getFramework(pkg: PackageJson): Framework | undefined {
  const dependencies = Object.assign({}, pkg.dependencies, pkg.devDependencies);
  const framework = frameworks.find(
    ({ dependency }) => dependencies[dependency || ''],
  );
  return framework;
}
