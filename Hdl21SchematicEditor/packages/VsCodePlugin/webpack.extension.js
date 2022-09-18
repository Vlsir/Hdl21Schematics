// FIXME! using webpack here seems like a fine idea in theory, but doesn't seem to load the extension. 
// It probably tried to import some parts of the editor which fail, get stuck, whatever. 
// This file is here largely for this warning, but doesn't work. 

const path = require('path');

module.exports = {
  entry: './src/extension.ts',
  output: {
    filename: 'extension.js',
    path: path.resolve(__dirname, 'out'),
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: {
            projectReferences: true
          }
        },
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  // VsCode creates some stuff "on the fly", and cannot WebPack it. 
  // https://webpack.js.org/configuration/externals/
  externals: {
    'vscode': 'commonjs vscode',
    'util': 'commonjs util',
  },
};