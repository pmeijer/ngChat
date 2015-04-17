/*globals require, console, module, __dirname*/
/**
 * Created by pmeijer on 12/30/2014.
 */

var PORT = 8080,
    NUM_SERVERS = 5,
    i;

var startServer = function (port) {
    'use strict';
    var express = require('express'),
        socketIO = require('socket.io'),
        io,
        adapter,
        server,
        app = express();

    app.use('/', express.static(__dirname + '/public/'));
    server = app.listen(port);
    io = socketIO.listen(server);
    adapter = require('socket.io-redis')({host:'127.0.0.1', port:6379});
    io.adapter(adapter);
    var sockets = [];

    io.sockets.on('connection', function (socket) {
        console.log(port + ' New client connected!');
        sockets.push(socket);
        socket.emit('message', {
            message: 'Welcome to the chat',
            room: 'Global',
            timeStamp: (new Date()).toISOString()});

        socket.on('subscribe', function(room) {
            console.log('====== JOIN =======');
            console.log('Nbr of rooms: ' + Object.keys(io.nsps['/'].adapter.rooms).length);
            console.log('joining room', socket.id);
            socket.join(room);
            console.log(room + ' has nbr of users: ' + Object.keys(io.nsps['/'].adapter.rooms[room]).length);
            console.log('Nbr of rooms: ' + Object.keys(io.nsps['/'].adapter.rooms).length);
            console.log('====== JOIN =======\n');
            //}
        });

        socket.on('unsubscribe', function(room) {
            console.log('====== LEAVE =======');
            console.log('Nbr of rooms: ' + Object.keys(io.nsps['/'].adapter.rooms).length);
            console.log('leaving room: ', socket.id);
            socket.leave(room);
            if (io.nsps['/'].adapter.rooms[room]) {
                console.log(room + ' has nbr of users: ' + Object.keys(io.nsps['/'].adapter.rooms[room]).length);
            }
            console.log('Nbr of rooms: ' + Object.keys(io.nsps['/'].adapter.rooms).length);
            console.log('====== LEAVE =======\n');
        });

        socket.on('send', function(data) {
            console.log(port, data.user, data.message, data.room);
            if (data.room) {
                socket.broadcast.to(data.room).emit('message', data);
            } else {
                // This is a global message
                data.room = 'Global';
                socket.broadcast.emit('message', data);
            }
        });
        
        socket.on('disconnect', function() { 
            console.log(port + ' ' + socket.id + ' disconnected');
        });
    });
    
    console.log('listening on port: ', port);
    if (port === PORT) {
        setTimeout(function () {
            console.log('closing', PORT);
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
