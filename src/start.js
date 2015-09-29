'use strict';

var restify = require('restify'),
    bunyan  = require('bunyan'),
    getopt  = require('posix-getopt'),
    server  = require('./server'),
    config = require('config');

///--- Globals

var NAME          = 'playstore-api',
    serverRunning = false;

// In true UNIX fashion, debug messages go to stderr, and audit records go
// to stdout, so you can split them as you like in the shell
var LOG = bunyan.createLogger({
    name: NAME,
    streams: [
        {
            level: (process.env.LOG_LEVEL || config.logLevel),
            stream: process.stderr
        },
        {
            // This ensures that if we get a WARN or above all debug records
            // related to that request are spewed to stderr - makes it nice
            // filter out debug messages in prod, but still dump on user
            // errors so you can debug problems
            level: 'debug',
            type: 'raw',
            stream: new restify.bunyan.RequestCaptureStream({
                level: bunyan.WARN,
                maxRecords: 100,
                maxRequestIds: 1000,
                stream: process.stderr
            })
        }
    ],
    serializers: restify.bunyan.serializers
});

var exit = function(code) {
  if (app && serverRunning) {
    return app.seppuku();
  } else {
    return process.exit(code);
  }
};

process.on('uncaughtException', function(err) {
  LOG.error('Process uncaught exception, shutting down the server');
  LOG.error(err);
  return exit(1);
});

process.on('SIGINT', function() {
  LOG.info("SIGINT (Ctrl-C) received");
  return exit(0);
});

process.on('SIGTERM', function() {
  LOG.info("SIGTERM (kill) received");
  return exit(0);
});

///--- Mainline

var app = server.createServer({
    name: NAME,
    log: LOG,
    logAudit: config.logAudit
});

// At last, let's rock and roll
app.listen((process.env.PORT || config.serverPort), function onListening() {
    LOG.info('listening at %s', app.url);
    serverRunning = true;
});
