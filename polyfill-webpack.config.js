const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")

module.exports = {

    plugins: [
        new NodePolyfillPlugin({
            excludeAliases: ["console"]
        })
    ],
    resolve: {
        fallback: {
            fs: false,
        }
    }
};
