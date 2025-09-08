const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: './index.web.js',
    mode: isProduction ? 'production' : 'development',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      clean: true,
      publicPath: '/',
    },
  devServer: {
    port: 3000,
    open: true,
    historyApiFallback: true,
    hot: true,
  },
  resolve: {
    extensions: ['.web.js', '.web.ts', '.web.tsx', '.js', '.ts', '.tsx'],
    alias: {
      'react-native$': 'react-native-web',
      'react-native-vector-icons': 'react-native-vector-icons/dist',
      '@': path.resolve(__dirname, 'src'),
      // React Navigation Web compatibility fixes - simpler approach
      'react-native-gesture-handler': 'react-native-web',
      'react-native-safe-area-context': 'react-native-safe-area-context/lib/module/SafeAreaContext',
      'react-native-screens': 'react-native-web',
      'react-native-reanimated': 'react-native-web',
    },
    fallback: {
      'react-native': 'react-native-web',
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules\/(?!(react-native-vector-icons|react-native-elements|@react-navigation|react-native-web|react-native-reanimated|react-native-gesture-handler|react-native-safe-area-context|react-native-screens)\/).*/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/,
        type: 'asset/resource',
      },
      {
        test: /\.ttf$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[contenthash][ext]',
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      inject: true,
    }),
  ],
  devtool: isProduction ? false : 'source-map',
  ignoreWarnings: [/Failed to parse source map/],
  optimization: isProduction ? {
    splitChunks: {
      chunks: 'all',
    },
  } : undefined,
};
};