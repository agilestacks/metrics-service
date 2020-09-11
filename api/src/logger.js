const {createLogger, format, transports} = require('winston');
const {LEVEL, MESSAGE, SPLAT} = require('triple-beam');
const {inspect} = require('util');
const {omit} = require('lodash');

const {combine, timestamp: formatTimestamp, splat, colorize} = format;

const omitFields = [MESSAGE, SPLAT, LEVEL, 'level', 'message', 'timestamp', 'loggerId'];

const outputFormat = format((info) => {
    const meta = inspect(omit(info, omitFields), {
        depth: 4,
        colors: true,
        compact: false,
        breakLength: 100
    });

    const {
        timestamp,
        loggerId,
        level,
        message
    } = info;

    const formatedMessage = [
        `${timestamp} - ${loggerId} - ${level}: ${message}`,
        meta !== '{}' && meta
    ]
        .filter(Boolean)
        .join('\n');

    return {
        ...info,
        [MESSAGE]: formatedMessage
    };
});

const baseLogger = createLogger({
    level: process.env.HUB_LOG_LEVEL || 'debug',
    format: combine(
        formatTimestamp(),
        colorize({level: true}),
        splat(),
        outputFormat()
    ),
    transports: [
        new transports.Console({
            handleExceptions: true
        })
    ],
    exitOnError: false
});

function loggerFactory(loggerId) {
    const logger = Object.create(baseLogger);

    logger.defaultMeta = {
        loggerId
    };

    return logger;
}

module.exports = {
    logger: loggerFactory('app-default'),
    loggerFactory
};
