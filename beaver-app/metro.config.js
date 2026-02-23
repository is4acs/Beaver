const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Fix: disable package exports resolution for packages that use subpath imports
// without proper exports field (e.g. @expo/metro-runtime/error-overlay)
config.resolver.unstable_enablePackageExports = false;

// Fix: explicitly resolve @expo/metro-runtime subpaths that Metro fails to find
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle @expo/metro-runtime subpath imports
  if (moduleName === '@expo/metro-runtime/error-overlay') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'node_modules/@expo/metro-runtime/error-overlay.js'),
    };
  }
  if (moduleName === '@expo/metro-runtime/async-require') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'node_modules/@expo/metro-runtime/async-require.js'),
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
