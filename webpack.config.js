const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
    entry: './index.js',
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'dist')
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'index.html'
        })
    ],
    resolve: {
        extensions: ['.js'],
    },
    module: {
        rules: [{
            test: /\.css/,
            use: [
                "style-loader",
                "css-loader"
            ]
        }]
    }
}