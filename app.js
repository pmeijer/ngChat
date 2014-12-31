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
        socket.emit('message', { message: 'welcome to the chat', timeStamp: (new Date()).toISOString()});
        socket.on('send', function (data) {
            console.log('MUHAHA I read all the messages: \n', data);
            io.sockets.emit('message', data);
        });
    });

    console.log('listening on port: ', PORT);
};

if (require.main === module) {
    startServer();
}