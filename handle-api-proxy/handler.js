const RemoteServerFactory = require('@salesforce/pwa-kit-runtime/ssr/server/build-remote-server').RemoteServerFactory;
const defaultPwaKitSecurityHeaders = require('@salesforce/pwa-kit-runtime/utils/middleware').defaultPwaKitSecurityHeaders;
const getConfig = require('@salesforce/pwa-kit-runtime/utils/ssr-config').getConfig;
const helmet = require('helmet');

const ProxyServerMixin = {
    _setupProxying(app, _) {
        const proxyConfigs = require('@salesforce/pwa-kit-runtime/utils/ssr-shared').proxyConfigs;
        proxyConfigs.forEach((config) => {
            app.use(config.proxyPath, config.proxy)
            app.use(config.cachingPath, config.cachingProxy)
        })
    }
}

const options = {
    // The contents of the config file for the current environment
    mobify: getConfig(),

    // The protocol on which the development Express app listens.
    // Note that http://localhost is treated as a secure context for development,
    // except by Safari.
    protocol: 'http'
}

const getRuntime = () => {
    const runtime = Object.assign({}, RemoteServerFactory, ProxyServerMixin)

    // The runtime is a JavaScript object.
    // Sometimes the runtime APIs are invoked directly as express middlewares.
    // In order to make sure the "this" keyword always have the correct context,
    // we bind every single method to have the context of the object itself
    const boundRuntime = {...runtime}
    for (const property of Object.keys(boundRuntime)) {
        if (typeof boundRuntime[property] === 'function') {
            boundRuntime[property] = boundRuntime[property].bind(boundRuntime)
        }
    }

    return boundRuntime
}

const runtime = getRuntime()

const { handler } = runtime.createHandler(options, app => {
    // Set default HTTP security headers required by PWA Kit
    app.use(defaultPwaKitSecurityHeaders)
    // Set custom HTTP security headers
    app.use(
        helmet({
            contentSecurityPolicy: {
                useDefaults: true,
                directives: {
                    'img-src': [
                        // Default source for product images - replace with your CDN
                        '*.commercecloud.salesforce.com'
                    ],
                    'script-src': [
                        // Used by the service worker in /worker/main.js
                        'storage.googleapis.com'
                    ],
                    'connect-src': [
                        // Connect to Einstein APIs
                        'api.cquotient.com'
                    ]
                }
            }
        })
    )
})

exports.get = handler;
