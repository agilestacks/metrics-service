# Metrics Service API

Metrics Service provides HTTP [API] to submit timeseries metrics:

- metric name, like `hubcli.commands.usage`;
- metric kind: `count`, `gauge`, etc.;
- tags as array of {key : value} pairs, ie. `[{command: deploy}, {host: <uuid>}];
- metric value: any number, saved as PostgreSQL [`real`](https://www.postgresql.org/docs/11/datatype-numeric.html#DATATYPE-FLOAT) 32-bit float datatype;
- optionally, unit of measure: `byte`, `percent`, etc.

[API]: https://agilestacks.github.io/metrics-service/API.html
