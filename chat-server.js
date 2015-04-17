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
    i;

var ChatServer = function (port) {
    this.port = port;
    this.server = null;
    this.logger = debug('ngChat:' + port);
    this.sockets = [];
};

ChatServer.prototype.start = function () {
    var self = this,
        express = require('express'),
        socketIO = require('socket.io'),
        redis = require('redis'),
        logger = this.logger,
        io,
        adapter,
        pub,
        sub,
        sockets = this.sockets,
        app = express();

    app.use('/', express.static(__dirname + '/public/'));
    this.server = app.listen(this.port);
    io = socketIO.listen(this.server);

    pub = redis.createClient(redisPort, redisHost);
    sub = redis.createClient(redisPort, redisHost, { detect_buffers: true });
    pub.on('error', function (err) {
        logger('pub', err);
    });
    sub.on('error', function (err) {
        logger('sub', err);
    });

    adapter = require('socket.io-redis')({
        host: redisHost,
        port: redisPort,
        pubClient: pub,
        subClient: sub
    });
    io.adapter(adapter);

    io.sockets.on('connection', function (socket) {
        logger('New client connected' + socket.id);
        sockets.push(socket);
        socket.emit('message', {
            message: 'Welcome to the chat',
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
            logger(self.port, data.user, data.message, data.room);
            if (data.room) {
                socket.broadcast.to(data.room).emit('message', data);
            } else {
                // This is a global message
                data.room = 'Global';
                socket.broadcast.emit('message', data);
            }
        });

        socket.on('disconnect', function () {
            logger(socket.id + ' disconnected');
        });
    });

    logger('listening');
};

ChatServer.prototype.stop = function () {
    this.logger('closing');
    this.server.close();
    this.sockets.forEach(function (socket) {
        socket.disconnect(true);
    });
};


module.exports = ChatServer;

if (require.main === module) {
    for (i = 0; i < NUM_SERVERS; i += 1) {
        var chatServer = new ChatServer(PORT + i);
        chatServer.start();
    }
}
