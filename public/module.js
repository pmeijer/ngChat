/*globals angular, io, alert */
/**
 * Created by pmeijer on 12/31/2014.
 */

angular.module('ngChat', ['ngMaterial'])
    .controller('GlobalChatController', function ($rootScope, $scope, $timeout, $window) {
        'use strict';
        var socket = $rootScope.socket;

        $scope.model = {
            userName: 'user' + Math.floor(Math.random()*1000).toString(),
            messages: [],
            namespaces: ['', 'Europe', 'Americas', 'Asia', 'Africa'],
            namespace: '',
            room: null,
            inRoom: false,
            toRoom: false,
            currentMsg: ''
        };

        socket.on('message', function (data) {
            console.log('got message!');
            if ( data.message ) {
                data.user = data.user || 'SERVER';
                $scope.model.messages.push(data);
                // Angular is unaware of data updates outside the "angular world,
                // the timeout will force a new digest cycle.
                $timeout(function () {});
            } else {
                console.error('There is a problem: ', data);
            }
        });

        $scope.sendMessage = function () {
            var data;
            if ( !$scope.model.userName || $scope.model.userName === 'SERVER') {
                alert('Enter a valid user name!');
            }
            if ( $scope.model.currentMsg ) {
                data = {
                    message: $scope.model.currentMsg,
                    timeStamp: (new Date()).toISOString(),
                    user: $scope.model.userName,
                    room: null
                };
                if ($scope.model.toRoom && $scope.model.inRoom && $scope.model.room) {
                    data.room = $scope.model.room;
                }
                socket.emit('send', data);
                $scope.model.currentMsg = '';
                data.fromMe = true;
                if ( !data.room ) {
                    data.room = 'Global';
                }
                $scope.model.messages.push(data);
            }
        };

        $scope.joinLeaveRoom = function () {
            // Don't join an empty named room or reserved '/'
            if ( !$scope.model.room || $scope.model.room === '/' || $scope.model.room === 'Global') {
                $scope.model.room = '';
                $scope.model.inRoom = false;
                $scope.model.toRoom = false;
                console.warn('Illegal room name "' +  $scope.model.room + '"');
                return;
            }

            if ($scope.model.inRoom) {
                socket.emit('subscribe', $scope.model.room);
                console.log('Joined room :',  $scope.model.room);
            } else {
                socket.emit('unsubscribe', $scope.model.room);
                console.log('Left room :',  $scope.model.room);
                $scope.model.toRoom = false;
            }
        };
        $scope.clearMessages = function () {
            $scope.model.messages = [];
        };

        socket.on('disconnect', function () {
            console.log('disconnected');
        });
    })
    .run(function($rootScope, $window) {
        'use strict';
        var rootUrl = $window.location.host;
        $rootScope.socket = io.connect(rootUrl + '/');//, {
        //    reconnection: true,
        //    reconnectionDelay: 200,
        //    reconnectionDelayMax: 500
        //});
    });