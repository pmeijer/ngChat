/**
 * @author lattmann / https://github.com/lattmann
 */
'use strict';

var ChatServer = require('./chat-server'),
    chatServer,
    chatServers = {},

    PORT = process.env.PORT || 8080,
    debug = require('debug'),
    logger = debug('ngChat:supervisor'),
    express = require('express'),
    app = express();

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.use('/', express.static(__dirname + '/public_app/'));

app.get('/api/servers', function (req, res, next) {
    var result = {},
        key;

    for (key in chatServers) {
        if (chatServers.hasOwnProperty(key)) {
            result[key] = {
                port: key,
                online: chatServers[key].isRunning()
            };
        }
    }

    res.json(result);
});

app.get('/api/servers/:port', function (req, res, next) {
    var port = req.params.port;
    if (chatServers.hasOwnProperty(port) === false) {
        res.json(chatServers[port].isRunning());
    } else {
        res.sendStatus(200);
    }
});

app.post('/api/servers/:port', function (req, res, next) {
    var port = req.params.port;
    if (chatServers.hasOwnProperty(port) === false) {
        logger('creating server ' + port);
        chatServers[port] = new ChatServer(port);
        res.sendStatus(201);
    } else {
        res.sendStatus(200);
    }
});

app.delete('/api/servers/:port', function (req, res, next) {
    var port = req.params.port;
    if (chatServers.hasOwnProperty(port)) {
        logger('deleting server ' + port);
        if (chatServers[port].isRunning()) {
            chatServers[port].stop();
        }
        delete chatServers[port];
        res.sendStatus(204);
    } else {
        res.sendStatus(404);
    }
});

app.post('/api/servers/:port/start', function (req, res, next) {
    var server = chatServers[req.params.port];
    if (server) {
        if (server.isRunning() === false) {
            logger('starting server ' + req.params.port);
            server.start();
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

app.post('/api/servers/:port/stop', function (req, res, next) {
    var server = chatServers[req.params.port];
    if (server) {
        if (server.isRunning()) {
            logger('stopping server ' + req.params.port);
            server.stop();
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

app.listen(PORT);
logger('up and running on ' + PORT);

var i,
    port;

for (i = 1; i < 5; i += 1) {
    port = PORT + i;
    chatServers[port] = new ChatServer(port);
    chatServers[port].start();
}