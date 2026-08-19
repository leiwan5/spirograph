// Learn more: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo.
config.watchFolders = [workspaceRoot];

// 2. Let Metro resolve symlinked workspace packages to their real location.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. The @spirograph/* packages are workspace symlinks that point at their package
//    dir; Metro follows them automatically once node_modules roots are configured.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
