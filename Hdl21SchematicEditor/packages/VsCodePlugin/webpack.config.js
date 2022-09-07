const path = require('path');

module.exports = {
  entry: './src/webview.js',
  output: {
    filename: 'webview.js',
    path: path.resolve(__dirname, 'out'),
  },
};