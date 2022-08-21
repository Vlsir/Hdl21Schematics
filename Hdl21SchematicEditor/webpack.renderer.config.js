const rules = require('./webpack.rules');

rules.push({
  test: /\.css$/,
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});
rules.push({
  test: /\.svg$/,
  loader: 'svg-inline-loader'
})

module.exports = {
  // Put your normal webpack config below here
  module: {
    rules,
  },
};
