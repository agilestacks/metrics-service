exports.up = (pgm) => {
    pgm.createTable('metrics', {
        id: { type: 'serial', primaryKey: true },
        organization: { type: 'string', notNull: true },
        name: { type: 'string', notNull: true },
        kind: { type: 'string', notNull: true },
        unit: { type: 'string', notNull: false },
        ts: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    }, {
        constraints: {
            'metrics_uk': { unique: ['organization', 'name', 'kind']}
        }
    });

    pgm.createIndex('metrics', 'name');

    pgm.createTable('series', {
        metric_id: { type: 'integer', notNull: true, references: 'metrics' },
        value: { type: 'real', notNull: true },
        tags: { type: 'jsonb', notNull: false},
        ts: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    });

    pgm.createIndex('series', [{ name: 'tags', opclass: { name: 'jsonb_path_ops' }}], {method: 'gin'});
};

exports.down = (pgm) => {
    pgm.dropTable('series', { ifExists: true });
    pgm.dropTable('metrics', { ifExists: true });
};
