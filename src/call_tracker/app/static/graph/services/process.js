'use strict'
angular.module('magApp').factory('Process',
                                 ['$http',
                                  function($http) {
    var ctor = function() {};

    ctor.prototype.url = '/api/graphs/{graph_id}/processes/{id}/';
    ctor.prototype.get = function(id, graphId) {
        var url = ctor.prototype.url.replace('{id}', id).replace('{graph_id}', graphId);
        return $http.get(url);
    };

    return ctor;
}]);
