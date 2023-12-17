module.exports = {
  entry: './index.ts',
  output: {
    path: __dirname + '/models',
    filename: 'bundle.js'
  },
  resolveLoader: {
    modules: [
      __dirname + '/node_modules'
    ]
  },
  resolve: {
    modules: [
      __dirname + '/node_modules'
    ],
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader'
      }
    ]
  },
  node: {
    global: true
  }
};