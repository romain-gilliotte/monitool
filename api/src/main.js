const Bull = require('bull');
const Redis = require("ioredis");
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const responseTime = require('koa-response-time');
const winston = require('winston');
const config = require('./config');
const MongoClient = require('mongodb').MongoClient;

winston.add(new winston.transports.Console())

// Catch the uncaught errors that weren't wrapped in a domain or try catch statement
process.on('uncaughtException', e => {
	// This should never be called, as we handle all errors insides promises.
	winston.log('error', e.message);
	process.exit(1)
});

// Init global variables
global.mongo = null;
global.database = null;
global.redis = null;
global.queue = null;
global.server = null;

async function start(web = true, worker = true) {
	global.mongo = await MongoClient.connect(
		config.mongo.uri,
		{ useUnifiedTopology: true }
	);

	global.database = global.mongo.db(config.mongo.database);
	global.redis = new Redis(config.redis.uri);
	global.queue = new Bull('workers', config.redis.uri);

	if (web) {
		app = new Koa();
		app.use(cors());
		app.use(responseTime());
		app.use(bodyParser({ jsonLimit: '1mb' }));
		app.use(require('./middlewares/error-handler'));

		if (process.env.NODE_ENV === 'test') {
			app.use(require('./middlewares/load-profile-test'));
		}
		else {
			app.use(require('./middlewares/authentication'));
			app.use(require('./middlewares/load-profile'));
		}
		app.use(require('./routers/input').routes());
		app.use(require('./routers/pdf-datasource').routes());
		app.use(require('./routers/pdf-logframe').routes());
		app.use(require('./routers/project').routes());
		app.use(require('./routers/rpc').routes());

		global.server = app.listen(config.port);
		winston.log('info', `Listening on ${config.port}.`);
	}

	if (worker) {
		require('./tasks/mail');
		require('./tasks/reporting');
		winston.log('info', `All tasks registered.`);
	}
}

async function stop() {
	if (global.mongo)
		global.mongo.close(true);

	if (global.queue)
		global.queue.close();

	if (global.redis)
		global.redis.disconnect();

	if (global.server)
		global.server.close();
}

// Start application if this file is executed.
if (require.main === module) {
	start();
}

module.exports = { start, stop };