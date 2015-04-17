/**
 * @author lattmann / https://github.com/lattmann
 */

var ChatServer = require('./chat-server'),
    chatServer,
    chatServers = {},

    PORT = process.env.PORT || 8080,

    i;


for (i = 0; i < 5; i += 1) {
    chatServer = new ChatServer(PORT + i);
    chatServer.start();
    chatServer.stop();
}