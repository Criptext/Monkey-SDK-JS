var path = require('path');
var webpack = require('webpack');
module.exports = {
  target: 'web',
  entry: path.join(__dirname, 'main.js'),
  output: {
    path: path.join(__dirname, 'dist'),
    publicPath: 'monkey/dist/',
    filename: 'monkey.js',
    libraryTarget: 'umd',
    library: 'Monkey'
  },
  module: {
    loaders: [
      { test: /\.js$/,
        loader: 'babel-loader',
        exclude: /(node_modules|bower_components|libs)/,
        query: {
          presets: ['es2015']
        }
      }
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({
      'fetch': 'imports?this=>global!exports?global.fetch!whatwg-fetch'
    }),
    // new webpack.IgnorePlugin(/(jsencrypt.min.js)$/)
    new webpack.IgnorePlugin(/(io\.js|node12\.js)$/, /node-rsa/)
  ]
};
