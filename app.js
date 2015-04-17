/*globals require, module, __dirname, process*/
/*jshint node:true*/
/**
 * Created by pmeijer on 12/30/2014.
 */

var PORT = 8080,
    NUM_SERVERS = 5,
    redisHost = process.env.REDIS_HOST || '127.0.0.1',
    redisPort = 6379,
    debug = require('debug'),
    i;

var startServer = function (port) {
    'use strict';
    var express = require('express'),
        socketIO = require('socket.io'),
        redis = require('redis'),
        logger = debug('ngChat:' + port),
        io,
        adapter,
        server,
        pub,
        sub,
        sockets = [],
        app = express();

    app.use('/', express.static(__dirname + '/public/'));
    server = app.listen(port);
    io = socketIO.listen(server);

    pub = redis.createClient(redisPort, redisHost);
    sub = redis.createClient(redisPort, redisHost, { detect_buffers: true });
    pub.on('error', function (err) {
        logger('pub', err);
    });
    sub.on('error', function (err) {
        logger('sub', err);
    });

    adapter = require('socket.io-redis')({
        host:redisHost,
        port:redisPort,
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
            timeStamp: (new Date()).toISOString()});

        socket.on('subscribe', function(room) {
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

        socket.on('send', function(data) {
            logger(port, data.user, data.message, data.room);
            if (data.room) {
                socket.broadcast.to(data.room).emit('message', data);
            } else {
                // This is a global message
                data.room = 'Global';
                socket.broadcast.emit('message', data);
            }
        });
        
        socket.on('disconnect', function() {
            logger(socket.id + ' disconnected');
        });
    });
    
    logger('listening');
    if (port === PORT) {
        setTimeout(function () {
            logger('closing');
            server.close();
            sockets.forEach(function(socket){
                socket.disconnect(true);
            });
        }, 10000);
    }
};

if (require.main === module) {
    for (i = 0; i < NUM_SERVERS; i += 1) {
        startServer(PORT + i);
    }
}
