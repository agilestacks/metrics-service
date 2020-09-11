exports.up = (pgm) => {
    pgm.createTable('metrics', {
        id: { type: 'integer', notNull: true, primaryKey: true },
        organization: { type: 'string', notNull: true },
        kind: { type: 'string', notNull: true },
        unit: { type: 'string', notNull: false },
        timestamp: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    });

    pgm.createTable('series', {
        metric_id: { type: 'integer', notNull: true, references: 'metrics' },
        value: { type: 'real', notNull: true },
        timestamp: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
    });
};

exports.down = (pgm) => {
    pgm.dropTable('series', { ifExists: true });
    pgm.dropTable('metrics', { ifExists: true });
};
