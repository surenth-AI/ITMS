const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// react-i18next's ES module build imports withSSR.js which fails in Metro.
// Alias it to the pre-bundled UMD file that has no external SSR imports.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-i18next') {
    return {
      filePath: path.resolve(
        __dirname,
        'node_modules/react-i18next/react-i18next.js'
      ),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
