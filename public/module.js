/*globals angular, io, alert */
/**
 * Created by pmeijer on 12/31/2014.
 */

angular.module('ngChat', ['ngMaterial'])
    .controller('GlobalChatController', function ($rootScope, $scope, $timeout, $window) {
        'use strict';
        var socket;

        $scope.model = {
            userName: 'user' + Math.floor(Math.random()*1000).toString(),
            messages: [],
            namespaces: [
                {id: '/Europe', name:'Europe'},
                {id: '/Americas', name:'Americas'},
                {id: '/Asia', name:'Asia'},
                {id: '/Africa', name: 'Africa'}
            ],
            namespace: '/Europe',
            selectedNamespace: '/Europe',
            room: 'master',
            inRoom: false,
            toRoom: false,
            disconnected: false,
            currentMsg: ''
        };

        function registerOnEvents(_socket) {
            socket = _socket;
            socket.on('message', function (data) {
                console.log('got message from', socket.nsp, data.message);
                if (data.message) {
                    data.user = data.user || 'SERVER-' + data.nsp;
                    $scope.model.messages.push(data);
                    // Angular is unaware of data updates outside the "angular world,
                    // the timeout will force a new digest cycle.
                    if ($scope.model.disconnected === true) {
                        $scope.model.disconnected = false;
                        if ($scope.model.inRoom) {
                            socket.emit('subscribe', $scope.model.room);
                            console.log('Joined room :', $scope.model.room, socket.nsp);
                        }
                    }
                    $timeout(function () {
                    });
                } else {
                    console.error('There is a problem: ', data);
                }
            });

            socket.on('disconnect', function () {
                console.log('disconnected from nsp', socket.nsp);
                console.log('should be in nsp', $scope.model.namespace);
                if ($scope.model.namespace === socket.nsp) {
                    $scope.model.disconnected = true;
                    console.log('user is disconnected, waiting for magic', socket.nsp);
                } else {
                    console.log('will explicitly connect to', $scope.model.namespace);
                    registerOnEvents(io.connect($rootScope.rootUrl + $scope.model.namespace, {forceNew: true}));
                }
            });

            socket.on('connect', function () {
                console.log('connect event raised', socket.nsp);
            });
        }

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
                console.log('Joined room :',  $scope.model.room, socket.nsp);
                $scope.model.toRoom = true;
            } else {
                socket.emit('unsubscribe', $scope.model.room);
                console.log('Left room :',  $scope.model.room, socket.nsp);
                $scope.model.toRoom = false;
            }
        };
        $scope.clearMessages = function () {
            $scope.model.messages = [];
        };

        $scope.switchNsp = function () {
            $scope.model.namespace = $scope.model.selectedNamespace;
            $scope.model.inRoom = false;
            $scope.model.toRoom = false;
            $scope.model.room = 'master';
            socket.disconnect();
        };

        registerOnEvents(io.connect($rootScope.rootUrl + $scope.model.namespace));
    })
    .run(function($rootScope, $window) {
        'use strict';
        $rootScope.rootUrl = $window.location.host;
        //$rootScope.socket = io.connect($rootScope.rootUrl + '/Europe');//, {
        //    reconnection: true,
        //    reconnectionDelay: 200,
        //    reconnectionDelayMax: 500
        //});
    });