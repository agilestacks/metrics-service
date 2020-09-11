const {logger} = require('./src/logger');
const app = require('./src/app');

const port = process.env.METRICS_PORT || 3001;

app.listen(port, () => {
    logger.info('Listening port %s', port);
});
