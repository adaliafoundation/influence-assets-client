const { addBabelPlugin, override } = require('customize-cra');

const addSVGR = () => config => {
  const loaders = config.module.rules.find(rule => Array.isArray(rule.oneOf)).oneOf;
  loaders.unshift({
    test: /\.svg$/,
    exclude: /node_modules/,
    use: [{
      loader: '@svgr/webpack',
      options: {
        svgoConfig: {
          plugins: [
            {
              name: 'removeViewBox',
              active: false
            }
          ]
        }
      }
    }]
  });

  return config;
};

patchNpmModules = () => config => {
  const loaders = config.module.rules.find(rule => Array.isArray(rule.oneOf)).oneOf;
  loaders.unshift({
    test: /\.js$/,
    include: /node_modules\/@starknet-react/,
    use: [{
      loader: 'babel-loader',
      options: {
        plugins: [
          '@babel/plugin-proposal-nullish-coalescing-operator',
          '@babel/plugin-proposal-optional-chaining'
        ]
      }
    }]
  });

  return config;
};

module.exports = override(
  addBabelPlugin([
    'babel-plugin-root-import',
    {
      'rootPathPrefix': '~',
      'rootPathSuffix': 'src'
    }
  ]),
  patchNpmModules(),
  addSVGR()
);
