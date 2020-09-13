/* eslint-disable prefer-destructuring, no-underscore-dangle */
// const crypto = require('crypto');
const axios = require('axios');

const {
    DATABASE_URL: url,
    POSTGRESQL_SCHEMA: schema
} = process.env;

const pgp = require('pg-promise')({schema});

const db = pgp(url);

const xApiSecret = process.env.METRICS_API_SECRET;

const apiPrefix = '/api/v1';
const apiConfig = {
    baseURL: 'http://localhost:3001',
    timeout: 3000,
    maxContentLength: 65536,
    validateStatus: () => true
};
const withApiPrefix = {baseURL: `${apiConfig.baseURL}${apiPrefix}`};
const withApiSecret = () => ({headers: {'X-API-Secret': xApiSecret}});
// const randomSuf = () => crypto.randomBytes(3).toString('hex');

const apiV1 = axios.create({...apiConfig, ...withApiPrefix});

describe('basic routing', () => {
    test('ping', async () => {
        expect.assertions(2);

        const getResp = await apiV1.get('/ping');
        expect(getResp.status).toBe(200);
        expect(getResp.data).toBe('pong');
    });

    test('version', async () => {
        expect.assertions(2);

        const getResp = await apiV1.get('/version');
        expect(getResp.status).toBe(200);
        expect(getResp.data.rev).toBeDefined();
    });
});

const testMetrics = [
    {
        name: 'm1',
        kind: 'count',
        unit: 'bytes',
        value: 1,
        tags: {x: 'y'},
        timestamp: '2020-09-09 20:20:09.555'
    },
    {
        name: 'm1',
        kind: 'count',
        unit: 'bytes',
        value: 2,
        tags: {x: 'y'},
        timestamp: '2020-09-09 20:20:19.555'
    },
    {
        name: 'm2',
        kind: 'gauge',
        value: 3,
        tags: {host: 'zzz'},
        timestamp: '2020-09-09 20:20:29.555'
    },
    {
        name: 'm2',
        kind: 'gauge',
        value: 4,
        tags: {host: 'zzz'},
        timestamp: '2020-09-09 20:20:39.555'
    },
    {
        name: 'm2',
        kind: 'gauge',
        value: 5,
        tags: {host: 'zzz'},
        timestamp: '2020-09-09 20:20:49.555'
    }
];

describe('series', () => {
    afterAll(db.$pool.end);

    test('post', async () => {
        expect.assertions(12);

        const now = Date.now() / 1000;
        await Promise.all([0, 1, 2, 3].map(async (sec) => {
            const postResp = await apiV1.post('/series',
                testMetrics.map(m => ({...m, ...(sec > 0 ? {timestamp: now + sec} : {})})),
                withApiSecret());
            expect(postResp.status).toBe(202);
            expect(postResp.data.status).toBe('ok');
        }));

        const {cnt: cntSeries} = await db.one('select count(1) as cnt from series');
        expect(cntSeries % 20).toBe(0);
        const {sum: sumSeries} = await db.one('select sum(value) as sum from series');
        expect(sumSeries).toBeGreaterThanOrEqual(60);
        expect(sumSeries % 60).toBe(0);
        const {cnt: cntMetrics} = await db.one('select count(distinct name) as cnt from metrics');
        expect(cntMetrics).toBe('2');
    });

    test('post not found', async () => {
        expect.assertions(1);

        const postResp = await apiV1.post('/series', []);
        expect(postResp.status).toBe(404);
    });
});
