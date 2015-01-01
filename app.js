/*globals require, console, module*/
/**
 * Created by pmeijer on 12/30/2014.
 */

var PORT = 3700;

var startServer = function () {
    'use strict';
    var express = require('express'),
        socketIO = require('socket.io'),
        io,
        app = express();

    app.use(express.static('./public/'));
    io = socketIO.listen(app.listen(PORT));

    io.sockets.on('connection', function (socket) {
        console.log('New client connected!');
        socket.emit('message', {
            message: 'Welcome to the chat',
            room: 'Global',
            timeStamp: (new Date()).toISOString()});

        socket.on('subscribe', function(room) {
            console.log('joining room', room);
            socket.join(room);
        });

        socket.on('unsubscribe', function(room) {
            console.log('leaving room', room);
            socket.leave(room);
        });

        socket.on('send', function(data) {
            console.log(data.user, data.message, data.room);
            if (data.room) {
                socket.broadcast.to(data.room).emit('message', data);
            } else {
                // This is a global message
                data.room = 'Global';
                socket.broadcast.emit('message', data);
            }
        });
    });

    console.log('listening on port: ', PORT);
};

if (require.main === module) {
    startServer();
}