// 
// # Extension Webpack Configuration
// 
// Adapted from Microsoft's vscode-extension-samples:
// https://github.com/microsoft/vscode-extension-samples/tree/main/webpack-sample
// 

//@ts-check
'use strict';

const path = require('path');

/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node',
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: 'extension.js',
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]",
  },
  devtool: 'cheap-module-source-map',
  // devtool: 'source-map',
  externals: {
    vscode: "commonjs vscode"
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [{
      test: /\.ts$/,
      exclude: /node_modules/,
      use: [{
        loader: 'ts-loader',
        options: {
          compilerOptions: {
            "module": "es6"
          }
        }
      }]
    }]
  },
}

module.exports = config;