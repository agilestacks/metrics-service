const apiPrefix = '/api/v1';

const Koa = require('koa');
const cors = require('kcors');
const parser = require('koa-bodyparser');
const Router = require('koa-router');
const {isEmpty, trim} = require('lodash');

const {loggerFactory} = require('./logger');
const {ApiError, ErrorWrapper, ForbiddenError, trimAxiosVerbosity} = require('./errors');
const {db} = require('./db');

const versionController = require('./controllers/version');
const seriesController = require('./controllers/series');

const app = new Koa();

const routerConf = {
    prefix: apiPrefix
};
const router = new Router(routerConf);
const publicRouter = new Router(routerConf);
const pingRouter = new Router(routerConf);

router.use(async (ctx, next) => {
    const {
        request: {
            headers: {
                'x-user-organization': org,
                'x-user-id': id,
                'x-user-name': name,
                'x-user-role': role,
                'x-user-groups': groupsStr,
                'x-secrets-token': secretsToken
            }
        }
    } = ctx;

    if (org != null && id != null && role != null && groupsStr != null) {
        const groups = groupsStr.split(',').map(trim);
        const admin = groups.includes(`${org}.Admin`); // matches Auth Service check
        ctx.user = {org, id, name, role, admin, groups, secretsToken};
        await next();
    } else {
        throw new ForbiddenError();
    }
});

const withApiSecretOnly = (dispatch) => {
    const xApiSecret = process.env.METRICS_API_SECRET;
    return async (ctx, next) => {
        const {
            request: {
                headers: {
                    'x-api-secret': secret
                }
            }
        } = ctx;

        if (secret != null) {
            if (secret === xApiSecret) {
                await dispatch(ctx, next);
            } else {
                throw new ForbiddenError();
            }
        } else {
            await next();
        }
    };
};

pingRouter.use(async (ctx, next) => {
    const {method, url, logger} = ctx;
    logger.silly('PING Request <<< %s %s', method, url);

    try {
        await next();
    } catch (error) {
        logger.error('Error', {error});
    }

    logger.silly('PING Response >>> %d', ctx.status);
});
pingRouter.get('/ping', (ctx) => {
    ctx.body = 'pong';
});
pingRouter.get('/version', versionController.get);

publicRouter.post('/series', seriesController.post);

const idGenerator = {
    id: new Date().getTime(),
    next() {
        this.id = (this.id + 1) % Number.MAX_SAFE_INTEGER;
        return this.id.toString(36);
    }
};

module.exports = app
    .use(cors({exposeHeaders: ['Location']}))
    .use(parser())
    .use(async (ctx, next) => {
        const requestId = idGenerator.next();

        const logger = loggerFactory(requestId);

        Object.assign(
            ctx,
            {
                requestId,
                logger
            }
        );
        await next();
    })
    .use(pingRouter.routes())
    .use(pingRouter.allowedMethods())
    .use(async (ctx, next) => {
        const {method, url, request, logger} = ctx;

        logger.info('HTTP Request <<< %s %s', method, url);
        if (!isEmpty(request.body)) {
            logger.silly('HTTP Request body <<<', {body: request.body});
        }

        try {
            await next();
        } catch (error) {
            logger.error('Error %s %s', method, url, {error});
        }

        logger.info('HTTP Response >>> %d', ctx.status);
        if (!isEmpty(ctx.body)) {
            logger.silly('HTTP Response body >>>', {body: ctx.body});
        }
    })
    .use(async (ctx, next) => {
        try {
            await next();
        } catch (error) {
            ctx.logger.error('Error', {
                error: trimAxiosVerbosity(error),
                stack: (error.stack || '').split('\n')
            });

            const wrappedError = (error instanceof ApiError)
                ? error
                : new ErrorWrapper(error);

            ctx.status = wrappedError.status || 500;
            ctx.body = {errors: wrappedError.toResponse()};

            ctx.app.emit('error', wrappedError, ctx);
        }
    })
    .use(async (ctx, next) => {
        Object.assign(ctx, {db});
        await next();
    })
    .use(withApiSecretOnly(publicRouter.routes()))
    .use(router.routes())
    .use(router.allowedMethods());
