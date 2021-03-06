const {
    DATABASE_URL: url,
    POSTGRESQL_HOST: host,
    POSTGRESQL_PORT: port,
    POSTGRESQL_DB: database,
    POSTGRESQL_USER: user,
    POSTGRESQL_PASSWORD: password,
    POSTGRESQL_SCHEMA: schema
} = process.env;

const pgp = require('pg-promise')({schema});

const db = pgp(url || {host, port, database, user, password});

module.exports = {db};
