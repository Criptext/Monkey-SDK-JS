var path = require('path');
module.exports = { 
  entry: path.join(__dirname, 'main.js'),
  output: {
    path: path.join(__dirname, 'dist'),
    publicPath: 'monkey/dist/',
    filename: 'monkey.js',
    library: "monkey"
  },
   externals: {
      monkey:"monkey"
  },
   module: {
      loaders: [
          { test: /(main\.js|MOKMessage\.js)$/,
            loader: 'babel-loader',
            exclude: /node_modules/,
            query: {
              presets: ['es2015']
            }
          }
      ]
  }
};

