'use strict';

var restify         = require('restify'),
    bunyan          = require('bunyan'),
    seppuku         = require('seppuku'),
    config          = require('config'),
    newsController  = require('./controllers/sports/news-controller');

///--- API

/**
 * Returns a server with all routes defined on it
 */
function createServer(options) {
    // Create a server with our logger and custom formatter
    // Note that 'version' means all routes will default to
    // 1.0.0
    var server = restify.createServer({
        log: options.log,
        name: options.name,
        version: '1.0.0'
    });

    // Ensure we don't drop data on uploads
    server.pre(restify.pre.pause());

    // Clean up sloppy paths like //xyz//////1//
    server.pre(restify.pre.sanitizePath());

    // Handles annoying user agents (curl)
    server.pre(restify.pre.userAgentConnection());

    // Set a per request bunyan logger (with requestid filled in)
    server.use(restify.requestLogger());

    // Use the common stuff
    server.use(restify.acceptParser(server.acceptable));
    server.use(restify.dateParser());
    server.use(restify.authorizationParser());
    server.use(restify.queryParser());
    server.use(restify.gzipResponse());
    server.use(restify.bodyParser());

    // Use sepukku to allow node.js workes die honorably
    server.use(seppuku(server, {
      minDeferralTime: config.shutDownTimeout,
      maxDeferralTime: config.shutDownTimeout,
      trapExceptions: false
    }));

    server.use(function crossOrigin(req,res,next){
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "X-Requested-With");
      return next();
    });

    server.pre(function (request, response, next) {
        request.log.info({ req: request }, 'REQUEST');
        next();
    });

    // Register a default '/' handler
    server.get('/', function root(req, res, next) {
        var routes = [
            'GET     /',
            'GET     /v1/sports/news'
        ];
        res.send(200, routes);
        next();
    });

    server.get('/v1/sports/news', newsController.getNews);

    // Setup an audit logger
    if (options.logAudit) {
        server.on('after', restify.auditLogger({
            body: false,
            log: bunyan.createLogger({
                level: 'info',
                name: options.name+'-audit',
                stream: process.stdout
            })
        }));
    }

    return (server);
}


///--- Exports

module.exports = {
    createServer: createServer
};
