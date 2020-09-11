const {pick} = require('lodash');

const errorTypes = {
    400: 'badRequest',
    403: 'forbidden',
    404: 'notFound',
    500: 'serverError'
};

class ApiError extends Error {
    constructor(message, {source, status, meta} = {}) {
        super(message);

        // Capture stack trace, excluding constructor call from it.
        Error.captureStackTrace(this, this.constructor);

        this.status = status || 500;
        this.meta = meta || {};
        this.stack = this.meta.stack || this.stack;
        if (source !== undefined) this.source = source;
    }

    toResponse() {
        return [{
            type: errorTypes[this.status] || errorTypes[500],
            source: this.source,
            detail: this.message,
            meta: {stack: this.stack, ...this.meta}
        }];
    }
}

class ServerError extends ApiError {
    constructor(message, {source, meta} = {}) {
        super(message, {source, status: 500, meta});
    }
}

class ValidationError extends ApiError {
    constructor(errors) {
        super('validation error', {status: 400});
        this.errors = errors;
    }

    toResponse() {
        return this.errors.map(err => ({
            type: errorTypes[this.status],
            source: err.dataPath,
            detail: err.message,
            meta: err
        }));
    }
}

class ErrorWrapper extends ApiError {
    constructor(error, meta = {}) {
        super(error.message, {
            status: (error.response ? error.response.status : undefined) || error.status || 500,
            meta: {stack: error.stack, ...meta}
        });
    }
}

class ForbiddenError extends ApiError {
    constructor(message = 'Operation is not permitted to current user') {
        super(message, {status: 403});
    }
}

class NotFoundError extends ApiError {
    constructor(message = 'Entity not found', meta = {}) {
        super(message, {status: 404, meta});
    }
}

class BadRequestError extends ApiError {
    constructor(message, meta) {
        super(message, {status: 400, meta});
    }
}

class ConflictError extends ApiError {
    constructor(message, meta) {
        super(message, {status: 409, meta});
    }
}

class BadGatewayError extends ApiError {
    constructor(message, meta) {
        super(message, {status: 502, meta});
    }
}

function trimAxiosVerbosity(error) {
    if (error.isAxiosError) {
        return new ErrorWrapper(error,
            pick(error, ['reason', 'code',
                'config.url', 'config.baseURL', 'config.timeout',
                'request.method', 'request.path',
                'response.status', 'response.statusText', 'response.data']));
    }
    return error;
}

module.exports = {
    ApiError,
    ServerError,
    ValidationError,
    ErrorWrapper,
    ForbiddenError,
    NotFoundError,
    BadRequestError,
    ConflictError,
    BadGatewayError,
    trimAxiosVerbosity
};
