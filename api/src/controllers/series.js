const {map} = require('lodash');
const cache = require('../promiseCache');

function validate() {
}

const metrics = {};
const queries = {};

async function retrieve(db, org, metric, kind, unit) {
    const id = await db.task('retrieve', async (t) => {
        const existing = await t.oneOrNone(
            'select id from metrics where organization = $1 and name = $2 and kind = $3',
            [org, metric, kind])
            .then(r => (r ? r.id : null));
        if (existing) return existing;
        const {id: fresh} = await t.one(
            'insert into metrics (organization, name, kind, unit) values($1, $2, $3, $4) returning id',
            [org, metric, kind, unit]);
        return fresh;
    });
    const key = `${org}|${metric}|${kind}`;
    metrics[key] = id;
    delete queries[key];
    return id;
}

async function metricRef(db, org, entry) {
    const {metric, kind, unit} = entry;
    const key = `${org}|${metric}|${kind}`;
    const ref = metrics[key];
    if (ref) return ref;
    const query = queries[key];
    if (query) return query();
    const promise = cache(() => retrieve(db, org, metric, kind, unit));
    queries[key] = promise;
    return promise();
}

async function insert(db, org, series) {
    const refs = await Promise.all(series.map(entry => metricRef(db, org, entry)));
    const defaultTs = Math.floor(Date.now() / 1000);
    await db.tx('insert', tx => Promise.all(map(series, ({value, tags, timestamp = defaultTs}, i) => tx.none(
        `insert into series (metric_id, value, tags, ts)
            values ($1, $2, $3, ${typeof timestamp == 'number' ? 'to_timestamp($4)' : '$4'})`,
        [refs[i], value, tags, timestamp])))
    );
}

module.exports = {
    async post(ctx) {
        const {
            db,
            // logger,
            request: {body: series}
        } = ctx;

        validate(series);
        if (!series.length) return;
        await insert(db, 'ASI', series);

        ctx.status = 202;
        ctx.body = {status: 'ok'};
    }
};
