const path = require('path')
const webpack = require('webpack')

const commonModule = {
    rules: [
        {
            test: /\.ts$/,
            use: 'ts-loader',
            exclude: /node_modules/,
        },
        {
            test: /\.node$/,
            use: 'node-loader',
        },
    ],
}

const commonPlugins = [
    new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1,
    }),
    // Optional native/platform-specific submodules pulled in transitively by
    // @kubernetes/client-node's dependencies (ws, socks-proxy-agent, tar-fs, ...).
    // Handled gracefully at runtime by those libraries when absent.
    new webpack.IgnorePlugin({ resourceRegExp: /^(cpu-features|bufferutil|utf-8-validate)$/ }),
]

module.exports = {
    // Plugin bundle — Angular NgModule, loaded in-process by Tabby's renderer.
    target: 'node',
    entry: path.resolve(__dirname, 'src/index.ts'),
    mode: 'production',
    devtool: false,
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.js',
        libraryTarget: 'umd',
    },
    resolve: { extensions: ['.ts', '.js'] },
    module: commonModule,
    plugins: commonPlugins,
    externals: [
        ({ request }, callback) => {
            // tabby-* / @angular/* / rxjs / zone.js are provided by the host Tabby app at
            // runtime and must NOT be bundled. @kubernetes/client-node (and everything it
            // pulls in, including its ESM-only transitive deps) is intentionally NOT
            // matched here — it must be bundled directly into dist/index.js.
            if (/^(@angular\/|tabby-|rxjs|@ng-bootstrap|zone\.js)/.test(request)) {
                return callback(null, `commonjs ${request}`)
            }
            callback()
        },
    ],
}
