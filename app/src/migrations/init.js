const Plugin = require('models/plugin.model');
const Microservice = require('models/microservice.model');
const Endpoint = require('models/endpoint.model');
const Version = require('models/version.model');
const appConstants = require('app.constants');
const logger = require('logger');

module.exports = async function init() {
    const version = await Version.find();
    if (version && version.length > 0) {
        logger.info('Database ready!!');
        return;
    }

    logger.info('Initializing migration');
    await Plugin.remove({});
    logger.info('Creating new plugins');
    await new Plugin({
        name: 'timeRequest',
        description: 'Show time of the request',
        mainFile: 'plugins/timeRequest',
        active: true,
    }).save();
    await new Plugin({
        name: 'manageErrors',
        description: 'Manage Errors',
        mainFile: 'plugins/manageErrors',
        active: true,
        config: {
            jsonAPIErrors: true,
        },
    }).save();
    await new Plugin({
        name: 'cors',
        description: 'Add CORS Headers',
        mainFile: 'plugins/cors',
        active: true,
    }).save();
    await new Plugin({
        name: 'invalidateCacheEndpoint',
        description: 'Invalidate cache endpoints in varnish',
        mainFile: 'plugins/invalidate-cache',
        active: false,
    }).save();
    await new Plugin({
        name: 'formatter',
        description: 'Formatter response',
        mainFile: 'plugins/formatter',
        active: true,
    }).save();

    await new Plugin({
        name: 'statistics',
        description: 'Add statistics info',
        mainFile: 'sd-ct-statistics-plugin',
        active: true,
        cronFile: 'sd-ct-statistics-plugin/cron',
    }).save();
    await new Plugin({
        name: 'sessionMongo',
        description: 'Add session support with mongodb',
        mainFile: 'plugins/sessionMongo',
        active: true,
        config: {
            cookieDomain: process.env.COOKIE_DOMAIN,
            sessionKey: process.env.SESSION_KEY || 'control-tower',
        },
    }).save();

    await new Plugin({
        name: 'oauth',
        description: 'Plugin oauth with passport',
        mainFile: 'sd-ct-oauth-plugin',
        active: true,
        config: {
            defaultApp: 'gfw',
            thirdParty: {},
            local: {
                active: true,
                sparkpostKey: process.env.SPARKPOST_KEY,
                confirmUrlRedirect: process.env.CONFIRM_URL_REDIRECT,
            },
            basic: {
                active: false,
                userId: process.env.BASICAUTH_USERNAME,
                password: process.env.BASICAUTH_PASSWORD,
                role: 'ADMIN',
            },
            jwt: {
                active: true,
                secret: process.env.JWT_SECRET,
                passthrough: true,
                expiresInMinutes: 0,
            },
            publicUrl: process.env.PUBLIC_URL,
            allowPublicRegistration: true
        },
    }).save();

    await new Plugin({
        name: 'redisCache',
        description: 'Cache request',
        mainFile: 'sd-ct-redis-cache-plugin',
        active: false,
        config: {
            redis: {
                host: process.env.REDIS_PORT_6379_TCP_ADDR,
                port: process.env.REDIS_PORT_6379_TCP_PORT,
            },
            timeCache: 60 * 60 * 24,
        },
    }).save();
    await new Plugin({
        name: 'appKey',
        description: 'Application key authorization',
        mainFile: 'plugins/app-key',
        active: true,
        config: {
            headerName: 'app_key',
            secret: process.env.JWT_SECRET
        },
    }).save();
    await new Plugin({
        name: 'fastlyCache',
        description: 'Fastly Cache request',
        mainFile: 'plugins/fastly-cache',
        active: false,
        config: {
            key: process.env.FASTLY_APIKEY,
            serviceId: process.env.FASTLY_SERVICEID,
        },
    }).save();

    await Microservice.remove({});
    await Endpoint.remove({});
    await Version.remove({});
    await new Version({ name: appConstants.ENDPOINT_VERSION, version: 1 }).save();
};
