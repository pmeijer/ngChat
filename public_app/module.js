/*globals angular, io, alert */
/**
 * Created by pmeijer on 12/31/2014.
 */

angular.module('ngChatSupervisor', ['ngMaterial'])
    .controller('SupervisorController', function ($rootScope, $scope, $interval, $http, $window) {
        'use strict';

        $scope.address = $window.location.origin;

        $scope.servers = {};


        $scope.addServer = function () {
            $scope.servers[$scope.address] = {
                address: $scope.address
            };
        };

        $scope.removeServer = function (address) {
            if ($scope.servers.hasOwnProperty(address)) {
                delete $scope.servers[address];
            }
        };


        $scope.startChatServer = function (address, port) {
            $http.post(address + '/api/servers/' + port + '/start').
                success(function (data, status, headers, config) {
                // this callback will be called asynchronously
                // when the response is available

                }).
                error(function (data, status, headers, config) {
                    // called asynchronously if an error occurs
                    // or server returns response with an error status.

                });
        };

        $scope.stopChatServer = function (address, port) {
            $http.post(address + '/api/servers/' + port + '/stop').
                success(function (data, status, headers, config) {
                    // this callback will be called asynchronously
                    // when the response is available

                }).
                error(function (data, status, headers, config) {
                    // called asynchronously if an error occurs
                    // or server returns response with an error status.

                });
        };

        $scope.deleteChatServer = function (address, port) {
            $http.delete(address + '/api/servers/' + port).
                success(function (data, status, headers, config) {
                    // this callback will be called asynchronously
                    // when the response is available

                }).
                error(function (data, status, headers, config) {
                    // called asynchronously if an error occurs
                    // or server returns response with an error status.

                });
        };

        $scope.createChatServer = function (address, port) {
            $http.post(address + '/api/servers/' + port).
                success(function (data, status, headers, config) {
                    // this callback will be called asynchronously
                    // when the response is available

                }).
                error(function (data, status, headers, config) {
                    // called asynchronously if an error occurs
                    // or server returns response with an error status.

                });
        };


        function updateServer(server) {
            console.log('updating', server);
            $http.get(server.address + '/api/servers').
                success(function (data, status, headers, config) {
                    var i;
                    // this callback will be called asynchronously
                    // when the response is available
                    server.data = data;
                    server.status = status;
                    server.newPort = server.newPort || 8086;
                }).
                error(function (data, status, headers, config) {
                    // called asynchronously if an error occurs
                    // or server returns response with an error status.
                    server.status = status;
                });
        }

        $interval(function () {
            var key,
                server;

            for (key in $scope.servers) {
                if ($scope.servers.hasOwnProperty(key)) {
                    server = $scope.servers[key];
                    updateServer(server);
                }
            }

        }, 2000);

    })
    .run(function($rootScope, $window) {
        'use strict';
    });