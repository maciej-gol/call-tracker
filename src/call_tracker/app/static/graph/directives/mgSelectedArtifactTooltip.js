'use strict'
angular.module('magApp').directive('mgSelectedArtifactTooltip',
                                   [function() {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: '/static/templates/graph/selected-artifact-tooltip.html',
        controller: function($scope) {
            $scope.$watch('selectedNode', function(nv) {
                if (!nv) return;
            });
        }
    };
}]);
