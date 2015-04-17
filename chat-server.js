/*globals require, module, __dirname, process*/
/*jshint node:true*/
/**
 * Created by pmeijer on 12/30/2014.
 */

'use strict';

var PORT = 8080,
    NUM_SERVERS = 5,
    redisHost = process.env.REDIS_HOST || '127.0.0.1',
    redisPort = 6379,
    debug = require('debug'),
    NSPS = ['', 'Europe', 'Americas', 'Asia', 'Africa'],
    i;

var ChatServer = function (port) {
    this.running = false;
    this.port = port;
    this.server = null;
    this.io = null;
    this.logger = debug('ngChat:' + port);
    this.sockets = [];
    this.namespaces = {};
};

ChatServer.prototype.start = function () {
    var self = this,
        express = require('express'),
        socketIO = require('socket.io'),
        redis = require('redis'),
        adapter,
        pub,
        sub,
        app = express();

    // server and io starts listening
    app.use('/', express.static(__dirname + '/public/'));
    this.server = app.listen(this.port);
    this.io = socketIO.listen(this.server);
    this.running = true;

    // setup adapter to redis
    pub = redis.createClient(redisPort, redisHost);
    sub = redis.createClient(redisPort, redisHost, { detect_buffers: true });

    adapter = require('socket.io-redis')({
        host: redisHost,
        port: redisPort,
        pubClient: pub,
        subClient: sub
    });
    this.io.adapter(adapter);

    // add namespaces for socket io
    NSPS.forEach(function (name) {
        self.logger('adding namespace', name);
        self.addNamespace(name);
    });

    self.logger('listening');
};

ChatServer.prototype.addNamespace = function (name) {
    var self = this,
        logger = debug('ngChat:' + self.port + ':' + name),
        nsp = self.io.of('/' + name);
    this.namespaces[name] = {
        sockets: [],
        nsp: nsp
    };

    nsp.on('connection', function (socket) {
        var address = socket.handshake.headers['x-real-ip'] || socket.handshake.address;
        logger('Client "' + socket.id + '" connected from ' + address);
        self.namespaces[name].sockets.push(socket);
        socket.emit('message', {
            message: 'Welcome to the chat, you are in the namespace: "' + name + '"',
            room: 'Global',
            timeStamp: (new Date()).toISOString()
        });

        socket.on('subscribe', function (room) {
            logger('====== JOIN ' + room + '=======');
            logger('Nbr of rooms        : ' + Object.keys(io.nsps['/'].adapter.rooms).length);
            logger('joining room, socket:' + socket.id);
            socket.join(room);
            logger('Nbr of users        : ' + Object.keys(io.nsps['/'].adapter.rooms[room]).length);
            logger('Nbr of rooms        : ' + Object.keys(io.nsps['/'].adapter.rooms).length);
            logger('====== JOIN =======\n');
            //}
        });

        socket.on('unsubscribe', function(room) {
            logger('====== LEAVE ' + room + '=======');
            logger('Nbr of rooms        : ' + Object.keys(io.nsps['/'].adapter.rooms).length);
            logger('leaving room, socket: ' + socket.id);
            socket.leave(room);
            if (io.nsps['/'].adapter.rooms[room]) {
                logger('Nbr of users      : ' + Object.keys(io.nsps['/'].adapter.rooms[room]).length);
            }
            logger('Nbr of rooms        : ' + Object.keys(io.nsps['/'].adapter.rooms).length);
            logger('====== LEAVE =======\n');
        });

        socket.on('send', function (data) {
            logger('message from ' + data.user + ', "' + data.message + '" to room: ' + (data.room || 'Global'));
            if (data.room) {
                socket.broadcast.to(data.room).emit('message', data);
            } else {
                // This is a global message
                data.room = 'Global';
                socket.broadcast.emit('message', data);
            }
        });

        socket.on('disconnect', function () {
            logger('Client "' + socket.id + '" from ' + address + ' disconnected');
        });
    });
};

ChatServer.prototype.stop = function () {
    var namespace;
    this.logger('closing');
    this.server.close();
    this.running = false;

    for (namespace in this.namespaces) {
        if (this.namespaces.hasOwnProperty(namespace)) {
            this.namespaces[namespace].sockets.forEach(function (socket) {
                socket.disconnect(true);
            });
        }
    }
};

ChatServer.prototype.isRunning = function () {
    return this.running;
};


module.exports = ChatServer;

if (require.main === module) {
    for (i = 0; i < NUM_SERVERS; i += 1) {
        var chatServer = new ChatServer(PORT + i);
        chatServer.start();
    }
}
