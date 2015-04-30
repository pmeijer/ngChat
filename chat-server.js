/*globals require, module, __dirname, process*/
/*jshint node:true*/
/**
 * Created by pmeijer on 12/30/2014.
 */

'use strict';

var PORT = 8080,
    NUM_SERVERS = 1,
    redisHost = process.env.REDIS_HOST || '127.0.0.1',
    redisPort = 6379,
    debug = require('debug'),
    NSPS = ['Europe', 'Americas', 'Asia', 'Africa'],
    i;

var ChatServer = function (port) {
    this.running = false;
    this.port = port;
    this.server = null;
    this.io = null;
    this.logger = debug('ngChat:' + port);
    this.sockets = [];
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


    this.server.on('connection', function (socket) {
        var socketId = socket.remoteAddress + ':' + socket.remotePort;

        self.sockets[socketId] = socket;
        self.logger('socket connected (added to list) ' + socketId);

        socket.on('close', function () {
            if (self.sockets.hasOwnProperty(socketId)) {
                self.logger('socket closed (removed from list) ' + socketId);
                delete self.sockets[socketId];
            }
        });
    });

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

    //for (var i = 0; i < 10000; i += 1) {
    //    NSPS.push('nsp_' + i.toString());
    //}
    // add namespaces for socket io
    NSPS.forEach(function (name) {
        self.logger('adding namespace', name);
        self.addNamespace(name);
    });

    self.logger('listening');
};

ChatServer.prototype.addNamespace = function (name) {
    var self = this,
        logger = debug('ngChat:' + self.port + ':nsp:' + name),
        nsp = self.io.of('/' + name);

    nsp.on('connection', function (socket) {
        var address = socket.handshake.headers['x-real-ip'] || socket.handshake.address;
        logger('--- Connection ' + name + ' ---');
        logger('Socket id             : ' + socket.id);
        logger('Client address        : ' + address);
        logger('Nbr of clients in nsp : ' + nsp.sockets.length);
        logger('Nbr of clients (total): ' + self.io.sockets.sockets.length);
        logger('----- Connection -----\n');
        socket.on('subscribe', function (room) {
            logger('===== JOIN ' + room + '======');
            logger('Nbr of rooms (pre)  : ' + Object.keys(nsp.adapter.rooms).length);
            logger('Socket id           : ' + socket.id);
            socket.join(room);
            logger('Nbr of users (room) : ' + Object.keys(nsp.adapter.rooms[room]).length);
            logger('Nbr of rooms        : ' + Object.keys(nsp.adapter.rooms).length);
            logger('====== JOIN =======\n');
            socket.emit('message', {
                message: 'Joined room "' + room + '"',
                room: 'Global',
                nsp: name,
                timeStamp: (new Date()).toISOString()
            });
            //}
        });

        socket.on('unsubscribe', function(room) {
            logger('===== LEAVE ' + room + '======');
            logger('Nbr of rooms (pre)  : ' + Object.keys(nsp.adapter.rooms).length);
            logger('Socket id           : ' + socket.id);
            socket.leave(room);
            if (nsp.adapter.rooms[room]) {
                logger('Nbr of users (room) : ' + Object.keys(nsp.adapter.rooms[room]).length);
            } else {
                logger('Nbr of users (room) : 0 -> room will be destroyed.');
            }
            logger('Nbr of rooms        : ' + Object.keys(nsp.adapter.rooms).length);
            logger('====== LEAVE =======\n');
            socket.emit('message', {
                message: 'Left room "' + room + '"',
                room: 'Global',
                nsp: name,
                timeStamp: (new Date()).toISOString()
            });
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

        socket.emit('message', {
            message: 'Welcome you are in the namespace: "' + name + '"',
            room: 'Global',
            nsp: name,
            timeStamp: (new Date()).toISOString()
        });
    });
};

ChatServer.prototype.stop = function () {
    var key,
        self = this;
    this.logger('closing');
    this.server.close(function () {
        self.running = false;
    });

    for (key in self.sockets) {
        if (self.sockets.hasOwnProperty(key)) {
            self.sockets[key].destroy();
            delete self.sockets[key];
            self.logger('destroyed open socket ' + key);
            //numDestroyedSockets += 1;
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
