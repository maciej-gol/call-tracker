'use strict'
angular.module('magApp').controller('graphCtrl',
                                    ['$scope', '$http', '$state', 'Collection', 'Process',
                                    function($scope, $http, $state, Collection, Process) {

    $scope.graphId = $state.params.graph_id;
    $scope.processes = new Collection('/api/graphs/' + $scope.graphId + '/processes/');
    $scope.processesQuery = null;

    $scope.processesGraphAccessor = {
        processClicked: function(processName) {
            var processId = $scope.processes.byLabel[processName].id;
            Process.prototype.get(processId, $scope.graphId).success($scope.selectProcess);
        },
    };
    $scope.selectedProcess = null;
    $scope.selectProcess = function(process) {
        $scope.selectedProcess = process;
        $scope.processesGraphAccessor.selectProcess($scope.selectedProcess.label);
    };
    $scope.processes.fetch();

    $scope.searchProcesses = _.debounce(function(query) {
        $scope.processes.filter({'q': query})
        $scope.processes.fetch();
    }, 300);
}]);
