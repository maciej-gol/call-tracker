'use strict'
angular.module('magApp').directive('mgSelectedProcessTooltip',
                                   [function() {
    return {
        restrict: 'E',
        replace: true,
        scope: {
          'process': '=',
          'graphId': '=',
        },
        templateUrl: '/static/templates/graph/selected-process-tooltip.html',
    };
}]);
