'use strict'
angular.module('magApp').controller('indexCtrl',
                                    ['$scope', '$http', '$timeout', '$state',
                                    function($scope, $http, $timeout, $state) {

    $scope.uploading = false;

    $scope.createGraph = function() {
        $scope.uploading =  true;
        $http({
            'method': 'POST',
            'url': '/api/graphs/',
        })
        .then(function(request) {
            return $scope.waitForGraphInitialization(request.data.id);
        });
    };

    $scope.waitForGraphInitialization = function(graphId) {
        return $http
        .get('/api/graphs/' + graphId + '/status/')
        .then(function(request) {
            if (request.data.state == 'initializing') {
                return $timeout(
                    function() { return $scope.waitForGraphInitialization(graphId); },
                    1000,
                );
            };
            if (request.data.state == 'error') {
                $scope.uploadError = true;
                return;
            }
            $state.go('graph', {'graph_id': graphId});
        });
    };
}]);
